"""فحص مصادر «صلاح الدين الحية» من خوادم GitHub بالطلبات نفسها التي يرسلها المتصفح:
هل تجيب، وهل تسمح بالجلب من موقعنا (CORS)، وما شكل ردودها."""
import json
import urllib.parse
import urllib.request

UA = "EcoBio-AI/1.0 (+https://moamin-ecobio.vercel.app; academic, Tikrit University)"
ORIGIN = "https://moamin-ecobio.vercel.app"


def get(u, raw=False, tries=3):
    import time
    for i in range(tries):
        try:
            req = urllib.request.Request(u, headers={"User-Agent": UA, "Origin": ORIGIN})
            with urllib.request.urlopen(req, timeout=90) as r:
                body = r.read()
                return r.status, r.headers.get("Access-Control-Allow-Origin"), r.headers.get("Content-Type"), (body if raw else json.loads(body))
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(10 * (i + 1))


def show(name, fn):
    try:
        print(f"OK   {name}: {fn()}")
    except Exception as e:
        print(f"FAIL {name}: {e!r}")


# 1) الريح والغبار: الشبكة نفسها (195 نقطة)
la, lo = [], []
for a in range(28, 41):
    for o in range(36, 51):
        la.append(str(a)); lo.append(str(o))
q = f"latitude={','.join(la)}&longitude={','.join(lo)}&past_days=1&forecast_days=3&timezone=GMT"


def wind():
    s, c, t, j = get(f"https://api.open-meteo.com/v1/forecast?{q}&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms")
    return f"{s} cors={c} locations={len(j)} hours={len(j[0]['hourly']['time'])} first={j[0]['hourly']['wind_speed_10m'][:3]}"


def dust():
    s, c, t, j = get(f"https://air-quality-api.open-meteo.com/v1/air-quality?{q}&hourly=dust&domains=cams_global")
    d = j[0]["hourly"]["dust"]
    return f"{s} cors={c} locations={len(j)} hours={len(j[0]['hourly']['time'])} nonnull={sum(x is not None for x in d)} max={max(x for x in d if x is not None)}"


show("open-meteo wind grid", wind)
show("open-meteo dust grid", dust)
show("open-meteo current Tikrit", lambda: get("https://api.open-meteo.com/v1/forecast?latitude=34.61&longitude=43.68&current=wind_speed_10m,wind_direction_10m,temperature_2m&wind_speed_unit=ms&timezone=Asia%2FBaghdad")[3]["current"])

# 2) قبل وبعد: نفس منطق اختيار الصورة في js/live-swipe.js
PLACES = [("tharthar", 34.0, 43.24, 0.34, [1988, 2025]), ("adhaim", 34.66, 44.5, 0.12, [1990, 2025]), ("tikrit", 34.61, 43.68, 0.06, [1987, 2025]),
          ("samarra", 34.205, 43.86, 0.06, [1987, 2025]), ("baiji", 34.97, 43.49, 0.07, [1990, 2025])]
PC = "https://planetarycomputer.microsoft.com/api"


def cover(b, x):
    w = max(0, min(b[2], x[2]) - max(b[0], x[0])); h = max(0, min(b[3], x[3]) - max(b[1], x[1]))
    return w * h / ((x[2] - x[0]) * (x[3] - x[1]))


chosen = None
for pid, lat, lon, d, years in PLACES:
    box = [lon - d, lat - d * 0.8, lon + d, lat + d * 0.8]
    for y in years:
        def pick():
            global chosen
            for m0, m1 in (("08-01", "10-31"), ("05-01", "11-30")):
                p = urllib.parse.urlencode({"collections": "landsat-c2-l2", "bbox": ",".join(f"{v:.4f}" for v in box), "datetime": f"{y}-{m0}T00:00:00Z/{y}-{m1}T23:59:59Z",
                                            "limit": "60", "filter-lang": "cql2-text", "filter": "eo:cloud_cover<20", "fields": "id,bbox,properties.datetime,properties.eo:cloud_cover,properties.platform"})
                s, c, t, j = get(f"{PC}/stac/v1/search?{p}")
                F = [f for f in j.get("features", []) if not (f["properties"]["platform"] == "landsat-7" and f["properties"]["datetime"] >= "2003-06-01")]
                F = [(cover(f["bbox"], box), f) for f in F]
                ok = sorted([x for x in F if x[0] >= 0.6], key=lambda x: x[1]["properties"]["eo:cloud_cover"] + (1 - x[0]) * 100)
                if ok:
                    fr, f = ok[0]
                    chosen = chosen or f["id"]
                    return f"cors={c} n={len(F)} pick={f['id']} cloud={f['properties']['eo:cloud_cover']} cover={fr:.2f} months={m0[:2]}-{m1[:2]}"
            return f"NONE (candidates {len(F)}: covers {[round(x[0], 2) for x in F[:6]]})"
        show(f"landsat {pid} {y}", pick)

if chosen:
    def tile():
        qs = urllib.parse.urlencode([("collection", "landsat-c2-l2"), ("item", chosen), ("tile_format", "png"), ("color_formula", "gamma RGB 2.7, saturation 1.5, sigmoidal RGB 15 0.55"),
                                     ("assets", "red"), ("assets", "green"), ("assets", "blue")])
        s, c, t, b = get(f"{PC}/data/v1/item/tiles/WebMercatorQuad/9/317/203@1x.png?{qs}", raw=True)
        return f"{s} cors={c} type={t} bytes={len(b)}"
    show("landsat tile", tile)

# 3) بلاطات الصور والتضاريس
show("esri tile", lambda: get("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/11/811/1268", raw=True)[:3])
show("aws terrarium", lambda: get("https://s3.amazonaws.com/elevation-tiles-prod/terrarium/10/636/405.png", raw=True)[:3])
show("jrc transitions tile", lambda: get("https://storage.googleapis.com/global-surface-water/tiles2021/transitions/9/318/203.png", raw=True)[:3])
show("carto dark", lambda: get("https://a.basemaps.cartocdn.com/dark_nolabels/6/40/25.png", raw=True)[:3])
