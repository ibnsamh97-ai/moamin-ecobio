-- =====================================================================
-- EcoBio AI — قاعدة بيانات أقضية صلاح الدين المطلة على نهر دجلة
-- SQLite 3. كل جدول قياس مرتبط بجدول الأقضية بمفتاح أجنبي، وكل معيار
-- مرتبط بمصدره في جدول المصادر. البيانات تُجلب وتُحدَّث يومياً آلياً.
-- =====================================================================
PRAGMA foreign_keys = ON;

-- ---------- الجداول المرجعية ----------
CREATE TABLE IF NOT EXISTS districts (
  id            TEXT PRIMARY KEY,          -- shirqat, baiji, tikrit, dour, samarra, balad
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  ord           INTEGER NOT NULL,          -- الترتيب من أعلى النهر إلى أسفله
  lat           REAL NOT NULL,             -- مركز القضاء
  lon           REAL NOT NULL,
  river_lat     REAL,                      -- أقرب نقطة على مجرى دجلة (OpenStreetMap)
  river_lon     REAL,
  river_dist_km REAL,                      -- المسافة بين المركز والنهر
  glofas_lat    REAL,                      -- خلية GloFAS التي تمثل النهر عند القضاء
  glofas_lon    REAL,
  bank          TEXT,                      -- الضفة: east | west
  coord_source  TEXT
);

CREATE TABLE IF NOT EXISTS sources (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  provider   TEXT,
  url        TEXT,
  license    TEXT,
  resolution TEXT,
  citation   TEXT
);

CREATE TABLE IF NOT EXISTS parameters (
  code        TEXT PRIMARY KEY,            -- pm2_5, ndti, discharge ...
  name_ar     TEXT NOT NULL,
  name_en     TEXT,
  unit        TEXT,
  category    TEXT NOT NULL,               -- air | weather | river | water_rs
  source_id   TEXT REFERENCES sources(id),
  limit_value REAL,
  limit_ref   TEXT
);

-- ---------- القياسات ----------
CREATE TABLE IF NOT EXISTS air_daily (
  district_id TEXT NOT NULL REFERENCES districts(id),
  date        TEXT NOT NULL,               -- YYYY-MM-DD (UTC)
  pm2_5       REAL, pm2_5_max REAL, pm10 REAL, dust REAL,
  no2 REAL, so2 REAL, o3 REAL, o3_max REAL, co REAL,
  aqi_pm25    REAL,                        -- أعلى مؤشر AQI (PM2.5) خلال اليوم
  aqi         REAL,                        -- أعلى مؤشر AQI العام خلال اليوم
  hours       INTEGER,                     -- عدد الساعات المتوفرة
  PRIMARY KEY (district_id, date)
);

CREATE TABLE IF NOT EXISTS weather_daily (
  district_id TEXT NOT NULL REFERENCES districts(id),
  date        TEXT NOT NULL,
  t_max REAL, t_min REAL, t_mean REAL, precip REAL,
  wind_max REAL, wind_dir REAL, rh_mean REAL, et0 REAL, radiation REAL,
  src         TEXT,                        -- era5 (أرشيف) | forecast (نموذج تنبؤ للأيام الأخيرة)
  PRIMARY KEY (district_id, date)
);

CREATE TABLE IF NOT EXISTS river_daily (
  district_id TEXT NOT NULL REFERENCES districts(id),
  date        TEXT NOT NULL,
  discharge   REAL,                        -- m³/s (GloFAS)
  PRIMARY KEY (district_id, date)
);

CREATE TABLE IF NOT EXISTS water_rs_monthly (
  district_id TEXT NOT NULL REFERENCES districts(id),
  month       TEXT NOT NULL,               -- YYYY-MM
  ndti        REAL,                        -- مؤشر العكورة (B04−B03)/(B04+B03)
  ndci        REAL,                        -- مؤشر الكلوروفيل (B05−B04)/(B05+B04)
  ndti_p90    REAL,
  ndci_p90    REAL,
  n_pixels    INTEGER,                     -- بكسلات الماء (20 م) المستعملة
  scene_id    TEXT,
  scene_date  TEXT,
  cloud_pct   REAL,
  PRIMARY KEY (district_id, month)
);

-- ---------- البحوث المنشورة ----------
CREATE TABLE IF NOT EXISTS studies (
  id       TEXT PRIMARY KEY,
  title    TEXT NOT NULL,
  authors  TEXT,
  journal  TEXT,
  volume   TEXT,
  year     INTEGER,
  doi      TEXT,
  url      TEXT,
  place    TEXT,
  medium   TEXT,
  period   TEXT,
  summary  TEXT
);

CREATE TABLE IF NOT EXISTS study_districts (
  study_id    TEXT NOT NULL REFERENCES studies(id),
  district_id TEXT NOT NULL REFERENCES districts(id),
  PRIMARY KEY (study_id, district_id)
);

CREATE TABLE IF NOT EXISTS study_values (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  study_id  TEXT NOT NULL REFERENCES studies(id),
  table_id  TEXT,                          -- ranges أو رقم الجدول في البحث
  item      TEXT NOT NULL,                 -- المعيار أو الصف كما ورد
  col       TEXT,                          -- المحطة أو الفصل أو العمود كما ورد
  stat      TEXT,                          -- value | min | max
  value     REAL,
  unit      TEXT,
  note      TEXT
);

-- ---------- مصادر التلوث (OpenStreetMap) ----------
CREATE TABLE IF NOT EXISTS pollution_sources (
  id          TEXT PRIMARY KEY,            -- node/123 أو way/456
  district_id TEXT REFERENCES districts(id),
  kind        TEXT NOT NULL,               -- refinery | power_plant | wastewater | landfill | industrial | quarry | oil_well ...
  name        TEXT,
  lat         REAL, lon REAL,
  dist_river_km REAL,
  tags_json   TEXT
);

-- ---------- الذكاء الاصطناعي ----------
CREATE TABLE IF NOT EXISTS model_runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at       TEXT NOT NULL,
  district_id  TEXT REFERENCES districts(id),
  task         TEXT NOT NULL,              -- pm25_next_day ...
  model        TEXT NOT NULL,              -- persistence | ridge | random_forest | gradient_boosting | mlp
  n_train      INTEGER, n_test INTEGER,
  test_from    TEXT, test_to TEXT,
  mae REAL, rmse REAL, r2 REAL,
  skill        REAL,                       -- 1 − RMSE/RMSE(persistence)
  is_best      INTEGER DEFAULT 0,
  params_json  TEXT
);

CREATE TABLE IF NOT EXISTS feature_importance (
  run_id     INTEGER NOT NULL REFERENCES model_runs(id),
  feature    TEXT NOT NULL,
  importance REAL,
  std        REAL,
  PRIMARY KEY (run_id, feature)
);

CREATE TABLE IF NOT EXISTS model_test_predictions (
  run_id    INTEGER NOT NULL REFERENCES model_runs(id),
  date      TEXT NOT NULL,
  actual    REAL,
  predicted REAL,
  PRIMARY KEY (run_id, date)
);

CREATE TABLE IF NOT EXISTS forecasts (
  district_id TEXT NOT NULL REFERENCES districts(id),
  target      TEXT NOT NULL,               -- pm2_5
  for_date    TEXT NOT NULL,
  model       TEXT NOT NULL,               -- النموذج الأفضل، أو cams (توقع Copernicus للمقارنة)
  value       REAL,
  lo          REAL, hi REAL,               -- نطاق 80% من أخطاء فترة الاختبار
  run_at      TEXT,
  PRIMARY KEY (district_id, target, for_date, model)
);

CREATE TABLE IF NOT EXISTS anomalies (
  district_id TEXT NOT NULL REFERENCES districts(id),
  date        TEXT NOT NULL,
  method      TEXT NOT NULL,               -- isolation_forest
  score       REAL,
  top_param   TEXT,                        -- المعيار الأبعد عن المعتاد
  top_z       REAL,
  PRIMARY KEY (district_id, date, method)
);

CREATE TABLE IF NOT EXISTS regimes (
  cluster    INTEGER PRIMARY KEY,
  label_ar   TEXT,
  label_en   TEXT,
  n_days     INTEGER,
  centroid_json TEXT,                      -- متوسطات الملوثات الأصلية للمجموعة
  zscores_json  TEXT
);

CREATE TABLE IF NOT EXISTS air_regime_daily (
  district_id TEXT NOT NULL REFERENCES districts(id),
  date        TEXT NOT NULL,
  cluster     INTEGER REFERENCES regimes(cluster),
  PRIMARY KEY (district_id, date)
);

CREATE TABLE IF NOT EXISTS relationships (
  district_id TEXT REFERENCES districts(id),
  x           TEXT NOT NULL,
  y           TEXT NOT NULL,
  method      TEXT NOT NULL,               -- spearman
  coef        REAL, p_value REAL, n INTEGER,
  PRIMARY KEY (district_id, x, y, method)
);

-- ---------- سجل التحديث ----------
CREATE TABLE IF NOT EXISTS etl_log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at  TEXT NOT NULL,
  step    TEXT NOT NULL,
  status  TEXT NOT NULL,                   -- ok | warn | error
  rows    INTEGER,
  seconds REAL,
  message TEXT
);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ---------- فهارس ----------
CREATE INDEX IF NOT EXISTS ix_air_date      ON air_daily(date);
CREATE INDEX IF NOT EXISTS ix_weather_date  ON weather_daily(date);
CREATE INDEX IF NOT EXISTS ix_river_date    ON river_daily(date);
CREATE INDEX IF NOT EXISTS ix_src_district  ON pollution_sources(district_id);
CREATE INDEX IF NOT EXISTS ix_runs_district ON model_runs(district_id, task);

-- ---------- عروض جاهزة للاستعلام ----------
DROP VIEW IF EXISTS v_air_weather;
CREATE VIEW v_air_weather AS
SELECT a.district_id, a.date, a.pm2_5, a.pm10, a.dust, a.no2, a.so2, a.o3, a.co, a.aqi_pm25,
       w.t_max, w.t_mean, w.precip, w.wind_max, w.rh_mean, r.discharge
FROM air_daily a
LEFT JOIN weather_daily w ON w.district_id = a.district_id AND w.date = a.date
LEFT JOIN river_daily  r ON r.district_id = a.district_id AND r.date = a.date;

DROP VIEW IF EXISTS v_district_summary;
CREATE VIEW v_district_summary AS
SELECT d.id, d.name_ar, d.ord,
  (SELECT ROUND(AVG(pm2_5), 1) FROM air_daily a WHERE a.district_id = d.id AND a.date >= date('now', '-365 day')) AS pm25_mean_365,
  (SELECT ROUND(100.0 * SUM(CASE WHEN pm2_5 > 15 THEN 1 ELSE 0 END) / COUNT(*), 1) FROM air_daily a WHERE a.district_id = d.id AND a.date >= date('now', '-365 day') AND pm2_5 IS NOT NULL) AS pct_days_over_who_365,
  (SELECT ROUND(AVG(discharge), 0) FROM river_daily r WHERE r.district_id = d.id AND r.date >= date('now', '-365 day')) AS discharge_mean_365,
  (SELECT ROUND(AVG(ndti), 3) FROM water_rs_monthly w WHERE w.district_id = d.id AND w.month >= strftime('%Y-%m', date('now', '-365 day'))) AS ndti_mean_365,
  (SELECT COUNT(*) FROM pollution_sources s WHERE s.district_id = d.id) AS n_sources,
  (SELECT COUNT(*) FROM study_districts sd WHERE sd.district_id = d.id) AS n_studies
FROM districts d ORDER BY d.ord;
