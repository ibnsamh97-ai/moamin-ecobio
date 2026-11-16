"""فحص مصادر «صلاح الدين الحية» من خوادم GitHub: هل تسمح بالجلب من المتصفح (CORS)، وما شكل ردودها."""
import json
import urllib.request

UA = "EcoBio-AI/1.0 (+https://moamin-ecobio.vercel.app; academic, Tikrit University)"
URLS = [
    "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON",
    "https://storage.googleapis.com/global-surface-water/tiles2021/transitions/9/318/203.png",
    "https://storage.googleapis.com/global-surface-water/tiles2021/occurrence/9/317/203.png",
    "https://api.climatetrace.org/v6/assets?countries=IRQ&limit=2",
    "https://api.climatetrace.org/v6/assets?countries=IRQ&limit=2&year=2024",
    "https://api.climatetrace.org/v6/definitions/sectors",
    "https://api.climatetrace.org/v6/assets/emissions?countries=IRQ&years=2024",
    "https://archive-api.open-meteo.com/v1/archive?latitude=34.6&longitude=43.68&start_date=1940-01-01&end_date=1940-01-03&daily=temperature_2m_max&models=era5",
]
for u in URLS:
    try:
        req = urllib.request.Request(u, headers={"User-Agent": UA, "Origin": "https://moamin-ecobio.vercel.app"})
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read()
            h = {k: v for k, v in r.headers.items() if k.lower().startswith(("access-control", "content-type", "cache-control"))}
            print(f"\n{r.status} {u}\n  {json.dumps(h)}\n  {len(body)} bytes: {body[:700]!r}")
    except Exception as e:
        print(f"\nERR {u}: {e}")
        try:
            print("  ", e.read()[:400])
        except Exception:
            pass
