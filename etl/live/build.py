"""بيانات «صلاح الدين الحية»: ملفات JSON صغيرة تُحسب في GitHub Actions وتُحفظ في data/live/.

    climate  حرارة تكريت سنة بسنة منذ 1940 من إعادة التحليل ERA5 (Open-Meteo)؛ تُحسب مرة في السنة.
    tle      عناصر مدارات أقمار رصد الأرض من CelesTrak؛ تُحدَّث كل يوم.
    water    تغيّر الماء السطحي 1984–2021 من JRC Global Surface Water؛ يُحسب مرة واحدة.

    python etl/live/build.py [climate] [tle] [water] [--force]
كل مهمة مستقلة: فشل واحدة لا يوقف الباقي، ويبقى ملفها السابق كما هو.
"""
from __future__ import annotations

import datetime as dt
import json
import math
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import ROOT, UA, http_json, utcnow  # noqa: E402

OUT = ROOT / "data" / "live"
TIKRIT = {"name": "تكريت", "lat": 34.6071, "lon": 43.6782}
CLIMATE_V = 2  # غيّر الرقم لإعادة الحساب عند تغيّر طريقة التجميع


def save(name: str, obj) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / name
    txt = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    p.write_text(txt + "\n", encoding="utf-8")
    print(f"  ← {p.relative_to(ROOT)} ({len(txt) / 1024:.1f} KB)")


def load(name: str):
    p = OUT / name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


# ---------------------------------------------------------------- الحرارة
def climate(force: bool = False) -> None:
    """ERA5 اليومي لخلية تكريت 1940 → آخر سنة كاملة، ملخصاً لكل سنة."""
    last = dt.date.today().year - 1
    old = load("climate-tikrit.json")
    if old and not force and old.get("v") == CLIMATE_V and old.get("years") and old["years"][-1]["y"] >= last:
        print(f"climate: up to date ({old['years'][-1]['y']})")
        return
    days, meta = {}, {}
    for y0 in range(1940, last + 1, 10):
        y1 = min(last, y0 + 9)
        r = http_json("https://archive-api.open-meteo.com/v1/archive", {
            "latitude": TIKRIT["lat"], "longitude": TIKRIT["lon"], "models": "era5", "timezone": "Asia/Baghdad",
            "start_date": f"{y0}-01-01", "end_date": f"{y1}-12-31",
            "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean"}, timeout=180)
        meta = {"lat": r.get("latitude"), "lon": r.get("longitude"), "elevation": r.get("elevation")}
        d = r["daily"]
        for i, t in enumerate(d["time"]):
            days[t] = (d["temperature_2m_max"][i], d["temperature_2m_min"][i], d["temperature_2m_mean"][i])
        print(f"climate: {y0}–{y1} → {len(d['time'])} days")
    years = []
    for y in range(1940, last + 1):
        rows = [(t, v) for t, v in days.items() if t.startswith(f"{y}-") and None not in v]
        size = 366 if (y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)) else 365
        # سنة ناقصة لا تدخل الحساب. يُسمح بغياب يوم واحد فقط: أول يوم في الأرشيف
        # (1940/1/1 بتوقيت بغداد يبدأ قبل أول ساعة في ERA5 بثلاث ساعات)
        if len(rows) < size - 1:
            print(f"climate: {y} incomplete ({len(rows)}/{size}) — skipped")
            continue
        hot = max(rows, key=lambda r: r[1][0])
        years.append({
            "y": y, "days": len(rows),
            "tmean": round(sum(v[2] for _, v in rows) / len(rows), 3),
            "tmax": round(sum(v[0] for _, v in rows) / len(rows), 3),
            "d45": sum(1 for _, v in rows if v[0] >= 45),
            "d48": sum(1 for _, v in rows if v[0] >= 48),
            "n30": sum(1 for _, v in rows if v[1] >= 30),
            "hot": round(hot[1][0], 1), "hot_date": hot[0],
        })
    if len(years) < 60:
        raise RuntimeError(f"too few complete years: {len(years)}")
    save("climate-tikrit.json", {
        "v": CLIMATE_V, "place": TIKRIT["name"], "lat": TIKRIT["lat"], "lon": TIKRIT["lon"], "grid": meta,
        "model": "ERA5 (ECMWF / Copernicus C3S) via Open-Meteo Historical Weather API, models=era5, daily, Asia/Baghdad",
        "license": "CC BY 4.0", "generated": utcnow(),
        "fields": {"tmean": "متوسط الحرارة السنوي °C", "tmax": "متوسط العظمى اليومية °C", "d45": "أيام العظمى ≥ 45 °C",
                   "d48": "أيام العظمى ≥ 48 °C", "n30": "ليالٍ الصغرى ≥ 30 °C", "hot": "أعلى عظمى في السنة °C"},
        "years": years})


# ---------------------------------------------------------------- المدارات
# الأقمار التي تأخذ منها المنصة بياناتها، وعرض مسح كل منها (كم) من صفحات البعثات
SATS = [
    ("SENTINEL-2A", 290), ("SENTINEL-2B", 290), ("SENTINEL-2C", 290),
    ("LANDSAT 8", 185), ("LANDSAT 9", 185),
    ("SENTINEL-5P", 2600),
    ("AQUA", 2330), ("TERRA", 2330),
    ("SENTINEL-3A", 1270), ("SENTINEL-3B", 1270),
]


def tle(force: bool = False) -> None:
    r = http_json("https://celestrak.org/NORAD/elements/gp.php", {"GROUP": "resource", "FORMAT": "JSON"}, tries=2)
    want = {n: w for n, w in SATS}
    found = []
    for o in r:
        name = (o.get("OBJECT_NAME") or "").upper()
        base = name.split("(")[0].strip()
        if base in want:
            o = {k: o[k] for k in ("OBJECT_NAME", "OBJECT_ID", "EPOCH", "MEAN_MOTION", "ECCENTRICITY", "INCLINATION", "RA_OF_ASC_NODE",
                                    "ARG_OF_PERICENTER", "MEAN_ANOMALY", "EPHEMERIS_TYPE", "CLASSIFICATION_TYPE", "NORAD_CAT_ID",
                                    "ELEMENT_SET_NO", "REV_AT_EPOCH", "BSTAR", "MEAN_MOTION_DOT", "MEAN_MOTION_DDOT") if k in o}
            o["SWATH_KM"] = want[base]
            found.append(o)
    names = sorted(o["OBJECT_NAME"] for o in found)
    print(f"tle: {len(r)} objects in group, kept {len(found)}: {names}")
    missing = sorted(set(want) - {o['OBJECT_NAME'].split('(')[0].strip().upper() for o in found})
    if missing:
        print(f"tle: not in group 'resource': {missing}")
    if len(found) < 5:
        raise RuntimeError("too few satellites found")
    save("tle.json", {"source": "CelesTrak GP data (GROUP=resource)", "url": "https://celestrak.org/NORAD/elements/gp.php?GROUP=resource&FORMAT=JSON",
                      "fetched": utcnow(), "sats": found})


# ---------------------------------------------------------------- الماء
def water(force: bool = False) -> None:
    from water_jrc import run  # يحتاج rasterio؛ يُستورد هنا فقط
    old = load("water-change.json")
    if old and not force:
        print("water: exists (use --force to recompute)")
        return
    save("water-change.json", run())


TASKS = {"climate": climate, "tle": tle, "water": water}

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    bad = 0
    for name in args or list(TASKS):
        print(f"== {name}")
        try:
            TASKS[name](force)
        except Exception:
            bad += 1
            traceback.print_exc()
    print("done" if not bad else f"{bad} task(s) failed")
