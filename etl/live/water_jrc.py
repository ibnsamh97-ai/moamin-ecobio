"""تغيّر الماء السطحي في صلاح الدين 1984–2021 من طبقة التحوّلات في JRC Global Surface Water v1.4.

المصدر: Pekel, J.-F., Cottam, A., Gorelick, N., Belward, A.S. (2016). High-resolution mapping of global
surface water and its long-term changes. Nature 540, 418–422. «Source: EC JRC/Google».
الطبقة تقارن نوع الماء في السنة الأولى (1984) بالأخيرة (2021) لكل بكسل 30 م (0.00025°).

الحدود الإدارية: geoBoundaries gbOpen IRQ ADM1 (CC BY 4.0).
"""
from __future__ import annotations

import json
import math
import urllib.request

import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.windows import from_bounds

from common import UA, http_json, utcnow

TIF = "https://storage.googleapis.com/global-surface-water/downloads2021/transitions/transitions_40E_40Nv1_4_2021.tif"
GB_API = "https://www.geoboundaries.org/api/current/gbOpen/IRQ/ADM1/"
CLASSES = {1: "permanent", 2: "new_permanent", 3: "lost_permanent", 4: "seasonal", 5: "new_seasonal",
           6: "lost_seasonal", 7: "seasonal_to_permanent", 8: "permanent_to_seasonal", 9: "ephemeral_permanent",
           10: "ephemeral_seasonal"}
# بحيرة الثرثار: مستطيل يحيط بالبحيرة كلها (تقع بين صلاح الدين والأنبار)
THARTHAR = (42.90, 33.60, 43.62, 34.36)  # غرب، جنوب، شرق، شمال
# بحيرة سد العظيم (السد عند 34.565° ش، 44.516° ق، اكتمل 2000): مستطيل شمال السد
ADHAIM = (44.40, 34.55, 44.75, 34.88)
R = 6371.0088


def get_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def province():
    meta = http_json(GB_API)
    gj = get_json(meta["simplifiedGeometryGeoJSON"])
    names = [f["properties"].get("shapeName") for f in gj["features"]]
    print(f"water: ADM1 names: {names}")
    for f in gj["features"]:
        n = (f["properties"].get("shapeName") or "").lower().replace("-", " ")
        if "salah" in n or "saladin" in n or "salahuddin" in n.replace(" ", ""):
            return f["properties"]["shapeName"], f["geometry"], meta
    raise RuntimeError("Salah al-Din not found in geoBoundaries ADM1")


def bounds_of(geom):
    xs, ys = [], []

    def walk(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0]); ys.append(c[1])
        else:
            for k in c:
                walk(k)
    walk(geom["coordinates"])
    return min(xs), min(ys), max(xs), max(ys)


def stats(src, bounds, geom=None):
    w, s, e, n = bounds
    win = from_bounds(w, s, e, n, transform=src.transform).round_offsets().round_lengths()
    a = src.read(1, window=win)
    tr = src.window_transform(win)
    inside = ~geometry_mask([geom], out_shape=a.shape, transform=tr) if geom else np.ones(a.shape, bool)
    # مساحة البكسل تتغير مع خط العرض
    rows = np.arange(a.shape[0])
    lat = tr.f + tr.e * (rows + 0.5)
    px = (R * math.radians(abs(tr.e))) * (R * math.radians(tr.a) * np.cos(np.radians(lat)))  # كم² لكل بكسل في الصف
    out = {}
    vals = np.unique(a[inside])
    print(f"water: values in window: {sorted(int(v) for v in vals)}")
    for code, key in CLASSES.items():
        m = (a == code) & inside
        out[key] = round(float((m.sum(axis=1) * px).sum()), 3)
    out["area_km2"] = round(float((inside.sum(axis=1) * px).sum()), 1)
    return out


def summary(c):
    first = sum(c[k] for k in ("permanent", "lost_permanent", "seasonal", "lost_seasonal", "seasonal_to_permanent", "permanent_to_seasonal"))
    last = sum(c[k] for k in ("permanent", "new_permanent", "seasonal", "new_seasonal", "seasonal_to_permanent", "permanent_to_seasonal"))
    return {"water_1984_km2": round(first, 2), "water_2021_km2": round(last, 2),
            "lost_km2": round(c["lost_permanent"] + c["lost_seasonal"], 2),
            "new_km2": round(c["new_permanent"] + c["new_seasonal"], 2),
            "perm_to_seasonal_km2": round(c["permanent_to_seasonal"], 2)}


def run():
    name, geom, meta = province()
    print(f"water: province = {name}")
    with rasterio.Env(GDAL_HTTP_USERAGENT=UA, GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
        with rasterio.open("/vsicurl/" + TIF) as src:
            print(f"water: tif {src.width}x{src.height} res={src.res} crs={src.crs} tiled={src.profile.get('tiled')}")
            prov = stats(src, bounds_of(geom), geom)
            thar = stats(src, THARTHAR)
            adh = stats(src, ADHAIM)
    regions = [
        {"id": "province", "name": "محافظة صلاح الدين", "classes": prov, **summary(prov)},
        {"id": "tharthar", "name": "بحيرة الثرثار (المستطيل المحيط بها)", "bbox": THARTHAR, "classes": thar, **summary(thar)},
        {"id": "adhaim", "name": "بحيرة سد العظيم (المستطيل شمال السد)", "bbox": ADHAIM, "classes": adh, **summary(adh)},
    ]
    for r in regions:
        print(f"water: {r['id']}: 1984={r['water_1984_km2']} 2021={r['water_2021_km2']} lost={r['lost_km2']} new={r['new_km2']}")
    # الحدود مبسطة للعرض على الخريطة (دقة 0.005° تكفي)
    def simp(c):
        if isinstance(c[0], (int, float)):
            return [round(c[0], 4), round(c[1], 4)]
        return [simp(k) for k in c]
    return {
        "v": 2,
        "source": "EC JRC / Google — Global Surface Water v1.4 (1984–2021), transitions layer, 30 m",
        "citation": "Pekel, J.-F., Cottam, A., Gorelick, N., Belward, A.S. (2016). High-resolution mapping of global surface water and its long-term changes. Nature 540, 418–422.",
        "tif": TIF, "boundary": {"name": name, "source": "geoBoundaries gbOpen IRQ ADM1 (CC BY 4.0)", "build": meta.get("buildDate"),
                                  "geometry": {"type": geom["type"], "coordinates": simp(geom["coordinates"])}},
        "generated": utcnow(), "regions": regions}
