"""القياس الأرضي الحقيقي: أرصاد محطات المطارات (METAR) من أرشيف Iowa Environmental Mesonet.

ما يفعله:
  1. يجلب التقارير الساعية الحقيقية (حرارة، رطوبة، رياح، مدى رؤية، ظواهر جوية) ويجمعها يومياً بتوقيت بغداد.
  2. يجلب نموذج ERA5 (وCAMS للغبار) عند إحداثيات المحطة نفسها لنفس الأيام.
  3. يحسب خطأ النموذج لكل شهر من السنة (المقاس − النموذج) لتصحيح حرارة الأقضية.
  4. يربط كل قضاء بأقرب محطة تبث الآن، وبأقرب محطة تصحيح.

ملاحظة صادقة: لا توجد محطة رسمية تبث اليوم من داخل الأقضية الستة. أقرب المحطات الحية
كركوك وبغداد وأربيل. أما محطات تكريت (سبايكر) وبيجي وبلد فلها أرشيف حقيقي انتهى، ونستعمله
لمعرفة خطأ النموذج في المكان نفسه.
"""
from __future__ import annotations

import csv
import datetime as dt
import io
import math
import time
from collections import defaultdict

import openmeteo as om
from common import http_text

IEM = "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py"
CURRENT_FIRST = 2010
HOURLY_KEEP_DAYS = 10

# (المعرّف في أرشيف IEM، أول سنة، آخر سنة أو None إذا ما زالت تبث)
STATIONS = [
    {"id": "kirkuk", "name_ar": "مطار كركوك", "name_en": "Kirkuk Airport", "icao": "ORKK", "lat": 35.4694, "lon": 44.3489, "kind": "current",
     "feeds": [("QTX", 2010, 2022), ("ORKK", 2024, None)], "note": "تبث كل ساعة"},
    {"id": "baghdad", "name_ar": "مطار بغداد الدولي", "name_en": "Baghdad International Airport", "icao": "ORBI", "lat": 33.2625, "lon": 44.2346, "kind": "current",
     "feeds": [("ORBI", 2010, None)], "note": "تبث كل نصف ساعة"},
    {"id": "erbil", "name_ar": "مطار أربيل الدولي", "name_en": "Erbil International Airport", "icao": "ORER", "lat": 36.2376, "lon": 43.9632, "kind": "current",
     "feeds": [("ORER", 2010, None)], "note": "تبث كل ساعة"},
    {"id": "tikrit_ab", "name_ar": "قاعدة تكريت الجوية (سبايكر)", "name_en": "Tikrit Air Base (Speicher)", "icao": "ORSH", "lat": 34.6667, "lon": 43.5333, "kind": "historic",
     "feeds": [("QSL", 2000, 2011), ("ORSH", 2019, 2019)], "note": "أرشيف حقيقي داخل قضاء تكريت حتى 2011، وأشهر من 2019"},
    {"id": "baiji_ab", "name_ar": "محطة بيجي", "name_en": "Bayji", "icao": "QBJ", "lat": 34.9667, "lon": 43.4667, "kind": "historic",
     "feeds": [("QBJ", 2000, 2011)], "note": "أرشيف حقيقي داخل قضاء بيجي حتى 2011"},
    {"id": "balad_ab", "name_ar": "قاعدة بلد الجوية", "name_en": "Balad Air Base", "icao": "ORBD", "lat": 33.9402, "lon": 44.3616, "kind": "historic",
     "feeds": [("QTO", 2000, 2011), ("ORBD", 2016, 2019)], "note": "أرشيف حقيقي داخل قضاء بلد حتى 2011، و2016–2019"},
]

DUST = ("DU", "SA", "DS", "SS", "PO")
HAZE = ("HZ", "FU")
RAIN = ("RA", "DZ", "GR", "GS", "SN")
KT = 1.852
MILE = 1.609344


def km(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    a = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def _f(v):
    if v in (None, "", "M", "T"):
        return None
    try:
        return float(v)
    except ValueError:
        return None


def _codes(wx: str | None):
    """رموز الظواهر الجوية دون ما هو «في الجوار» (VC)."""
    if not wx or wx == "M":
        return []
    return [t.lstrip("+-") for t in wx.split() if not t.lstrip("+-").startswith("VC")]


def _has(codes, keys):
    return any(k in c for c in codes for k in keys)


def parse(text: str):
    """CSV من IEM → قائمة أرصاد نظيفة. يُرفض ما هو خارج المدى الفيزيائي (مثل رياح 80 عقدة خطأ إدخال)."""
    out = []
    for r in csv.DictReader(io.StringIO(text)):
        if not r.get("valid") or r.get("station") in (None, "station"):
            continue
        tf = _f(r.get("tmpf"))
        t = round((tf - 32) * 5 / 9, 1) if tf is not None else None
        if t is not None and not -15 <= t <= 55:
            t = None
        rh = _f(r.get("relh"))
        if rh is not None and not 1 <= rh <= 100:
            rh = None
        sk = _f(r.get("sknt"))
        wind = round(sk * KT, 1) if sk is not None and 0 <= sk <= 60 else None
        gk = _f(r.get("gust"))
        gust = round(gk * KT, 1) if gk is not None and 0 < gk <= 90 else None
        vs = _f(r.get("vsby"))
        vis = round(min(vs * MILE, 10.0), 1) if vs is not None and vs >= 0 else None
        out.append({"valid": r["valid"][:16], "t": t, "rh": round(rh, 1) if rh is not None else None, "wind": wind, "gust": gust,
                    "wind_dir": _f(r.get("drct")), "vis": vis, "wx": None if r.get("wxcodes") in (None, "", "M") else r["wxcodes"],
                    "metar": r.get("metar") or None})
    return out


def fetch(feed: str, start: dt.date, end: dt.date):
    """تقارير ساعية بتوقيت بغداد، سنة بسنة حتى لا يثقل الطلب على الخادم."""
    obs = []
    y = start.year
    while y <= end.year:
        s = max(start, dt.date(y, 1, 1))
        e = min(end, dt.date(y, 12, 31)) + dt.timedelta(days=1)
        params = [("station", feed)] + [("data", k) for k in ("tmpf", "relh", "sknt", "drct", "gust", "vsby", "wxcodes", "metar")] + [
            ("year1", s.year), ("month1", s.month), ("day1", s.day), ("year2", e.year), ("month2", e.month), ("day2", e.day),
            ("tz", "Asia/Baghdad"), ("format", "onlycomma"), ("missing", "M"), ("trace", "T"),
            ("report_type", 3), ("report_type", 4)]
        obs += parse(http_text(IEM, params))
        time.sleep(1.0)
        y += 1
    return obs


def daily(station_id: str, obs: list[dict]):
    """تجميع يومي. الحرارة تُحسب فقط إذا غطّت الأرصاد 18 ساعة على الأقل من اليوم."""
    by = defaultdict(lambda: defaultdict(list))
    for o in obs:
        by[o["valid"][:10]][o["valid"][11:13]].append(o)
    rows = []
    for day, hours in sorted(by.items()):
        allo = [o for hs in hours.values() for o in hs]
        n = len(hours)
        hourly_t = [x for x in (_mean([o["t"] for o in hs]) for hs in hours.values()) if x is not None]
        temps = [o["t"] for o in allo if o["t"] is not None]
        ok_t = len(hourly_t) >= 18
        wx = {h: _codes(" ".join(o["wx"] or "" for o in hs)) for h, hs in hours.items()}
        winds = [o["wind"] for o in allo if o["wind"] is not None]
        vis = [o["vis"] for o in allo if o["vis"] is not None]
        rows.append({
            "station_id": station_id, "date": day, "n_hours": n,
            "t_max": max(temps) if ok_t else None, "t_min": min(temps) if ok_t else None, "t_mean": round(sum(hourly_t) / len(hourly_t), 1) if ok_t else None,
            "rh_mean": _mean([o["rh"] for o in allo]), "wind_mean": _mean(winds), "wind_max": max(winds) if winds else None,
            "gust_max": max((o["gust"] for o in allo if o["gust"] is not None), default=None),
            "vis_min": min(vis) if vis else None, "vis_mean": _mean(vis),
            "dust_hours": sum(1 for c in wx.values() if _has(c, DUST)), "haze_hours": sum(1 for c in wx.values() if _has(c, HAZE)),
            "rain_hours": sum(1 for c in wx.values() if _has(c, RAIN)), "storm_hours": sum(1 for c in wx.values() if _has(c, ("TS",))),
        })
    return rows


def _mean(v):
    v = [x for x in v if x is not None]
    return round(sum(v) / len(v), 1) if v else None


def _pearson(x, y):
    n = len(x)
    if n < 3:
        return None
    mx, my = sum(x) / n, sum(y) / n
    sx = math.sqrt(sum((a - mx) ** 2 for a in x)); sy = math.sqrt(sum((b - my) ** 2 for b in y))
    return round(sum((a - mx) * (b - my) for a, b in zip(x, y)) / (sx * sy), 3) if sx and sy else None


# ---------------------------------------------------------------------------
def run(con, D, yesterday: dt.date, full: bool, log):
    for s in STATIONS:
        con.execute("""INSERT INTO stations(id, name_ar, name_en, icao, lat, lon, kind, note) VALUES (?,?,?,?,?,?,?,?)
                       ON CONFLICT(id) DO UPDATE SET name_ar=excluded.name_ar, name_en=excluded.name_en, icao=excluded.icao,
                       lat=excluded.lat, lon=excluded.lon, kind=excluded.kind, note=excluded.note""",
                    (s["id"], s["name_ar"], s["name_en"], s["icao"], s["lat"], s["lon"], s["kind"], s["note"]))
    con.commit()
    cut = (yesterday - dt.timedelta(days=HOURLY_KEEP_DAYS)).isoformat()

    for s in STATIONS:
        # 1) الأرصاد الحقيقية
        with log.step(f"station.metar.{s['id']}") as st:
            last = None if full else con.execute("SELECT MAX(date) FROM station_daily WHERE station_id=?", (s["id"],)).fetchone()[0]
            if s["kind"] == "historic" and last:
                st.msg = "أرشيف منتهٍ ومحفوظ سابقاً"; st.rows = 0
            else:
                start = dt.date.fromisoformat(last) - dt.timedelta(days=3) if last else None
                obs = []
                for feed, y1, y2 in s["feeds"]:
                    f_start = max(dt.date(y1, 1, 1), start) if start else dt.date(y1, 1, 1)
                    f_end = min(dt.date(y2, 12, 31), yesterday + dt.timedelta(days=1)) if y2 else yesterday + dt.timedelta(days=1)
                    if f_start <= f_end:
                        obs += fetch(feed, f_start, f_end)
                obs.sort(key=lambda o: o["valid"])
                rows = [r for r in daily(s["id"], obs) if r["date"] <= yesterday.isoformat()]
                # INSERT OR REPLACE يمسح أعمدة النموذج؛ نحتفظ بها ونعيدها
                keep = {r[0]: r[1:] for r in con.execute(
                    "SELECT date, era5_t_max, era5_t_min, era5_t_mean, era5_rh_mean, era5_wind_max, cams_dust, cams_pm10 FROM station_daily WHERE station_id=? AND date>=?",
                    (s["id"], rows[0]["date"] if rows else "9999"))}
                for r in rows:
                    if r["date"] in keep:
                        r.update(zip(["era5_t_max", "era5_t_min", "era5_t_mean", "era5_rh_mean", "era5_wind_max", "cams_dust", "cams_pm10"], keep[r["date"]]))
                if rows:
                    cols = list(rows[0].keys())
                    con.executemany(f"INSERT OR REPLACE INTO station_daily ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})",
                                    [tuple(r.get(c) for c in cols) for r in rows])
                if s["kind"] == "current":
                    con.execute("DELETE FROM station_hourly WHERE station_id=? AND valid < ?", (s["id"], cut))
                    con.executemany("INSERT OR REPLACE INTO station_hourly(station_id, valid, t, rh, wind, gust, wind_dir, vis, wx, metar) VALUES (?,?,?,?,?,?,?,?,?,?)",
                                    [(s["id"], o["valid"], o["t"], o["rh"], o["wind"], o["gust"], o["wind_dir"], o["vis"], o["wx"], o["metar"]) for o in obs if o["valid"] >= cut])
                con.commit()
                st.rows = len(rows); st.msg = f"{len(obs)} رصداً ساعياً حقيقياً" + (f" منذ {start}" if start else "")

        # 2) نموذج ERA5 عند المحطة نفسها (للأيام التي لم تُملأ بعد)
        with log.step(f"station.era5.{s['id']}") as st:
            filled = con.execute("SELECT MAX(date) FROM station_daily WHERE station_id=? AND era5_t_max IS NOT NULL", (s["id"],)).fetchone()[0]
            a, b = con.execute("SELECT MIN(date), MAX(date) FROM station_daily WHERE station_id=? AND era5_t_max IS NULL AND date > ?",
                               (s["id"], filled or "0000")).fetchone()
            if a:
                pt = {"id": s["id"], "lat": s["lat"], "lon": s["lon"]}
                w = om.weather_archive(pt, dt.date.fromisoformat(a), min(dt.date.fromisoformat(b), yesterday))
                con.executemany("UPDATE station_daily SET era5_t_max=?, era5_t_min=?, era5_t_mean=?, era5_rh_mean=?, era5_wind_max=? WHERE station_id=? AND date=?",
                                [(r["t_max"], r["t_min"], r["t_mean"], r["rh_mean"], r["wind_max"], s["id"], r["date"]) for r in w])
                con.commit(); st.rows = len(w); st.msg = f"{a} → {b}"

        # 3) غبار CAMS عند المحطات الحية (متاح منذ آب 2022)
        if s["kind"] == "current":
            with log.step(f"station.cams.{s['id']}") as st:
                filled = con.execute("SELECT MAX(date) FROM station_daily WHERE station_id=? AND cams_dust IS NOT NULL", (s["id"],)).fetchone()[0]
                a = max(dt.date(2022, 8, 1), dt.date.fromisoformat(filled) - dt.timedelta(days=2) if filled else dt.date(2022, 8, 1))
                if a <= yesterday:
                    rows = om.air_daily({"id": s["id"], "lat": s["lat"], "lon": s["lon"]}, a, yesterday)
                    con.executemany("UPDATE station_daily SET cams_dust=?, cams_pm10=? WHERE station_id=? AND date=?",
                                    [(r["dust"], r["pm10"], s["id"], r["date"]) for r in rows])
                    con.commit(); st.rows = len(rows); st.msg = f"{a} →"

    # 4) خطأ النموذج الشهري لكل محطة
    with log.step("station.bias") as st:
        con.execute("DELETE FROM station_bias")
        out = []
        for s in STATIONS:
            for var in ("t_max", "t_min", "t_mean", "rh_mean"):
                by = defaultdict(list)
                for date, o, m in con.execute(f"SELECT date, {var}, era5_{var} FROM station_daily WHERE station_id=? AND {var} IS NOT NULL AND era5_{var} IS NOT NULL", (s["id"],)):
                    by[int(date[5:7])].append((o, m))
                for month, pairs in by.items():
                    o = [p[0] for p in pairs]; m = [p[1] for p in pairs]; n = len(pairs)
                    out.append((s["id"], var, month, n, round(sum(a - b for a, b in pairs) / n, 2), round(sum(abs(a - b) for a, b in pairs) / n, 2),
                                _pearson(o, m), round(sum(o) / n, 1), round(sum(m) / n, 1)))
        con.executemany("INSERT INTO station_bias(station_id, var, month, n, bias, mae, r, obs_mean, model_mean) VALUES (?,?,?,?,?,?,?,?,?)", out)
        for s in STATIONS:
            con.execute("UPDATE stations SET first_date=(SELECT MIN(date) FROM station_daily WHERE station_id=?), last_date=(SELECT MAX(date) FROM station_daily WHERE station_id=?) WHERE id=?",
                        (s["id"], s["id"], s["id"]))
        con.commit(); st.rows = len(out)

    # 5) ربط الأقضية بالمحطات
    with log.step("station.districts") as st:
        good = {r[0] for r in con.execute("SELECT station_id FROM station_bias WHERE var='t_max' AND n>=60 GROUP BY station_id HAVING COUNT(*) >= 10")}
        live = {r[0] for r in con.execute("SELECT id FROM stations WHERE kind='current' AND last_date >= ?", ((yesterday - dt.timedelta(days=30)).isoformat(),))}
        con.execute("DELETE FROM district_stations")
        rows = []
        for d in D:
            for role, pool in (("now", live), ("calib", good)):
                cand = [(km(d["lat"], d["lon"], s["lat"], s["lon"]), s["id"]) for s in STATIONS if s["id"] in pool]
                if cand:
                    dist, sid = min(cand)
                    rows.append((d["id"], role, sid, round(dist, 1)))
        con.executemany("INSERT INTO district_stations(district_id, role, station_id, dist_km) VALUES (?,?,?,?)", rows)
        con.commit(); st.rows = len(rows)
