"""جلب الهواء (CAMS) والطقس (ERA5 + التنبؤ) والتصريف (GloFAS) من Open-Meteo وتجميعها يومياً."""
from __future__ import annotations

import datetime as dt
from collections import defaultdict

from common import http_json

TZ = "Asia/Baghdad"
AIR_H = ["pm2_5", "pm10", "dust", "nitrogen_dioxide", "sulphur_dioxide", "ozone", "carbon_monoxide", "us_aqi", "us_aqi_pm2_5"]
W_DAILY = ["temperature_2m_max", "temperature_2m_min", "temperature_2m_mean", "precipitation_sum", "wind_speed_10m_max",
           "wind_direction_10m_dominant", "relative_humidity_2m_mean", "et0_fao_evapotranspiration", "shortwave_radiation_sum"]
W_MAP = {"temperature_2m_max": "t_max", "temperature_2m_min": "t_min", "temperature_2m_mean": "t_mean", "precipitation_sum": "precip",
         "wind_speed_10m_max": "wind_max", "wind_direction_10m_dominant": "wind_dir", "relative_humidity_2m_mean": "rh_mean",
         "et0_fao_evapotranspiration": "et0", "shortwave_radiation_sum": "radiation"}


def chunks(start: dt.date, end: dt.date, days: int = 360):
    s = start
    while s <= end:
        e = min(end, s + dt.timedelta(days=days - 1))
        yield s, e
        s = e + dt.timedelta(days=1)


def _mean(v):
    v = [x for x in v if x is not None]
    return round(sum(v) / len(v), 3) if v else None


def _max(v):
    v = [x for x in v if x is not None]
    return round(max(v), 3) if v else None


def air_daily(d: dict, start: dt.date, end: dt.date):
    """قراءات ساعية → متوسطات يومية بتوقيت بغداد. اليوم يُحفظ إذا توفرت 18 ساعة على الأقل."""
    rows = []
    for s, e in chunks(start, end, 180):
        r = http_json("https://air-quality-api.open-meteo.com/v1/air-quality", {
            "latitude": d["lat"], "longitude": d["lon"], "hourly": ",".join(AIR_H), "timezone": TZ,
            "start_date": s.isoformat(), "end_date": e.isoformat(), "domains": "cams_global"})
        h = r.get("hourly", {})
        by = defaultdict(lambda: defaultdict(list))
        for i, t in enumerate(h.get("time", [])):
            day = t[:10]
            for k in AIR_H:
                by[day][k].append((h.get(k) or [None] * (i + 1))[i])
        for day, v in sorted(by.items()):
            n = sum(1 for x in v["pm2_5"] if x is not None)
            if n < 18:
                continue
            o3 = [x for x in v["ozone"]]
            o3_8h = None
            if sum(1 for x in o3 if x is not None) >= 8:
                win = [_mean(o3[i:i + 8]) for i in range(0, len(o3) - 7)]
                o3_8h = _max(win)
            rows.append({"district_id": d["id"], "date": day, "pm2_5": _mean(v["pm2_5"]), "pm2_5_max": _max(v["pm2_5"]),
                         "pm10": _mean(v["pm10"]), "dust": _mean(v["dust"]), "no2": _mean(v["nitrogen_dioxide"]),
                         "so2": _mean(v["sulphur_dioxide"]), "o3": _mean(v["ozone"]), "o3_max": o3_8h,
                         "co": _mean(v["carbon_monoxide"]), "aqi_pm25": _max(v["us_aqi_pm2_5"]), "aqi": _max(v["us_aqi"]), "hours": n})
    return rows


def cams_forecast(d: dict):
    """توقع CAMS نفسه لمتوسط PM2.5 للغد (للمقارنة مع نموذجنا)."""
    r = http_json("https://air-quality-api.open-meteo.com/v1/air-quality", {
        "latitude": d["lat"], "longitude": d["lon"], "hourly": "pm2_5", "timezone": TZ, "forecast_days": 3, "past_days": 0, "domains": "cams_global"})
    h = r.get("hourly", {})
    by = defaultdict(list)
    for t, v in zip(h.get("time", []), h.get("pm2_5", [])):
        by[t[:10]].append(v)
    return {day: _mean(v) for day, v in by.items() if sum(1 for x in v if x is not None) >= 18}


def _weather(url: str, d: dict, params: dict, src: str):
    vars_ = list(W_DAILY)
    for _ in range(3):
        try:
            r = http_json(url, {"latitude": d["lat"], "longitude": d["lon"], "daily": ",".join(vars_), "timezone": TZ, **params})
            break
        except RuntimeError as e:  # متغير غير مدعوم في هذه الواجهة: نحذفه ونعيد
            bad = [v for v in vars_ if v in str(e)]
            if not bad:
                raise
            vars_ = [v for v in vars_ if v not in bad]
    else:
        return []
    dd = r.get("daily", {})
    rows = []
    for i, day in enumerate(dd.get("time", [])):
        row = {"district_id": d["id"], "date": day, "src": src}
        for k, col in W_MAP.items():
            arr = dd.get(k)
            row[col] = arr[i] if arr else None
        if row.get("t_max") is None:
            continue
        rows.append(row)
    return rows


def weather_archive(d: dict, start: dt.date, end: dt.date):
    rows = []
    for s, e in chunks(start, end, 3650):
        rows += _weather("https://archive-api.open-meteo.com/v1/archive", d, {"start_date": s.isoformat(), "end_date": e.isoformat()}, "era5")
    return rows


def weather_recent(d: dict):
    """الأيام العشرة الأخيرة واليومان القادمان من نموذج التنبؤ (لسدّ تأخر أرشيف ERA5 ولتنبؤ الغد)."""
    return _weather("https://api.open-meteo.com/v1/forecast", d, {"past_days": 10, "forecast_days": 3}, "forecast")


def river_daily(d: dict, start: dt.date, end: dt.date):
    rows = []
    for s, e in chunks(start, end, 3650 * 2):
        r = http_json("https://flood-api.open-meteo.com/v1/flood", {
            "latitude": d["glofas_lat"], "longitude": d["glofas_lon"], "daily": "river_discharge",
            "start_date": s.isoformat(), "end_date": e.isoformat()})
        dd = r.get("daily", {})
        for day, q in zip(dd.get("time", []), dd.get("river_discharge", [])):
            if q is not None:
                rows.append({"district_id": d["id"], "date": day, "discharge": round(q, 2)})
    return rows
