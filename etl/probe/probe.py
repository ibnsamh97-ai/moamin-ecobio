"""فحص مصادر الأقمار الصناعية على Planetary Computer قبل بناء خطوات القاعدة (يُشغَّل يدوياً عند الحاجة)."""
import json, time, traceback
import numpy as np
import planetary_computer, pystac_client

out = {}
cl = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1", modifier=planetary_computer.sign_inplace)
PT = {"type": "Point", "coordinates": [43.68, 34.61]}  # تكريت


def step(name, fn):
    t = time.time()
    try:
        out[name] = {"ok": True, "r": fn()}
    except Exception as e:
        out[name] = {"ok": False, "err": f"{type(e).__name__}: {e}", "tb": traceback.format_exc()[-1500:]}
    out[name]["sec"] = round(time.time() - t, 1)
    print(name, json.dumps(out[name], ensure_ascii=False, default=str)[:3000], flush=True)


def modis(coll):
    items = list(cl.search(collections=[coll], intersects=PT, datetime="2026-09-01/2026-10-22", max_items=5).items())
    it = items[0]
    import rasterio
    info = {"n": len(items), "id": it.id, "dt": it.properties.get("datetime") or it.properties.get("start_datetime"), "assets": list(it.assets.keys())}
    key = "FireMask" if "FireMask" in it.assets else "250m_16_days_NDVI" if "250m_16_days_NDVI" in it.assets else list(it.assets.keys())[0]
    with rasterio.open(it.assets[key].href) as ds:
        info.update({"key": key, "count": ds.count, "shape": ds.shape, "crs": str(ds.crs), "dtype": ds.dtypes[0], "desc": ds.descriptions[:8], "nodata": ds.nodata})
        from rasterio.warp import transform
        xs, ys = transform("EPSG:4326", ds.crs, [43.0, 44.6], [33.8, 35.7])
        from rasterio.windows import from_bounds
        w = from_bounds(min(xs), min(ys), max(xs), max(ys), transform=ds.transform)
        a = ds.read(window=w)
        info["win"] = list(a.shape); info["uniq"] = [int(x) for x in np.unique(a)[:20]]
    return info


def landsat():
    items = list(cl.search(collections=["landsat-c2-l2"], intersects=PT, datetime="2026-08-01/2026-10-22", query={"eo:cloud_cover": {"lt": 20}}, max_items=5).items())
    it = items[0]
    import rasterio
    info = {"n": len(items), "id": it.id, "dt": it.properties["datetime"], "assets": list(it.assets.keys()), "cloud": it.properties.get("eo:cloud_cover")}
    with rasterio.open(it.assets["lwir11"].href) as ds:
        info.update({"crs": str(ds.crs), "dtype": ds.dtypes[0], "scale": ds.scales, "offset": ds.offsets})
    info["st_scale_meta"] = it.assets["lwir11"].extra_fields.get("raster:bands")
    return info


def s5p():
    items = list(cl.search(collections=["sentinel-5p-l2-netcdf"], intersects=PT, datetime="2026-10-10/2026-10-21", query={"s5p:product_name": {"eq": "no2"}}, max_items=5).items())
    if not items:
        items = list(cl.search(collections=["sentinel-5p-l2-netcdf"], intersects=PT, datetime="2026-10-10/2026-10-21", max_items=20).items())
    it = items[0]
    info = {"n": len(items), "id": it.id, "props": {k: v for k, v in it.properties.items() if k.startswith("s5p") or k in ("datetime",)}, "assets": {k: v.href.split("?")[0][-90:] for k, v in it.assets.items()}}
    href = list(it.assets.values())[0].href
    import fsspec, h5py
    t = time.time()
    fs = fsspec.filesystem("https")
    info["size_mb"] = round(fs.info(href)["size"] / 1e6, 1)
    with fs.open(href, block_size=4 * 2**20, cache_type="bytes") as f, h5py.File(f, "r") as h:
        g = h["PRODUCT"]
        info["vars"] = list(g.keys())[:30]
        lat = g["latitude"][0]; lon = g["longitude"][0]
        m = (lat > 33.5) & (lat < 36) & (lon > 42.5) & (lon < 45)
        rows = np.where(m.any(axis=1))[0]
        info["rows"] = [int(rows.min()), int(rows.max())] if len(rows) else None
        if len(rows):
            r0, r1 = int(rows.min()), int(rows.max()) + 1
            v = g["nitrogendioxide_tropospheric_column"][0, r0:r1, :]
            qa = g["qa_value"][0, r0:r1, :]
            mm = m[r0:r1] & (qa >= 0.75) & (v < 1e30)
            info["n_good"] = int(mm.sum()); info["mean_mol_m2"] = float(v[mm].mean()) if mm.any() else None
    info["read_sec"] = round(time.time() - t, 1)
    return info


step("modis14", lambda: modis("modis-14A1-061"))
step("modis13", lambda: modis("modis-13Q1-061"))
step("landsat", landsat)
step("s5p", s5p)
json.dump(out, open("probe.json", "w"), ensure_ascii=False, indent=1, default=str)
