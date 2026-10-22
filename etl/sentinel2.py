"""جودة مياه دجلة من Sentinel-2 L2A: أصفى مشهد في كل شهر، بكسلات الماء فقط (SCL = 6) حول نقطة النهر.

NDTI = (B04 − B03) / (B04 + B03)   مؤشر العكورة (Lacaux et al., 2007)
NDCI = (B05 − B04) / (B05 + B04)   مؤشر الكلوروفيل (Mishra & Mishra, 2012)
تُصحَّح انعكاسية المشاهد ذات خط المعالجة 04.00 فأحدث (منذ 25-01-2022) بطرح الإزاحة 1000.
"""
from __future__ import annotations

import datetime as dt

import numpy as np

HALF_M = 1500  # نصف ضلع النافذة حول نقطة النهر (3 × 3 كم)
STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"


def _client():
    import planetary_computer
    import pystac_client
    return pystac_client.Client.open(STAC, modifier=planetary_computer.sign_inplace)


def month_range(m: str):
    y, mo = map(int, m.split("-"))
    start = dt.date(y, mo, 1)
    end = (dt.date(y + (mo == 12), mo % 12 + 1, 1) - dt.timedelta(days=1))
    return start, end


def _read(href, bounds, shape):
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.windows import from_bounds
    with rasterio.open(href) as ds:
        w = from_bounds(*bounds, transform=ds.transform)
        return ds.read(1, window=w, out_shape=shape, resampling=Resampling.average if shape else Resampling.nearest, boundless=True, fill_value=0)


def scene_stats(item, lat: float, lon: float):
    import rasterio
    from rasterio.warp import transform as wtransform
    from rasterio.windows import from_bounds
    epsg = item.properties.get("proj:epsg") or item.properties.get("proj:code", "EPSG:32638").split(":")[-1]
    xs, ys = wtransform("EPSG:4326", f"EPSG:{epsg}", [lon], [lat])
    x, y = xs[0], ys[0]
    # نافذة محاذاة لشبكة 20 م
    x0, y0 = np.floor((x - HALF_M) / 20) * 20, np.floor((y - HALF_M) / 20) * 20
    bounds = (x0, y0, x0 + 2 * HALF_M, y0 + 2 * HALF_M)
    shape = (int(2 * HALF_M / 20), int(2 * HALF_M / 20))
    a = item.assets
    with rasterio.open(a["SCL"].href) as ds:
        scl = ds.read(1, window=from_bounds(*bounds, transform=ds.transform), out_shape=shape, boundless=True, fill_value=0)
    water = scl == 6
    cloud = np.isin(scl, [3, 8, 9, 10])
    valid = scl > 0
    if valid.sum() < 0.5 * scl.size:
        return None
    cloud_pct = float(cloud.sum()) / float(valid.sum()) * 100
    if water.sum() < 25 or cloud_pct > 30:
        return {"cloud_pct": cloud_pct, "n_pixels": int(water.sum()), "ok": False}
    b3 = _read(a["B03"].href, bounds, shape).astype("float32")
    b4 = _read(a["B04"].href, bounds, shape).astype("float32")
    b5 = _read(a["B05"].href, bounds, shape).astype("float32")
    off = 1000.0 if str(item.properties.get("s2:processing_baseline", "00.00")) >= "04.00" else 0.0
    b3, b4, b5 = (b3 - off) / 1e4, (b4 - off) / 1e4, (b5 - off) / 1e4
    m = water & (b3 > 0) & (b4 > 0) & (b5 > 0)
    if m.sum() < 25:
        return {"cloud_pct": cloud_pct, "n_pixels": int(m.sum()), "ok": False}
    ndti = (b4 - b3) / (b4 + b3)
    ndci = (b5 - b4) / (b5 + b4)
    return {"ok": True, "cloud_pct": round(cloud_pct, 1), "n_pixels": int(m.sum()),
            "ndti": round(float(np.median(ndti[m])), 4), "ndci": round(float(np.median(ndci[m])), 4),
            "ndti_p90": round(float(np.percentile(ndti[m], 90)), 4), "ndci_p90": round(float(np.percentile(ndci[m], 90)), 4)}


def month_for_district(client, d: dict, month: str):
    s, e = month_range(month)
    search = client.search(collections=["sentinel-2-l2a"], intersects={"type": "Point", "coordinates": [d["river_lon"], d["river_lat"]]},
                           datetime=f"{s.isoformat()}/{e.isoformat()}", query={"eo:cloud_cover": {"lt": 40}}, max_items=20)
    items = sorted(search.items(), key=lambda it: it.properties.get("eo:cloud_cover", 100))
    for it in items[:4]:
        try:
            st = scene_stats(it, d["river_lat"], d["river_lon"])
        except Exception:
            continue
        if st and st.get("ok"):
            return {"district_id": d["id"], "month": month, "ndti": st["ndti"], "ndci": st["ndci"], "ndti_p90": st["ndti_p90"],
                    "ndci_p90": st["ndci_p90"], "n_pixels": st["n_pixels"], "scene_id": it.id,
                    "scene_date": (it.properties.get("datetime") or "")[:10], "cloud_pct": st["cloud_pct"]}
    # لا يوجد مشهد صافٍ صالح هذا الشهر: نسجّل الشهر فارغاً حتى لا يُعاد فحصه كل يوم
    return {"district_id": d["id"], "month": month, "ndti": None, "ndci": None, "ndti_p90": None, "ndci_p90": None,
            "n_pixels": 0, "scene_id": None, "scene_date": None, "cloud_pct": None}


def months_between(a: str, b: str):
    y, m = map(int, a.split("-"))
    Y, M = map(int, b.split("-"))
    out = []
    while (y, m) <= (Y, M):
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return out


def run(districts, done: set, first="2017-01", limit=500, workers=8):
    """يعالج الأشهر غير الموجودة + الشهرين الأخيرين دائماً. يعيد الصفوف وعدد المهام."""
    from concurrent.futures import ThreadPoolExecutor
    today = dt.date.today()
    last = f"{today.year:04d}-{today.month:02d}"
    prev = months_between(first, last)
    recent = set(prev[-2:])
    tasks = [(d, m) for d in districts for m in prev if (d["id"], m) not in done or m in recent]
    tasks.sort(key=lambda t: t[1], reverse=True)  # الأحدث أولاً
    tasks = tasks[:limit]
    client = _client()
    rows = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for r in ex.map(lambda t: _safe(client, *t), tasks):
            if r:
                rows.append(r)
    return rows, len(tasks)


def _safe(client, d, m):
    try:
        return month_for_district(client, d, m)
    except Exception:
        return None
