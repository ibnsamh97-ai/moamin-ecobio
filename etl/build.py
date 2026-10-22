"""خط البيانات اليومي لقاعدة بيانات أقضية دجلة في صلاح الدين.

الاستخدام:
    python etl/build.py --db data/ecobio.db            # تحديث تراكمي (الأيام الجديدة فقط)
    python etl/build.py --db data/ecobio.db --full     # إعادة بناء كاملة
    python etl/build.py --db data/ecobio.db --skip s2  # تخطي مصدر (s2, osm, air, weather, river, research, ai)

المخرجات: ملف SQLite، ونسخة مضغوطة .gz، وملف ملخص JSON للواجهة.
"""
from __future__ import annotations

import argparse
import datetime as dt
import gzip
import json
import shutil
import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import ai  # noqa: E402
import geo  # noqa: E402
import openmeteo as om  # noqa: E402
import research  # noqa: E402
from common import Log, max_date, today, upsert, utcnow  # noqa: E402
from seed import DISTRICTS, PARAMETERS, SOURCES  # noqa: E402

AIR_FIRST = dt.date(2022, 8, 1)      # بداية بيانات CAMS العالمية الساعية المتاحة عبر Open-Meteo
WEATHER_FIRST = dt.date(2015, 1, 1)
RIVER_FIRST = dt.date(2000, 1, 1)
OVERLAP = 3                          # إعادة جلب آخر 3 أيام لالتقاط التصحيحات


def open_db(path: Path, full: bool):
    if full and path.exists():
        path.unlink()
    con = sqlite3.connect(path)
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript((Path(__file__).parent / "schema.sql").read_text(encoding="utf-8"))
    return con


def seed(con):
    upsert(con, "sources", SOURCES)
    upsert(con, "parameters", [dict(zip(["code", "name_ar", "name_en", "unit", "category", "source_id", "limit_value", "limit_ref"], p)) for p in PARAMETERS])
    for d in DISTRICTS:  # لا نمسح إحداثيات النهر وخلية GloFAS المحسوبة سابقاً
        con.execute("""INSERT INTO districts(id, name_ar, name_en, ord, lat, lon) VALUES (:id,:name_ar,:name_en,:ord,:lat,:lon)
                       ON CONFLICT(id) DO UPDATE SET name_ar=excluded.name_ar, name_en=excluded.name_en, ord=excluded.ord, lat=excluded.lat, lon=excluded.lon""", d)
    con.commit()


def districts(con):
    cur = con.execute("SELECT * FROM districts ORDER BY ord")
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def start_for(con, table, did, first: dt.date, full: bool):
    m = None if full else max_date(con, table, did)
    return first if not m else max(first, dt.date.fromisoformat(m) - dt.timedelta(days=OVERLAP))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="data/ecobio.db")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--skip", default="")
    ap.add_argument("--s2-limit", type=int, default=400)
    a = ap.parse_args()
    skip = set(filter(None, a.skip.split(",")))
    path = Path(a.db); path.parent.mkdir(parents=True, exist_ok=True)
    con = open_db(path, a.full)
    run_at = utcnow()
    log = Log(con, run_at)
    t0 = time.time()
    seed(con)
    T = today()
    yesterday = T - dt.timedelta(days=1)

    # 1) نقطة النهر لكل قضاء من OpenStreetMap + خلية GloFAS
    D = districts(con)
    if any(d["river_lat"] is None for d in D) or a.full:
        with log.step("geo.river_points") as st:
            lines, src = geo.tigris_lines()
            for d in D:
                dist, rlat, rlon = geo.nearest_on_lines(d["lat"], d["lon"], lines)
                con.execute("UPDATE districts SET river_lat=?, river_lon=?, river_dist_km=?, bank=?, coord_source=? WHERE id=?",
                            (round(rlat, 5), round(rlon, 5), round(dist, 2), "east" if d["lon"] > rlon else "west", src, d["id"]))
            con.commit(); st.rows = len(D); st.msg = src
            # حفظ مجرى النهر للخريطة
            (path.parent / "tigris.json").write_text(json.dumps([[[round(p[0], 5), round(p[1], 5)] for p in ln] for ln in lines]), encoding="utf-8")
        D = districts(con)
    if any(d["glofas_lat"] is None for d in D) and "river" not in skip:
        with log.step("geo.glofas_cells") as st:
            for d in D:
                if d["river_lat"] is None:
                    continue
                best = geo.glofas_cell(d["river_lat"], d["river_lon"], (T - dt.timedelta(days=400)).isoformat(), (T - dt.timedelta(days=35)).isoformat())
                if best:
                    con.execute("UPDATE districts SET glofas_lat=?, glofas_lon=? WHERE id=?", (best[1], best[2], d["id"]))
                    st.rows += 1
            con.commit(); st.msg = "أعلى متوسط تصريف بين 9 خلايا حول نقطة النهر"
        D = districts(con)

    # 2) الهواء اليومي (CAMS)
    if "air" not in skip:
        for d in D:
            with log.step(f"air.{d['id']}") as st:
                s = start_for(con, "air_daily", d["id"], AIR_FIRST, a.full)
                rows = om.air_daily(d, s, yesterday)
                st.rows = upsert(con, "air_daily", rows); st.msg = f"{s} → {yesterday}"
            with log.step(f"air.cams_forecast.{d['id']}") as st:
                fc = om.cams_forecast(d)
                rows = [{"district_id": d["id"], "target": "pm2_5", "for_date": day, "model": "cams", "value": v, "lo": None, "hi": None, "run_at": run_at}
                        for day, v in fc.items() if day >= T.isoformat()]
                con.execute("DELETE FROM forecasts WHERE district_id=? AND model='cams' AND for_date < ?", (d["id"], (T - dt.timedelta(days=60)).isoformat()))
                st.rows = upsert(con, "forecasts", rows)

    # 3) الطقس (ERA5 + أيام التنبؤ الأخيرة)
    if "weather" not in skip:
        for d in D:
            with log.step(f"weather.{d['id']}") as st:
                m = None if a.full else con.execute("SELECT MAX(date) FROM weather_daily WHERE district_id=? AND src='era5'", (d["id"],)).fetchone()[0]
                s = WEATHER_FIRST if not m else dt.date.fromisoformat(m) - dt.timedelta(days=OVERLAP)
                arch = om.weather_archive(d, s, yesterday)
                st.rows = upsert(con, "weather_daily", arch)
                last_era5 = max((r["date"] for r in arch), default=m)
                rec = [r for r in om.weather_recent(d) if not last_era5 or r["date"] > last_era5]
                con.execute("DELETE FROM weather_daily WHERE district_id=? AND src='forecast' AND date <= ?", (d["id"], last_era5 or "0000"))
                st.rows += upsert(con, "weather_daily", rec)
                st.msg = f"ERA5 حتى {last_era5}، وتنبؤ لـ {len(rec)} يوماً"

    # 4) تصريف النهر (GloFAS)
    if "river" not in skip:
        for d in D:
            if d["glofas_lat"] is None:
                continue
            with log.step(f"river.{d['id']}") as st:
                s = start_for(con, "river_daily", d["id"], RIVER_FIRST, a.full)
                st.rows = upsert(con, "river_daily", om.river_daily(d, s, yesterday)); st.msg = f"{s} →"

    # 5) جودة المياه من Sentinel-2
    if "s2" not in skip:
        with log.step("water_rs.sentinel2") as st:
            import sentinel2
            done = {(r[0], r[1]) for r in con.execute("SELECT district_id, month FROM water_rs_monthly")}
            rows, ntask = sentinel2.run([d for d in D if d["river_lat"] is not None], done, limit=a.s2_limit)
            st.rows = upsert(con, "water_rs_monthly", rows)
            st.msg = f"{ntask} مهمة (قضاء × شهر)، {sum(1 for r in rows if r['ndti'] is not None)} شهراً بمشهد صافٍ"

    # 6) مصادر التلوث (OSM) — أسبوعياً أو عند عدم وجودها
    if "osm" not in skip:
        last = con.execute("SELECT value FROM meta WHERE key='osm_at'").fetchone()
        if a.full or not last or (dt.datetime.fromisoformat(run_at) - dt.datetime.fromisoformat(last[0])).days >= 7:
            with log.step("osm.pollution_sources") as st:
                lines = json.loads((path.parent / "tigris.json").read_text(encoding="utf-8")) if (path.parent / "tigris.json").exists() else None
                srcs = geo.pollution_sources()
                for s_ in srcs:
                    near = min(D, key=lambda d: geo.km(s_["lat"], s_["lon"], d["lat"], d["lon"]))
                    s_["district_id"] = near["id"] if geo.km(s_["lat"], s_["lon"], near["lat"], near["lon"]) <= 30 else None
                    s_["dist_river_km"] = round(geo.nearest_on_lines(s_["lat"], s_["lon"], lines)[0], 2) if lines else None
                con.execute("DELETE FROM pollution_sources")
                st.rows = upsert(con, "pollution_sources", srcs)
                con.execute("INSERT OR REPLACE INTO meta VALUES ('osm_at', ?)", (run_at,)); con.commit()

    # 7) البحوث المنشورة
    if "research" not in skip:
        with log.step("research.studies") as st:
            studies, links, values = research.rows(D)
            con.execute("DELETE FROM study_values"); con.execute("DELETE FROM study_districts")
            upsert(con, "studies", studies); upsert(con, "study_districts", links)
            st.rows = upsert(con, "study_values", values); st.msg = f"{len(studies)} بحثاً، {len(links)} ربطاً بالأقضية"

    # 8) الذكاء الاصطناعي
    if "ai" not in skip:
        ai.run_forecasts(con, D, run_at, T, log)
        with log.step("ai.anomalies_wrap"):
            ai.anomalies(con, D, log)
        with log.step("ai.regimes_wrap"):
            ai.regimes(con, log)
        with log.step("ai.relationships_wrap"):
            ai.relationships(con, D, log)

    # 9) الملخص والضغط
    counts = {t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in
              ["districts", "air_daily", "weather_daily", "river_daily", "water_rs_monthly", "studies", "study_values", "pollution_sources",
               "model_runs", "forecasts", "anomalies", "air_regime_daily"]}
    ranges = {t: con.execute(f"SELECT MIN(date), MAX(date) FROM {t}").fetchone() for t in ["air_daily", "weather_daily", "river_daily"]}
    ranges["water_rs_monthly"] = con.execute("SELECT MIN(month), MAX(month) FROM water_rs_monthly WHERE ndti IS NOT NULL").fetchone()
    errors = con.execute("SELECT COUNT(*) FROM etl_log WHERE run_at=? AND status='error'", (run_at,)).fetchone()[0]
    con.execute("DELETE FROM etl_log WHERE run_at < ?", ((dt.datetime.fromisoformat(run_at) - dt.timedelta(days=30)).isoformat(),))
    meta = {"updated_at": run_at, "seconds": round(time.time() - t0, 1), "counts": counts, "ranges": ranges, "errors": errors, "schema_version": 1}
    con.execute("INSERT OR REPLACE INTO meta VALUES ('updated_at', ?)", (run_at,))
    con.execute("INSERT OR REPLACE INTO meta VALUES ('summary', ?)", (json.dumps(meta, ensure_ascii=False),))
    con.commit()
    con.execute("VACUUM")
    con.close()
    with open(path, "rb") as f, gzip.open(str(path) + ".gz", "wb", compresslevel=9) as g:
        shutil.copyfileobj(f, g)
    # ملخص صغير لآخر قراءة وتوقّع لكل قضاء (للتطبيق والتنبيه اليومي دون تنزيل القاعدة كاملة)
    con2 = sqlite3.connect(path)
    latest = {"updated_at": run_at, "districts": []}
    for d in districts(con2):
        a_ = con2.execute("SELECT date, pm2_5, pm10, dust, aqi_pm25 FROM air_daily WHERE district_id=? ORDER BY date DESC LIMIT 1", (d["id"],)).fetchone()
        fc = con2.execute("SELECT for_date, model, value, lo, hi FROM forecasts WHERE district_id=? AND target='pm2_5' AND for_date > ? ORDER BY for_date, model",
                          (d["id"], a_[0] if a_ else "0000")).fetchall()
        latest["districts"].append({"id": d["id"], "name_ar": d["name_ar"], "lat": d["lat"], "lon": d["lon"],
                                    "air": dict(zip(["date", "pm2_5", "pm10", "dust", "aqi_pm25"], a_)) if a_ else None,
                                    "forecast": [dict(zip(["for_date", "model", "value", "lo", "hi"], r)) for r in fc if r[1] != "cams"],
                                    "cams": [dict(zip(["for_date", "model", "value"], r[:3])) for r in fc if r[1] == "cams"]})
    con2.close()
    (path.parent / "latest.json").write_text(json.dumps(latest, ensure_ascii=False), encoding="utf-8")
    meta["bytes"] = path.stat().st_size
    meta["bytes_gz"] = Path(str(path) + ".gz").stat().st_size
    (path.parent / "ecobio-meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    (path.parent / "etl.log").write_text("\n".join(log.lines), encoding="utf-8")
    print(json.dumps(meta, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
