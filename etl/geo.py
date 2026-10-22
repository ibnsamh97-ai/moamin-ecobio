"""الجغرافيا: مجرى دجلة من OpenStreetMap، أقرب نقطة نهر لكل قضاء، خلية GloFAS، ومصادر التلوث."""
from __future__ import annotations

import json
import math
import re
import urllib.parse

from common import ROOT, http_json

BBOX = (33.85, 43.05, 35.75, 44.45)  # جنوب، غرب، شمال، شرق — ممر دجلة في صلاح الدين
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.private.coffee/api/interpreter"]


def km(lat1, lon1, lat2, lon2):
    """مسافة هافرساين بالكيلومتر."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def overpass(query: str):
    body = urllib.parse.urlencode({"data": query}).encode()
    last = None
    for url in OVERPASS:
        try:
            return http_json(url, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"}, tries=2, timeout=200)
        except Exception as e:  # جرّب الخادم التالي
            last = e
    raise last


def tigris_lines():
    """خطوط مجرى دجلة داخل الممر من OSM؛ وإن تعذّر نرجع لخط Natural Earth المحفوظ في المنصة."""
    s, w, n, e = BBOX
    q = f"""[out:json][timeout:180];
    (way["waterway"="river"]["name:en"~"Tigris",i]({s},{w},{n},{e});
     way["waterway"="river"]["name"~"دجلة"]({s},{w},{n},{e}););
    out geom;"""
    try:
        res = overpass(q)
        lines = [[(p["lat"], p["lon"]) for p in el["geometry"]] for el in res.get("elements", []) if el.get("geometry")]
        if lines:
            return lines, "OpenStreetMap (waterway=river, Tigris)"
    except Exception:
        pass
    txt = (ROOT / "js" / "data-twin.js").read_text(encoding="utf-8")
    pts = [(float(b), float(a)) for a, b in re.findall(r"\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]", txt)][:300]
    pts = [p for p in pts if BBOX[0] <= p[0] <= BBOX[2] and BBOX[1] <= p[1] <= BBOX[3]]
    return [pts], "Natural Earth 1:10m (احتياطي)"


def nearest_on_lines(lat, lon, lines):
    """أقرب نقطة على مجموعة خطوط (إسقاط على كل قطعة)."""
    best = (1e9, None, None)
    kx = math.cos(math.radians(lat))
    for ln in lines:
        for (a_lat, a_lon), (b_lat, b_lon) in zip(ln, ln[1:]):
            ax, ay, bx, by = a_lon * kx, a_lat, b_lon * kx, b_lat
            px, py = lon * kx, lat
            dx, dy = bx - ax, by - ay
            L = dx * dx + dy * dy
            t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
            qx, qy = ax + t * dx, ay + t * dy
            q_lat, q_lon = qy, qx / kx
            d = km(lat, lon, q_lat, q_lon)
            if d < best[0]:
                best = (d, q_lat, q_lon)
    return best


def glofas_cell(lat, lon, start: str, end: str):
    """يختار من 9 خلايا حول نقطة النهر الخلية ذات أعلى متوسط تصريف (المجرى الرئيسي)."""
    offs = [-0.05, 0, 0.05]
    cand = [(round(lat + a, 3), round(lon + b, 3)) for a in offs for b in offs]
    res = http_json("https://flood-api.open-meteo.com/v1/flood", {
        "latitude": ",".join(str(c[0]) for c in cand), "longitude": ",".join(str(c[1]) for c in cand),
        "daily": "river_discharge", "start_date": start, "end_date": end})
    res = res if isinstance(res, list) else [res]
    best = None
    for c, r in zip(cand, res):
        v = [x for x in r.get("daily", {}).get("river_discharge", []) if x is not None]
        if not v:
            continue
        m = sum(v) / len(v)
        if best is None or m > best[0]:
            best = (m, c[0], c[1])
    return best  # (mean, lat, lon)


KINDS = [
    ("refinery", lambda t: t.get("industrial") == "refinery" or t.get("industrial") == "oil" and "refin" in (t.get("name:en", "") + t.get("name", "")).lower()),
    ("oil_facility", lambda t: t.get("industrial") == "oil"),
    ("power_plant", lambda t: t.get("power") == "plant"),
    ("wastewater", lambda t: t.get("man_made") == "wastewater_plant"),
    ("landfill", lambda t: t.get("landuse") == "landfill"),
    ("oil_well", lambda t: t.get("man_made") == "petroleum_well"),
    ("oil_storage", lambda t: t.get("man_made") == "storage_tank"),
    ("quarry", lambda t: t.get("landuse") == "quarry"),
    ("works", lambda t: t.get("man_made") == "works"),
    ("industrial", lambda t: t.get("landuse") == "industrial"),
]


def pollution_sources():
    s, w, n, e = BBOX
    b = f"({s},{w},{n},{e})"
    q = f"""[out:json][timeout:240];
    (nwr["industrial"="refinery"]{b}; nwr["industrial"="oil"]{b}; nwr["power"="plant"]{b};
     nwr["man_made"="wastewater_plant"]{b}; nwr["landuse"="landfill"]{b}; nwr["landuse"="industrial"]{b};
     nwr["landuse"="quarry"]{b}; nwr["man_made"="works"]{b}; nwr["man_made"="petroleum_well"]{b};
     nwr["man_made"="storage_tank"]["content"~"oil|fuel|petrol|gas"]{b};);
    out center tags;"""
    res = overpass(q)
    out = []
    for el in res.get("elements", []):
        t = el.get("tags", {})
        lat = el.get("lat", el.get("center", {}).get("lat"))
        lon = el.get("lon", el.get("center", {}).get("lon"))
        if lat is None:
            continue
        kind = next((k for k, f in KINDS if f(t)), None)
        if not kind:
            continue
        out.append({"id": f"{el['type']}/{el['id']}", "kind": kind, "name": t.get("name:ar") or t.get("name") or t.get("name:en"),
                    "lat": lat, "lon": lon, "tags_json": json.dumps(t, ensure_ascii=False)})
    return out
