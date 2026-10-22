"""رصد الأقمار الصناعية الحقيقي فوق أقضية صلاح الدين (Microsoft Planetary Computer):

1) الحرائق وحرق الغاز: MODIS MOD14A1/MYD14A1 (بكسل 1 كم، يومي). البكسل الذي يحترق في أيام كثيرة
   على مدى سنة يُصنَّف مصدراً حرارياً دائماً (شعلة غاز أو منشأة)، والباقي حرائق متفرقة (نفايات أو زراعة).
2) الغطاء النباتي: MODIS MOD13Q1 NDVI (250 م، كل 16 يوماً) منذ 2001، لكل قضاء ضمن 10 كم من مركزه.
3) حرارة سطح ماء دجلة: Landsat 8/9 Collection 2 Level-2 (ST_B10، 30 م) عند نقطة النهر لكل قضاء
   وقبل وبعد محطات الكهرباء القريبة من النهر (كشف التلوث الحراري).
4) غازات التلوث من الفضاء: Sentinel-5P TROPOMI (NO₂ وSO₂ وCO) لكل قضاء ضمن 15 كم من مركزه، يومياً.

كل خطوة لها ميزانية زمنية، وتكمل الأرشيف القديم تدريجياً في كل تشغيل يومي (الأحدث أولاً).
"""
from __future__ import annotations

import datetime as dt
import math
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np

STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"
BBOX = [42.9, 33.7, 44.7, 35.8]          # صلاح الدين مع هامش
BBOX_GEOM = {"type": "Polygon", "coordinates": [[[BBOX[0], BBOX[1]], [BBOX[2], BBOX[1]], [BBOX[2], BBOX[3]], [BBOX[0], BBOX[3]], [BBOX[0], BBOX[1]]]]}


def _client():
    import planetary_computer
    import pystac_client
    return pystac_client.Client.open(STAC, modifier=planetary_computer.sign_inplace)


def km(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    a = np.sin((lat2 - lat1) * p / 2) ** 2 + np.cos(lat1 * p) * np.cos(lat2 * p) * np.sin((lon2 - lon1) * p / 2) ** 2
    return 12742 * np.arcsin(np.sqrt(a))


def _done(con, coll):
    return {r[0] for r in con.execute("SELECT item_id FROM sat_items WHERE collection = ?", (coll,))}


def _mark(con, coll, ids, run_at):
    con.executemany("INSERT OR REPLACE INTO sat_items(collection, item_id, processed_at) VALUES (?,?,?)", [(coll, i, run_at) for i in ids])


def _window(ds, bbox=BBOX):
    from rasterio.warp import transform
    from rasterio.windows import from_bounds
    xs, ys = transform("EPSG:4326", ds.crs, [bbox[0], bbox[2], bbox[0], bbox[2]], [bbox[1], bbox[1], bbox[3], bbox[3]])
    w = from_bounds(min(xs), min(ys), max(xs), max(ys), transform=ds.transform).round_offsets().round_lengths()
    return w


def _pixel_lonlat(ds, w, rows, cols):
    from rasterio.warp import transform
    from rasterio.windows import transform as wtransform
    T = wtransform(w, ds.transform)
    xs = T.c + (cols + 0.5) * T.a
    ys = T.f + (rows + 0.5) * T.e
    lon, lat = transform(ds.crs, "EPSG:4326", list(xs), list(ys))
    return np.array(lat), np.array(lon)


# ---------------------------------------------------------------------------
# 1) الحرائق وحرق الغاز
# ---------------------------------------------------------------------------
def _fire_item(it):
    import rasterio
    start = dt.date.fromisoformat((it.properties.get("start_datetime") or it.properties["datetime"])[:10])
    sat = "Aqua" if it.id.startswith("MYD") else "Terra"
    out = []
    with rasterio.open(it.assets["FireMask"].href) as ds:
        w = _window(ds)
        fm = ds.read(window=w, boundless=True, fill_value=0)
        frp = None
        try:
            with rasterio.open(it.assets["MaxFRP"].href) as ds2:
                frp = ds2.read(window=w, boundless=True, fill_value=0).astype("float32") * 0.1
                if frp.shape != fm.shape:
                    frp = None
        except Exception:
            frp = None
        for b in range(fm.shape[0]):
            rr, cc = np.where(fm[b] >= 7)
            if not len(rr):
                continue
            lat, lon = _pixel_lonlat(ds, w, rr, cc)
            for i in range(len(rr)):
                if BBOX[1] <= lat[i] <= BBOX[3] and BBOX[0] <= lon[i] <= BBOX[2]:
                    out.append(((start + dt.timedelta(days=b)).isoformat(), sat, round(float(lat[i]), 4), round(float(lon[i]), 4),
                                round(float(frp[b, rr[i], cc[i]]), 1) if frp is not None else None, int(fm[b, rr[i], cc[i]])))
    return it.id, out


def fires(con, D, run_at, log, budget=600, first="2019-01-01"):
    t0 = time.time()
    cl = _client()
    done = _done(con, "modis-14A1-061")
    items = [it for it in cl.search(collections=["modis-14A1-061"], intersects=BBOX_GEOM, datetime=f"{first}/{dt.date.today().isoformat()}").items()
             if it.id not in done]
    # الأحدث أولاً، ولا نعلّم الحزمة الجارية (لم تكتمل أيامها الثمانية) كمنتهية
    items.sort(key=lambda it: it.properties.get("start_datetime") or it.properties["datetime"], reverse=True)
    rows, ids = [], []
    with ThreadPoolExecutor(6) as ex:
        futs = []
        for it in items:
            futs.append(ex.submit(_fire_item, it))
        for f in futs:
            if time.time() - t0 > budget:
                break
            try:
                iid, out = f.result(timeout=120)
            except Exception:
                continue
            rows += out
            end = it_end(iid, items)
            if end and end < dt.date.today() - dt.timedelta(days=3):
                ids.append(iid)
        for f in futs:
            f.cancel()
    src = con.execute("SELECT kind, name, lat, lon FROM pollution_sources WHERE kind IN ('refinery','oil_facility','oil_well','oil_storage','power_plant','industrial','landfill','works') AND lat IS NOT NULL").fetchall()
    S = np.array([[s[2], s[3]] for s in src]) if src else np.zeros((0, 2))
    recs = []
    for date, sat, lat, lon, frp, conf in rows:
        dd = [(float(km(lat, lon, d["lat"], d["lon"])), d["id"]) for d in D]
        dk, did = min(dd)
        near_kind = near_name = None; ds_ = None
        if len(S):
            k = km(lat, lon, S[:, 0], S[:, 1]); j = int(np.argmin(k))
            if k[j] <= 2:
                near_kind, near_name, ds_ = src[j][0], src[j][1], round(float(k[j]), 2)
        recs.append((date, sat, lat, lon, frp, conf, did if dk <= 40 else None, near_kind, near_name, ds_))
    con.executemany("""INSERT OR IGNORE INTO fire_pixels(date, sat, lat, lon, frp, conf, district_id, near_kind, near_name, dist_src_km)
                       VALUES (?,?,?,?,?,?,?,?,?,?)""", recs)
    _mark(con, "modis-14A1-061", ids, run_at)
    # المصادر الحرارية الدائمة: خلية ~1 كم تحترق في 20 يوماً مختلفاً على الأقل خلال آخر 365 يوماً
    con.execute("DELETE FROM fire_hotspots")
    con.execute("""INSERT INTO fire_hotspots(lat, lon, days_365, last_date, mean_frp, district_id, near_kind, near_name)
                   SELECT ROUND(lat * 100) / 100.0, ROUND(lon * 100) / 100.0, COUNT(DISTINCT date), MAX(date), ROUND(AVG(frp), 1),
                          MAX(district_id), MAX(near_kind), MAX(near_name)
                   FROM fire_pixels WHERE date > date('now', '-365 day')
                   GROUP BY ROUND(lat * 100), ROUND(lon * 100) HAVING COUNT(DISTINCT date) >= 20""")
    con.commit()
    return len(recs), len(ids), len(items)


def it_end(iid, items):
    for it in items:
        if it.id == iid:
            s = dt.date.fromisoformat((it.properties.get("start_datetime") or it.properties["datetime"])[:10])
            return s + dt.timedelta(days=7)
    return None


# ---------------------------------------------------------------------------
# 2) الغطاء النباتي NDVI
# ---------------------------------------------------------------------------
def _ndvi_item(it, D):
    import rasterio
    date = (it.properties.get("start_datetime") or it.properties["datetime"])[:10]
    with rasterio.open(it.assets["250m_16_days_NDVI"].href) as ds:
        w = _window(ds)
        v = ds.read(1, window=w, boundless=True, fill_value=-3000).astype("float32")
        rr, cc = np.mgrid[0:v.shape[0], 0:v.shape[1]]
        lat, lon = _pixel_lonlat(ds, w, rr.ravel(), cc.ravel())
    with rasterio.open(it.assets["250m_16_days_pixel_reliability"].href) as ds:
        rel = ds.read(1, window=w, boundless=True, fill_value=3)
    v = v.ravel() * 1e-4; rel = rel.ravel()
    good = (v > -0.2) & (rel <= 1)
    land = good & (v >= 0.0)   # يستبعد الماء (NDVI سالب)
    out = []
    for d in D:
        m = land & (km(lat, lon, d["lat"], d["lon"]) <= 10)
        if m.sum() >= 50:
            vv = v[m]
            out.append((d["id"], date, round(float(vv.mean()), 4), round(float((vv >= 0.3).mean() * 100), 1), int(m.sum())))
    return it.id, out


def ndvi(con, D, run_at, log, budget=600, first="2001-01-01"):
    t0 = time.time()
    cl = _client()
    done = _done(con, "modis-13Q1-061")
    items = [it for it in cl.search(collections=["modis-13Q1-061"], intersects={"type": "Point", "coordinates": [43.68, 34.61]},
                                    datetime=f"{first}/{dt.date.today().isoformat()}").items() if it.id.startswith("MOD13Q1") and it.id not in done]
    items.sort(key=lambda it: it.properties.get("start_datetime") or it.properties["datetime"], reverse=True)
    rows, ids = [], []
    with ThreadPoolExecutor(6) as ex:
        futs = [ex.submit(_ndvi_item, it, D) for it in items]
        for f in futs:
            if time.time() - t0 > budget:
                break
            try:
                iid, out = f.result(timeout=180)
            except Exception:
                continue
            rows += out; ids.append(iid)
        for f in futs:
            f.cancel()
    con.executemany("INSERT OR REPLACE INTO ndvi_16d(district_id, date, ndvi, pct_green, n_pix) VALUES (?,?,?,?,?)", rows)
    _mark(con, "modis-13Q1-061", ids, run_at)
    con.commit()
    return len(rows), len(ids), len(items)


# ---------------------------------------------------------------------------
# 3) حرارة سطح ماء دجلة من Landsat
# ---------------------------------------------------------------------------
def river_points(con, D, lines):
    """نقطة النهر لكل قضاء، ونقطتان قبل وبعد كل محطة كهرباء قريبة من النهر (≤ 2 كم)."""
    pts = []
    for d in D:
        if d.get("river_lat") is not None:
            pts.append((f"{d['id']}", d["id"], "district", f"دجلة عند {d['name_ar']}", d["river_lat"], d["river_lon"], None))
    if not lines:
        return pts
    L = [np.array(ln) for ln in lines]
    for sid, kind, name, lat, lon, did in con.execute("SELECT id, kind, name, lat, lon, district_id FROM pollution_sources WHERE kind = 'power_plant' AND dist_river_km <= 2 AND district_id IS NOT NULL"):
        best = None
        for li, ln in enumerate(L):
            k = km(lat, lon, ln[:, 0], ln[:, 1]); j = int(np.argmin(k))
            if best is None or k[j] < best[0]:
                best = (k[j], li, j)
        ln = L[best[1]]; j = best[2]
        span = min(30, len(ln) - 1); a, b = ln[max(0, j - span)], ln[min(len(ln) - 1, j + span)]
        down = 1 if b[0] < a[0] else -1

        def walk(dirn, dist):
            acc, i = 0.0, j
            while acc < dist:
                k2 = i + dirn * down
                if k2 < 0 or k2 >= len(ln):
                    break
                acc += float(km(ln[i][0], ln[i][1], ln[k2][0], ln[k2][1])); i = k2
            return ln[i]
        up, dn = walk(-1, 1.0), walk(1, 1.5)
        label = name or "محطة كهرباء"
        pts.append((f"pp{sid}_up", did, "pp_up", f"قبل {label} بـ 1 كم", float(up[0]), float(up[1]), sid))
        pts.append((f"pp{sid}_dn", did, "pp_down", f"بعد {label} بـ 1.5 كم", float(dn[0]), float(dn[1]), sid))
    return pts


def _lst_item(it, P):
    import rasterio
    from rasterio.warp import transform
    from rasterio.windows import Window
    a = it.assets
    sc = a["lwir11"].extra_fields.get("raster:bands", [{}])[0]
    scale, offset = sc.get("scale", 0.00341802), sc.get("offset", 149.0)
    out = []
    with rasterio.open(a["lwir11"].href) as ds, rasterio.open(a["qa_pixel"].href) as dq:
        for pid, lat, lon in P:
            xs, ys = transform("EPSG:4326", ds.crs, [lon], [lat])
            r, c = ds.index(xs[0], ys[0])
            R = 17  # ± 500 م
            if r - R < 0 or c - R < 0 or r + R >= ds.height or c + R >= ds.width:
                continue
            w = Window(c - R, r - R, 2 * R + 1, 2 * R + 1)
            st = ds.read(1, window=w).astype("float32")
            qa = dq.read(1, window=w)
            water = ((qa >> 7) & 1) == 1
            cloud = (((qa >> 1) & 1) == 1) | (((qa >> 2) & 1) == 1) | (((qa >> 3) & 1) == 1) | (((qa >> 4) & 1) == 1)
            m = water & ~cloud & (st > 0)
            if m.sum() >= 8:
                tc = st[m] * scale + offset - 273.15
                out.append((pid, round(float(np.median(tc)), 2), int(m.sum())))
    return it, out


def river_lst(con, D, lines, run_at, log, budget=600, first="2013-04-01"):
    t0 = time.time()
    pts = river_points(con, D, lines)
    con.executemany("INSERT OR REPLACE INTO river_points(id, district_id, kind, label, lat, lon, source_id) VALUES (?,?,?,?,?,?,?)", pts)
    P = [(p[0], p[4], p[5]) for p in pts]
    cl = _client()
    done = _done(con, "landsat-c2-l2")
    items = [it for it in cl.search(collections=["landsat-c2-l2"], intersects=BBOX_GEOM, datetime=f"{first}/{dt.date.today().isoformat()}",
                                    query={"eo:cloud_cover": {"lt": 30}, "platform": {"in": ["landsat-8", "landsat-9"]}}).items() if it.id not in done]
    items.sort(key=lambda it: it.properties["datetime"], reverse=True)
    rows, ids = [], []
    with ThreadPoolExecutor(6) as ex:
        futs = [ex.submit(_lst_item, it, P) for it in items]
        for f in futs:
            if time.time() - t0 > budget:
                break
            try:
                it, out = f.result(timeout=180)
            except Exception:
                continue
            ids.append(it.id)
            rows += [(pid, it.properties["datetime"][:10], it.id, v, n) for pid, v, n in out]
        for f in futs:
            f.cancel()
    con.executemany("INSERT OR REPLACE INTO river_lst(point_id, date, scene_id, lst_c, n_pix) VALUES (?,?,?,?,?)", rows)
    _mark(con, "landsat-c2-l2", ids, run_at)
    con.commit()
    return len(rows), len(ids), len(items)


# ---------------------------------------------------------------------------
# 4) غازات التلوث من Sentinel-5P
# ---------------------------------------------------------------------------
GAS = {"no2": ("nitrogendioxide_tropospheric_column", 0.75), "so2": ("sulfurdioxide_total_vertical_column", 0.5), "co": ("carbonmonoxide_total_column", 0.5)}


def _s5p_item(it, gas, D):
    import fsspec
    import h5py
    var, qmin = GAS[gas]
    href = list(it.assets.values())[0].href
    fs = fsspec.filesystem("https")
    with fs.open(href, block_size=4 * 2**20, cache_type="bytes") as f, h5py.File(f, "r") as h:
        g = h["PRODUCT"]
        lat = g["latitude"][0]; lon = g["longitude"][0]
        m = (lat > BBOX[1]) & (lat < BBOX[3]) & (lon > BBOX[0]) & (lon < BBOX[2])
        rows = np.where(m.any(axis=1))[0]
        if not len(rows):
            return it, gas, []
        r0, r1 = int(rows.min()), int(rows.max()) + 1
        v = g[var][0, r0:r1, :].astype("float64"); qa = g["qa_value"][0, r0:r1, :]
        if qa.dtype.kind in "iu":
            qa = qa * 0.01
        la, lo = lat[r0:r1], lon[r0:r1]
        ok = (qa >= qmin) & (v < 1e30) & np.isfinite(v)
    out = []
    for d in D:
        mm = ok & (km(la, lo, d["lat"], d["lon"]) <= 15)
        if mm.sum() >= 2:
            out.append((d["id"], round(float(np.mean(v[mm])) * 1e6, 3), int(mm.sum())))
    return it, gas, out


def s5p(con, D, run_at, log, budget=900, first="2019-01-01"):
    """µmol/m². يُفضَّل المنتج المعاد معالجته (OFFL/RPRO) على السريع (NRTI) للمدار نفسه."""
    t0 = time.time()
    cl = _client()
    done = _done(con, "sentinel-5p-l2-netcdf")
    day = dt.date.today() - dt.timedelta(days=1)
    first_d = dt.date.fromisoformat(first)
    rows, ids, n_items = [], [], 0
    with ThreadPoolExecutor(6) as ex:
        while day >= first_d and time.time() - t0 < budget:
            # نبحث أسبوعاً دفعة واحدة لتقليل طلبات البحث
            a = max(first_d, day - dt.timedelta(days=6))
            wk = f"week:{a.isoformat()}"
            if wk in done:
                day = a - dt.timedelta(days=1); continue
            futs = []
            for gas in GAS:
                its = list(cl.search(collections=["sentinel-5p-l2-netcdf"], intersects=BBOX_GEOM, datetime=f"{a.isoformat()}/{day.isoformat()}T23:59:59Z",
                                     query={"s5p:product_name": {"eq": gas}}).items())
                by = {}
                for it in its:
                    orbit = it.id.split("_")[-1]
                    mode = it.properties.get("s5p:processing_mode", "NRTI")
                    if orbit not in by or (by[orbit].properties.get("s5p:processing_mode") == "NRTI" and mode != "NRTI"):
                        by[orbit] = it
                for it in by.values():
                    if it.id in done:
                        continue
                    futs.append(ex.submit(_s5p_item, it, gas, D)); n_items += 1
            for f in futs:
                try:
                    it, gas, out = f.result(timeout=240)
                except Exception:
                    continue
                date = it.properties["datetime"][:10]
                rows += [(did, date, gas, v, n, it.properties.get("s5p:processing_mode")) for did, v, n in out]
                ids.append(it.id)
            # أسبوع اكتملت معالجته وانقضى عليه شهر (وصلت نسخ OFFL): لا نبحث فيه مجدداً
            if all(f.done() and not f.cancelled() for f in futs) and day < dt.date.today() - dt.timedelta(days=30):
                ids.append(wk)
            day = a - dt.timedelta(days=1)
    # متوسط يومي لكل قضاء وغاز (قد يمر مداران في اليوم)
    agg = {}
    for did, date, gas, v, n, mode in rows:
        k = (did, date, gas); s = agg.get(k, [0.0, 0])
        agg[k] = [s[0] + v * n, s[1] + n]
    con.executemany("INSERT OR REPLACE INTO s5p_daily(district_id, date, gas, value, n_pix) VALUES (?,?,?,?,?)",
                    [(k[0], k[1], k[2], round(s[0] / s[1], 3), s[1]) for k, s in agg.items()])
    _mark(con, "sentinel-5p-l2-netcdf", ids, run_at)
    con.commit()
    return len(agg), len(ids), n_items
