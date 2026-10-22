"""البيانات المرجعية: الأقضية الستة المطلة على دجلة، المصادر، والمعايير."""

# مراكز الأقضية (Wikipedia/GeoNames). ord: من أعلى النهر (الشمال) إلى أسفله.
DISTRICTS = [
    {"id": "shirqat", "name_ar": "الشرقاط", "name_en": "Al-Shirqat", "ord": 1, "lat": 35.5100, "lon": 43.2300},
    {"id": "baiji",   "name_ar": "بيجي",    "name_en": "Baiji",      "ord": 2, "lat": 34.9311, "lon": 43.4870},
    {"id": "tikrit",  "name_ar": "تكريت",   "name_en": "Tikrit",     "ord": 3, "lat": 34.6071, "lon": 43.6782},
    {"id": "dour",    "name_ar": "الدور",   "name_en": "Al-Dour",    "ord": 4, "lat": 34.4575, "lon": 43.7983},
    {"id": "samarra", "name_ar": "سامراء",  "name_en": "Samarra",    "ord": 5, "lat": 34.1959, "lon": 43.8857},
    {"id": "balad",   "name_ar": "بلد",     "name_en": "Balad",      "ord": 6, "lat": 34.0164, "lon": 44.1453},
]

SOURCES = [
    {"id": "cams", "name": "Copernicus Atmosphere Monitoring Service (CAMS) global", "provider": "ECMWF / Copernicus عبر Open-Meteo",
     "url": "https://open-meteo.com/en/docs/air-quality-api", "license": "Copernicus licence (CC BY 4.0 compatible)", "resolution": "≈ 0.4° (≈45 كم)، ساعي",
     "citation": "Inness, A. et al. (2019). The CAMS reanalysis of atmospheric composition. Atmos. Chem. Phys. 19: 3515–3556."},
    {"id": "era5", "name": "ERA5 reanalysis", "provider": "ECMWF / Copernicus Climate Change Service عبر Open-Meteo",
     "url": "https://open-meteo.com/en/docs/historical-weather-api", "license": "CC BY 4.0", "resolution": "0.25° (≈25 كم)، يومي",
     "citation": "Hersbach, H. et al. (2020). The ERA5 global reanalysis. Q. J. R. Meteorol. Soc. 146: 1999–2049."},
    {"id": "ifs", "name": "ECMWF IFS / best-match forecast", "provider": "Open-Meteo Forecast API",
     "url": "https://open-meteo.com/en/docs", "license": "CC BY 4.0", "resolution": "≈ 9–25 كم",
     "citation": "Open-Meteo forecast API (Zippenfenig, P., 2023, doi:10.5281/zenodo.7970649)."},
    {"id": "glofas", "name": "GloFAS v4 river discharge", "provider": "Copernicus Emergency Management Service عبر Open-Meteo",
     "url": "https://open-meteo.com/en/docs/flood-api", "license": "CC BY 4.0", "resolution": "0.05° (≈5 كم)، يومي",
     "citation": "Harrigan, S. et al. (2020). GloFAS-ERA5 operational global river discharge reanalysis 1979–present. Earth Syst. Sci. Data 12: 2043–2060."},
    {"id": "s2", "name": "Sentinel-2 Level-2A", "provider": "ESA / Copernicus عبر Microsoft Planetary Computer",
     "url": "https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a", "license": "Copernicus Sentinel data terms", "resolution": "10–20 م، كل 2–5 أيام",
     "citation": "Lacaux, J.P. et al. (2007) لمؤشر NDTI؛ Mishra, S., Mishra, D.R. (2012). Normalized difference chlorophyll index. Remote Sens. Environ. 117: 394–406."},
    {"id": "osm", "name": "OpenStreetMap", "provider": "OpenStreetMap contributors عبر Overpass API",
     "url": "https://www.openstreetmap.org/copyright", "license": "ODbL 1.0", "resolution": "معالم مفردة",
     "citation": "© OpenStreetMap contributors."},
    {"id": "tu", "name": "بحوث جامعة تكريت المنشورة", "provider": "مجلات علمية محكّمة",
     "url": "https://moamin-ecobio.vercel.app/#research", "license": "اقتباس علمي مع ذكر المصدر", "resolution": "قياسات حقلية",
     "citation": "انظر جدول studies لكل بحث ومرجعه."},
]

# حدود منظمة الصحة العالمية 2021 (24 ساعة) للمقارنة
PARAMETERS = [
    ("pm2_5", "الجسيمات الدقيقة PM2.5", "PM2.5", "µg/m³", "air", "cams", 15, "WHO AQG 2021، 24 ساعة"),
    ("pm10", "الجسيمات PM10", "PM10", "µg/m³", "air", "cams", 45, "WHO AQG 2021، 24 ساعة"),
    ("dust", "الغبار", "Dust", "µg/m³", "air", "cams", None, None),
    ("no2", "ثاني أكسيد النتروجين", "NO₂", "µg/m³", "air", "cams", 25, "WHO AQG 2021، 24 ساعة"),
    ("so2", "ثاني أكسيد الكبريت", "SO₂", "µg/m³", "air", "cams", 40, "WHO AQG 2021، 24 ساعة"),
    ("o3", "الأوزون", "O₃", "µg/m³", "air", "cams", 100, "WHO AQG 2021، أعلى متوسط 8 ساعات"),
    ("co", "أول أكسيد الكربون", "CO", "µg/m³", "air", "cams", 4000, "WHO AQG 2021، 24 ساعة"),
    ("aqi_pm25", "مؤشر جودة الهواء الصحي (PM2.5)", "US AQI PM2.5", "", "air", "cams", 100, "US EPA: فوق 100 غير صحي للفئات الحساسة"),
    ("t_max", "أعلى درجة حرارة", "Max temperature", "°C", "weather", "era5", None, None),
    ("t_mean", "متوسط درجة الحرارة", "Mean temperature", "°C", "weather", "era5", None, None),
    ("precip", "الأمطار", "Precipitation", "mm", "weather", "era5", None, None),
    ("wind_max", "أعلى سرعة رياح", "Max wind speed", "km/h", "weather", "era5", None, None),
    ("rh_mean", "متوسط الرطوبة النسبية", "Mean relative humidity", "%", "weather", "era5", None, None),
    ("et0", "التبخر-النتح المرجعي", "Reference ET₀", "mm", "weather", "era5", None, None),
    ("discharge", "تصريف نهر دجلة", "River discharge", "m³/s", "river", "glofas", None, None),
    ("ndti", "مؤشر العكورة NDTI", "NDTI", "", "water_rs", "s2", None, None),
    ("ndci", "مؤشر الكلوروفيل NDCI", "NDCI", "", "water_rs", "s2", None, None),
]
