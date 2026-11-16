"""مصادر التلوث من الفضاء: ملخص صغير لصفحة «مصادر التلوث» من قاعدة الأقضية + Climate TRACE.

1) المصادر الحرارية الدائمة (شعلات الغاز والمنشآت): من جدولي fire_hotspots وfire_pixels في قاعدة
   الأقضية (MODIS MOD14A1/MYD14A1 عبر Planetary Computer، بكسل 1 كم)، مجمّعة في مواقع (≤ 4 كم).
2) المنشآت المرسومة في OpenStreetMap (pollution_sources).
3) تقديرات انبعاثات المنشآت من Climate TRACE (CC BY 4.0) — تقدير نماذج، يُعرض بوصفه تقديراً.
"""
from __future__ import annotations

import gzip
import json
import math
import sqlite3
import urllib.parse
from pathlib import Path

from common import ROOT, http_json, utcnow

KIND = {"refinery": "مصفى", "oil_facility": "منشأة نفطية", "oil_well": "بئر نفط", "oil_storage": "خزانات نفط", "power_plant": "محطة كهرباء",
        "industrial": "منطقة صناعية", "landfill": "مكب نفايات", "works": "معمل", "quarry": "مقلع", "wastewater": "معالجة مياه الصرف"}


def km(a1, o1, a2, o2):
    p1, p2 = math.radians(a1), math.radians(a2)
    dp, dl = p2 - p1, math.radians(o2 - o1)
    return 2 * 6371 * math.asin(math.sqrt(math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2))


def inside(lon, lat, geom):
    def ring(poly):
        c = False
        for i in range(len(poly)):
            x1, y1 = poly[i - 1]; x2, y2 = poly[i]
            if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
                c = not c
        return c
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return any(ring(p[0]) and not any(ring(h) for h in p[1:]) for p in polys)


def from_db(db_gz: Path, geom):
    raw = gzip.decompress(db_gz.read_bytes())
    tmp = Path("/tmp/ecobio-live.db"); tmp.write_bytes(raw)
    con = sqlite3.connect(tmp); con.row_factory = sqlite3.Row
    meta = dict(con.execute("SELECT key, value FROM meta").fetchall()) if con.execute("SELECT 1 FROM sqlite_master WHERE name='meta'").fetchone() else {}
    H = [dict(r) for r in con.execute("SELECT * FROM fire_hotspots ORDER BY days_365 DESC")]
    sites = []
    for h in H:  # تجميع الخلايا المتجاورة (≤ 4 كم) في موقع واحد
        s = next((s for s in sites if km(s["lat"], s["lon"], h["lat"], h["lon"]) <= 4), None)
        if s:
            s["cells"] += 1; s["days"] = max(s["days"], h["days_365"]); s["frp"].append(h["mean_frp"])
            s["last"] = max(s["last"], h["last_date"])
            if not s["name"] and h["near_name"]: s["name"] = h["near_name"]
            if not s["kind"] and h["near_kind"]: s["kind"] = h["near_kind"]
        else:
            sites.append({"lat": h["lat"], "lon": h["lon"], "cells": 1, "days": h["days_365"], "frp": [h["mean_frp"]], "last": h["last_date"],
                          "name": h["near_name"], "kind": h["near_kind"], "district": h["district_id"]})
    src_all = [dict(r) for r in con.execute("SELECT kind, name, lat, lon FROM pollution_sources WHERE lat IS NOT NULL")]
    PRI = ["refinery", "oil_facility", "power_plant", "oil_storage", "oil_well", "industrial", "works", "landfill"]
    for s in sites:
        f = [x for x in s["frp"] if x is not None]
        s["frp"] = round(sum(f) / len(f), 1) if f else None
        s["in_prov"] = inside(s["lon"], s["lat"], geom)
        # تسمية الموقع بأقرب منشأة مرسومة ضمن 3 كم، بأولوية النوع (المصفى قبل البئر قبل المنطقة الصناعية)
        near = [(PRI.index(x["kind"]) if x["kind"] in PRI else 99, km(s["lat"], s["lon"], x["lat"], x["lon"]), x) for x in src_all]
        near = sorted([n for n in near if n[1] <= 3 and n[0] < 99], key=lambda n: (n[0], n[1]))
        named = [n for n in near if n[2]["name"]]
        s["kind"] = near[0][2]["kind"] if near else None
        s["name"] = named[0][2]["name"] if named and named[0][0] <= (near[0][0] + 1) else None
        s["near_km"] = round(near[0][1], 1) if near else None
    last = con.execute("SELECT MAX(date) FROM fire_pixels").fetchone()[0]
    months = [dict(r) for r in con.execute("""SELECT substr(date,1,7) m, COUNT(*) n, SUM(near_kind IS NOT NULL) nf, COUNT(DISTINCT date) d
                                              FROM fire_pixels WHERE date > date(?, '-365 day') GROUP BY m ORDER BY m""", (last,))]
    src = [dict(r) for r in con.execute("""SELECT kind, name, lat, lon FROM pollution_sources WHERE lat IS NOT NULL
                                             AND kind IN ('refinery','oil_facility','power_plant','oil_storage','landfill','wastewater')""")]
    for s in src:
        s["in_prov"] = inside(s["lon"], s["lat"], geom)
        s["lat"], s["lon"] = round(s["lat"], 4), round(s["lon"], 4)
    con.close(); tmp.unlink(missing_ok=True)
    print(f"flares: {len(H)} hot cells → {len(sites)} sites ({sum(s['in_prov'] for s in sites)} inside the province); {len(src)} OSM sources; last pixel {last}")
    return {"sites": sites, "months": months, "last_pixel": last, "sources": src, "db_updated": meta.get("updated_at") or meta.get("built_at")}


def climate_trace(geom, bbox):
    """أصول Climate TRACE في العراق داخل حدود المحافظة."""
    out, offset = [], 0
    while offset < 5000:
        r = http_json("https://api.climatetrace.org/v6/assets", {"countries": "IRQ", "limit": 500, "offset": offset}, timeout=120)
        A = r.get("assets") or []
        if offset == 0 and A:
            print("climatetrace: sample asset keys:", sorted(A[0].keys()))
            print("climatetrace: sample:", json.dumps(A[0], ensure_ascii=False)[:1500])
        for a in A:
            c = a.get("Centroid") or {}
            g = c.get("Geometry") if isinstance(c, dict) else None
            if not g or len(g) < 2:
                continue
            lon, lat = g[0], g[1]
            if not (bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]) or not inside(lon, lat, geom):
                continue
            em = next((e for e in (a.get("EmissionsSummary") or []) if e.get("Gas") == "co2e_100yr"), None)
            conf = None
            for blk in a.get("Confidence") or []:  # آخر سنة لها درجة ثقة
                for yr, v in blk.items():
                    if v and isinstance(v, list) and v[0].get("total_co2e_100yrgwp"):
                        conf = (yr, v[0]["total_co2e_100yrgwp"])
            out.append({"id": a.get("Id"), "name": a.get("Name"), "sector": a.get("Sector"), "type": a.get("AssetType"), "lat": round(lat, 4), "lon": round(lon, 4),
                        "co2e_t": round(em["EmissionsQuantity"]) if em and em.get("EmissionsQuantity") is not None else None,
                        "conf": conf[1] if conf else None})
        if len(A) < 500:
            break
        offset += 500
    out.sort(key=lambda x: -(x["co2e_t"] or 0))
    from collections import Counter
    print("climatetrace: sectors:", Counter(x["sector"] for x in out).most_common())
    print("climatetrace: confidence:", Counter(x["conf"] for x in out).most_common())
    out = [x for x in out if x["co2e_t"]][:80]
    print(f"climatetrace: {len(out)} assets inside Salah al-Din; top: {[(x['name'], x['co2e_t']) for x in out[:5]]}")
    return out


def run(db_gz: Path):
    wc = json.loads((ROOT / "data" / "live" / "water-change.json").read_text(encoding="utf-8"))
    geom = wc["boundary"]["geometry"]
    xs = [p[0] for poly in (geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]) for p in poly[0]]
    ys = [p[1] for poly in (geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]) for p in poly[0]]
    bbox = (min(xs), min(ys), max(xs), max(ys))
    out = {"generated": utcnow(), "kinds": KIND,
           "fire_source": "NASA MODIS Terra/Aqua Thermal Anomalies & Fire Daily (MOD14A1/MYD14A1 v6.1, 1 km) via Microsoft Planetary Computer; EcoBio AI district database",
           "osm_source": "© OpenStreetMap contributors (ODbL)"}
    out.update(from_db(db_gz, geom))
    try:
        out["climatetrace"] = {"source": "Climate TRACE v6 API (CC BY 4.0), modelled estimates", "assets": climate_trace(geom, bbox)}
    except Exception as e:  # التقديرات إضافة، لا توقف الملف
        print("climatetrace failed:", e)
    return out
