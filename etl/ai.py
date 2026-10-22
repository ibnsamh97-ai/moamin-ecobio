"""خوارزميات الذكاء الاصطناعي على قاعدة بيانات الأقضية.

1) التنبؤ بمتوسط PM2.5 لليوم التالي وبعد يومين لكل قضاء (استراتيجية مباشرة لكل أفق):
   مقارنة خمسة نماذج على آخر 180 يوماً (تقسيم زمني بلا خلط):
   الاستمرارية (خط الأساس)، Ridge، الغابة العشوائية، التعزيز التدرجي، الشبكة العصبية MLP.
   أفضل نموذج يُعاد تدريبه على كل البيانات ويُصدر التوقع مع نطاق 80% من أخطاء الاختبار.
   أهمية المتغيرات بطريقة التبديل (Permutation importance).
2) كشف الأيام الشاذة: Isolation Forest على الملوثات السبعة لكل قضاء.
3) أنماط الهواء اليومية: K-Means على كل أيام الأقضية، ويُختار عدد المجموعات بمعامل Silhouette.
4) العلاقات الشهرية: سبيرمان بين التصريف ودرجة الحرارة ومؤشري العكورة والكلوروفيل.
"""
from __future__ import annotations

import datetime as dt
import json
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
POLL = ["pm2_5", "pm10", "dust", "no2", "so2", "o3", "co"]
WX = ["t_max", "wind_max", "precip", "rh_mean"]
SEED = 42
TEST_DAYS = 180


def load(con, district_id):
    q = """SELECT a.date, a.pm2_5, a.pm10, a.dust, a.no2, a.so2, a.o3, a.co,
                  w.t_max, w.t_mean, w.wind_max, w.precip, w.rh_mean
           FROM air_daily a LEFT JOIN weather_daily w ON w.district_id = a.district_id AND w.date = a.date
           WHERE a.district_id = ? ORDER BY a.date"""
    df = pd.read_sql_query(q, con, params=(district_id,), parse_dates=["date"]).set_index("date")
    if df.empty:
        return df
    full = pd.date_range(df.index.min(), df.index.max(), freq="D")
    df = df.reindex(full)
    wx = pd.read_sql_query("SELECT date, t_max, t_mean, wind_max, precip, rh_mean FROM weather_daily WHERE district_id = ? ORDER BY date",
                           con, params=(district_id,), parse_dates=["date"]).set_index("date")
    return df, wx


def make_xy(df: pd.DataFrame, wx: pd.DataFrame, h: int):
    """متغيرات اليوم t (التأخيرات والمتوسطات) + طقس يوم الهدف t+h (معروف من التنبؤ الجوي) → الهدف PM2.5 في t+h."""
    X = pd.DataFrame(index=df.index)
    for L in range(7):
        X[f"pm25_lag{L}"] = df["pm2_5"].shift(L)
    for c in ["pm10", "dust", "no2", "co", "o3"]:
        X[f"{c}_lag0"] = df[c]
    X["pm25_ma7"] = df["pm2_5"].rolling(7, min_periods=5).mean()
    X["pm25_ma30"] = df["pm2_5"].rolling(30, min_periods=20).mean()
    X["wind_lag0"] = df["wind_max"]
    tgt_dates = df.index + pd.Timedelta(days=h)
    wxa = wx.reindex(tgt_dates)
    for c in WX:
        X[f"{c}_target"] = wxa[c].values
    doy = tgt_dates.dayofyear.values
    X["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    X["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)
    y = df["pm2_5"].shift(-h)
    return X, y


def models():
    from sklearn.compose import TransformedTargetRegressor
    from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
    from sklearn.linear_model import Ridge
    from sklearn.neural_network import MLPRegressor
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    log = dict(func=np.log1p, inverse_func=np.expm1)
    return {
        "ridge": (TransformedTargetRegressor(make_pipeline(StandardScaler(), Ridge(alpha=1.0)), **log), {"alpha": 1.0, "target": "log1p"}),
        "random_forest": (TransformedTargetRegressor(RandomForestRegressor(n_estimators=300, min_samples_leaf=3, max_features=0.5, random_state=SEED, n_jobs=-1), **log),
                          {"n_estimators": 300, "min_samples_leaf": 3, "max_features": 0.5, "target": "log1p"}),
        "gradient_boosting": (TransformedTargetRegressor(HistGradientBoostingRegressor(max_iter=400, learning_rate=0.05, max_leaf_nodes=31, l2_regularization=1.0, random_state=SEED), **log),
                              {"max_iter": 400, "learning_rate": 0.05, "max_leaf_nodes": 31, "target": "log1p"}),
        "mlp": (TransformedTargetRegressor(make_pipeline(StandardScaler(), MLPRegressor(hidden_layer_sizes=(64, 32), alpha=1e-3, learning_rate_init=1e-3, max_iter=1000,
                                                                                         early_stopping=True, random_state=SEED)), **log),
                {"hidden_layers": [64, 32], "alpha": 0.001, "early_stopping": True, "target": "log1p"}),
    }


def metrics(y, p):
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    return float(mean_absolute_error(y, p)), float(np.sqrt(mean_squared_error(y, p))), float(r2_score(y, p))


def forecast_district(con, d, run_at, today: dt.date):
    """يعيد صفوف model_runs وأهمية المتغيرات والتنبؤات وتوقعات الاختبار."""
    from sklearn.inspection import permutation_importance
    loaded = load(con, d["id"])
    if not isinstance(loaded, tuple):
        return None
    df, wx = loaded
    out = {"runs": [], "fi": {}, "pred": {}, "fc": []}
    last_day = df["pm2_5"].last_valid_index()
    for h, task in ((1, "pm25_d1"), (2, "pm25_d2")):
        X, y = make_xy(df, wx, h)
        ok = X.notna().all(axis=1) & y.notna()
        Xo, yo = X[ok], y[ok]
        if len(yo) < 300:
            continue
        n_test = min(TEST_DAYS, int(len(yo) * 0.2))
        Xtr, Xte, ytr, yte = Xo.iloc[:-n_test], Xo.iloc[-n_test:], yo.iloc[:-n_test], yo.iloc[-n_test:]
        res = {}
        p_pers = Xte["pm25_lag0"].values
        mae, rmse0, r2 = metrics(yte, p_pers)
        res["persistence"] = (None, {"rule": "PM2.5(t+h) = PM2.5(t)"}, p_pers, (mae, rmse0, r2))
        for name, (m, params) in models().items():
            m.fit(Xtr, ytr)
            p = m.predict(Xte)
            res[name] = (m, params, p, metrics(yte, p))
        best = min((k for k in res if k != "persistence"), key=lambda k: res[k][3][1])
        if res[best][3][1] >= rmse0:
            best = "persistence"  # الصدق قبل كل شيء: إن لم يتفوق أي نموذج على خط الأساس نقول ذلك
        for name, (m, params, p, (mae, rmse, r2)) in res.items():
            out["runs"].append({"run_at": run_at, "district_id": d["id"], "task": task, "model": name, "n_train": len(ytr), "n_test": len(yte),
                                "test_from": str(yte.index[0].date()), "test_to": str(yte.index[-1].date()), "mae": round(mae, 3), "rmse": round(rmse, 3),
                                "r2": round(r2, 4), "skill": round(1 - rmse / rmse0, 4) if rmse0 > 0 else None, "is_best": int(name == best),
                                "params_json": json.dumps(params)})
        resid = (yte.values - res[best][2])
        lo_q, hi_q = np.percentile(resid, [10, 90])
        out["pred"][task] = [(str(i.date()), float(a), float(b)) for i, a, b in zip(yte.index, yte.values, res[best][2])]
        if best != "persistence":
            m = res[best][0]
            pi = permutation_importance(m, Xte, yte, n_repeats=8, random_state=SEED, scoring="neg_root_mean_squared_error")
            out["fi"][task] = [(c, float(mu), float(sd)) for c, mu, sd in zip(Xte.columns, pi.importances_mean, pi.importances_std)]
            m.fit(Xo, yo)  # إعادة التدريب على كل البيانات قبل التنبؤ التشغيلي
        # التنبؤ التشغيلي: من آخر يوم كامل t إلى t+h
        if last_day is not None:
            Xall, _ = make_xy(df, wx, h)
            row = Xall.loc[[last_day]]
            target_day = (last_day + pd.Timedelta(days=h)).date()
            if row.notna().all(axis=1).iloc[0]:
                v = float(row["pm25_lag0"].iloc[0]) if best == "persistence" else float(res[best][0].predict(row)[0])
                out["fc"].append({"district_id": d["id"], "target": "pm2_5", "for_date": str(target_day), "model": best, "value": round(max(v, 0), 2),
                                  "lo": round(max(v + lo_q, 0), 2), "hi": round(max(v + hi_q, 0), 2), "run_at": run_at})
    return out


def run_forecasts(con, districts, run_at, today, log):
    from common import upsert
    n = 0
    for d in districts:
        with log.step(f"ai.forecast.{d['id']}") as st:
            out = forecast_district(con, d, run_at, today)
            if not out or not out["runs"]:
                st.status, st.msg = "warn", "بيانات غير كافية للتدريب (أقل من 300 يوم)"
                continue
            con.execute("DELETE FROM forecasts WHERE district_id = ? AND model != 'cams' AND run_at != ?", (d["id"], run_at))
            ids = {}
            for r in out["runs"]:
                cur = con.execute("""INSERT INTO model_runs(run_at, district_id, task, model, n_train, n_test, test_from, test_to, mae, rmse, r2, skill, is_best, params_json)
                                     VALUES (:run_at,:district_id,:task,:model,:n_train,:n_test,:test_from,:test_to,:mae,:rmse,:r2,:skill,:is_best,:params_json)""", r)
                if r["is_best"]:
                    ids[r["task"]] = cur.lastrowid
            for task, rid in ids.items():
                con.executemany("INSERT OR REPLACE INTO feature_importance(run_id, feature, importance, std) VALUES (?,?,?,?)",
                                [(rid, f, round(m, 5), round(s, 5)) for f, m, s in out["fi"].get(task, [])])
                con.executemany("INSERT OR REPLACE INTO model_test_predictions(run_id, date, actual, predicted) VALUES (?,?,?,?)",
                                [(rid, dte, round(a, 3), round(p, 3)) for dte, a, p in out["pred"].get(task, [])])
            upsert(con, "forecasts", out["fc"])
            best = [r for r in out["runs"] if r["is_best"] and r["task"] == "pm25_d1"]
            st.rows = len(out["runs"])
            st.msg = f"الأفضل لليوم التالي: {best[0]['model']} (RMSE {best[0]['rmse']}، R² {best[0]['r2']}، المهارة {best[0]['skill']})" if best else ""
            n += len(out["runs"])
    # نُبقي سجل أداء 90 يوماً فقط، ونحذف تفاصيل التشغيلات القديمة
    con.execute("DELETE FROM feature_importance WHERE run_id IN (SELECT id FROM model_runs WHERE run_at != ?)", (run_at,))
    con.execute("DELETE FROM model_test_predictions WHERE run_id IN (SELECT id FROM model_runs WHERE run_at != ?)", (run_at,))
    con.execute("DELETE FROM model_runs WHERE run_at < ?", ((dt.datetime.fromisoformat(run_at) - dt.timedelta(days=90)).isoformat(),))
    con.commit()
    return n


def anomalies(con, districts, log):
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    con.execute("DELETE FROM anomalies WHERE method = 'isolation_forest'")
    total = 0
    for d in districts:
        df = pd.read_sql_query(f"SELECT date, {', '.join(POLL)} FROM air_daily WHERE district_id = ? ORDER BY date", con, params=(d["id"],)).dropna()
        if len(df) < 200:
            continue
        Z = StandardScaler().fit_transform(np.log1p(df[POLL].clip(lower=0)))
        iso = IsolationForest(n_estimators=300, contamination=0.02, random_state=SEED).fit(Z)
        flag = iso.predict(Z) == -1
        score = -iso.decision_function(Z)
        med = df[POLL].median()
        mad = (df[POLL] - med).abs().median().replace(0, np.nan) * 1.4826
        rz = (df[POLL] - med) / mad
        rows = []
        for i in np.where(flag)[0]:
            zrow = rz.iloc[i].abs()
            top = zrow.idxmax()
            rows.append((d["id"], df["date"].iloc[i], "isolation_forest", round(float(score[i]), 4), top, round(float(rz.iloc[i][top]), 2)))
        con.executemany("INSERT OR REPLACE INTO anomalies VALUES (?,?,?,?,?,?)", rows)
        total += len(rows)
    con.commit()
    log.write("ai.anomalies", "ok", total, 0, "Isolation Forest، نسبة التلوث المتوقعة 2%")
    return total


def regimes(con, log):
    from sklearn.cluster import KMeans
    from sklearn.metrics import silhouette_score
    from sklearn.preprocessing import StandardScaler
    df = pd.read_sql_query(f"SELECT district_id, date, {', '.join(POLL)} FROM air_daily", con).dropna()
    if len(df) < 300:
        log.write("ai.regimes", "warn", 0, 0, "بيانات غير كافية")
        return 0
    L = np.log1p(df[POLL].clip(lower=0))
    sc = StandardScaler().fit(L)
    Z = sc.transform(L)
    rng = np.random.default_rng(SEED)
    idx = rng.choice(len(Z), size=min(4000, len(Z)), replace=False)
    best = None
    for k in range(3, 7):
        km = KMeans(n_clusters=k, n_init=10, random_state=SEED).fit(Z)
        s = silhouette_score(Z[idx], km.labels_[idx])
        if best is None or s > best[0]:
            best = (s, k, km)
    s, k, km = best
    labels = km.labels_
    zc = pd.DataFrame(km.cluster_centers_, columns=POLL)
    names = {}
    for c in range(k):
        z = zc.iloc[c]
        dust = (z["dust"] + z["pm10"]) / 2                     # الغبار والجسيمات الخشنة
        comb = max(z["no2"], z["so2"], (z["no2"] + z["so2"] + z["co"]) / 3)  # غازات الاحتراق
        ozone = z["o3"]
        parts = (z["pm2_5"] + z["pm10"] + z["dust"]) / 3       # مستوى الجسيمات العام
        best = max(dust, comb, ozone)
        if best < 0.3 and parts <= -0.3:
            base = ("هواء أنظف نسبياً", "Relatively clean air")
        elif best == dust and dust >= 0.4:
            base = ("غبار وأوزون صيفي", "Dust with summer ozone") if ozone >= 0.4 else ("غبار", "Dust")
        elif best == comb and comb >= 0.4:
            base = ("غازات احتراق (NO₂ وSO₂)", "Combustion gases (NO2, SO2)")
        elif best == ozone and ozone >= 0.4:
            base = ("أوزون مرتفع", "High ozone")
        else:
            base = ("معتدل مختلط", "Moderate mixed")
        names[c] = base
    # تمييز الأسماء المكررة بالشدة
    for base in set(names.values()):
        cs = [c for c in names if names[c] == base]
        if len(cs) > 1:
            cs.sort(key=lambda c: zc.iloc[c].mean(), reverse=True)
            for i, c in enumerate(cs):
                tag = ("شديد", "strong") if i == 0 else ("خفيف", "mild")
                names[c] = (f"{base[0]} {tag[0]}", f"{base[1]} ({tag[1]})")
    con.execute("DELETE FROM air_regime_daily"); con.execute("DELETE FROM regimes")  # الأبناء قبل الآباء (مفتاح أجنبي)
    for c in range(k):
        m = df.loc[labels == c, POLL].mean()
        con.execute("INSERT INTO regimes VALUES (?,?,?,?,?,?)", (int(c), names[c][0], names[c][1], int((labels == c).sum()),
                    json.dumps({p: round(float(m[p]), 2) for p in POLL}), json.dumps({p: round(float(zc.iloc[c][p]), 2) for p in POLL})))
    con.executemany("INSERT INTO air_regime_daily VALUES (?,?,?)", list(zip(df["district_id"], df["date"], map(int, labels))))
    con.commit()
    log.write("ai.regimes", "ok", len(df), 0, f"K-Means، k = {k}، Silhouette = {s:.3f}")
    return k


def relationships(con, districts, log):
    from scipy.stats import spearmanr
    con.execute("DELETE FROM relationships")
    n = 0
    for d in districts:
        q = """SELECT w.month, w.ndti, w.ndci,
                 (SELECT AVG(discharge) FROM river_daily r WHERE r.district_id = w.district_id AND substr(r.date,1,7) = w.month) AS discharge,
                 (SELECT AVG(t_mean) FROM weather_daily x WHERE x.district_id = w.district_id AND substr(x.date,1,7) = w.month) AS t_mean
               FROM water_rs_monthly w WHERE w.district_id = ? AND w.ndti IS NOT NULL"""
        m = pd.read_sql_query(q, con, params=(d["id"],))
        for x, y in (("discharge", "ndti"), ("discharge", "ndci"), ("t_mean", "ndci")):
            mm = m[[x, y]].dropna()
            if len(mm) >= 12:
                rho, p = spearmanr(mm[x], mm[y])
                con.execute("INSERT OR REPLACE INTO relationships VALUES (?,?,?,?,?,?,?)", (d["id"], x, y, "spearman", round(float(rho), 4), float(p), len(mm)))
                n += 1
    con.commit()
    log.write("ai.relationships", "ok", n, 0, "سبيرمان شهري")
    return n


# ---------------------------------------------------------------------------
# 5) أحداث الغبار: احتمال أن يُرصد غبار فعلاً، متعلَّم من أرصاد المطارات
# ---------------------------------------------------------------------------
DUST_F = ["log_cams_dust", "log_cams_pm10", "wind_max", "rh_mean", "t_max", "doy_sin", "doy_cos", "obs_lag1", "log_cams_dust_lag1"]


def _dust_frame(df):
    """df: date, cams_dust, cams_pm10, wind_max, rh_mean, t_max, obs (0/1/NaN) مرتبة زمنياً لموقع واحد."""
    df = df.sort_values("date").copy()
    for c in ("cams_dust", "cams_pm10", "wind_max", "rh_mean", "t_max", "obs"):
        df[c] = pd.to_numeric(df[c], errors="coerce").astype(float)
    doy = df["date"].dt.dayofyear
    df["doy_sin"] = np.sin(2 * np.pi * doy / 365.25); df["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)
    df["log_cams_dust"] = np.log1p(df["cams_dust"]); df["log_cams_pm10"] = np.log1p(df["cams_pm10"])
    df["obs_lag1"] = df["obs"].shift(1); df["log_cams_dust_lag1"] = df["log_cams_dust"].shift(1)
    return df


def _scores(y, p, thr):
    from sklearn.metrics import brier_score_loss, roc_auc_score
    yh = p >= thr
    hit = int((yh & (y == 1)).sum()); fa = int((yh & (y == 0)).sum()); miss = int((~yh & (y == 1)).sum())
    return {"pod": round(hit / max(1, hit + miss), 3), "far": round(fa / max(1, hit + fa), 3), "csi": round(hit / max(1, hit + miss + fa), 3),
            "auc": round(float(roc_auc_score(y, p)), 3) if 0 < y.sum() < len(y) else None, "brier": round(float(brier_score_loss(y, np.clip(p, 0, 1))), 4)}


def dust_events(con, D, run_at, today: dt.date):
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    st = pd.read_sql_query("""SELECT station_id, date, n_hours, dust_hours, cams_dust, cams_pm10, era5_wind_max AS wind_max, era5_rh_mean AS rh_mean, era5_t_max AS t_max
                              FROM station_daily s JOIN stations x ON x.id = s.station_id
                              WHERE x.kind = 'current' AND cams_dust IS NOT NULL AND era5_wind_max IS NOT NULL ORDER BY station_id, date""", con, parse_dates=["date"])
    if st.empty:
        return 0
    st["obs"] = np.where(st["n_hours"] >= 12, (st["dust_hours"] > 0).astype(float), np.nan)
    frames = [_dust_frame(g) for _, g in st.groupby("station_id")]
    data = pd.concat(frames).dropna(subset=DUST_F + ["obs"])
    cut = data["date"].max() - pd.Timedelta(days=365)
    tr, te = data[data["date"] <= cut], data[data["date"] > cut]
    if len(tr) < 300 or te["obs"].sum() < 10:
        return 0
    model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, C=0.5))
    model.fit(tr[DUST_F], tr["obs"])
    p = model.predict_proba(te[DUST_F])[:, 1]
    # العتبة: الأفضل في مؤشر CSI على بيانات التدريب (لا الاختبار) حتى لا نغش
    ptr = model.predict_proba(tr[DUST_F])[:, 1]
    thr = max(np.arange(0.1, 0.71, 0.05), key=lambda t: _scores(tr["obs"].values, ptr, t)["csi"])
    y = te["obs"].values
    rows = [{"model": "logistic", "threshold": round(float(thr), 2), **_scores(y, p, thr)},
            {"model": "cams_100", "threshold": 100, **_scores(y, te["cams_dust"].values, 100)},
            {"model": "persistence", "threshold": 1, **_scores(y, te["obs_lag1"].values, 1)},
            {"model": "climatology", "threshold": None, "pod": None, "far": None, "csi": None, "auc": 0.5,
             "brier": round(float(np.mean((y - tr["obs"].mean()) ** 2)), 4)}]
    # تقييم CAMS بالاحتمال: الترتيب فقط (AUC) لأن قيمه ليست احتمالات
    con.execute("DELETE FROM dust_eval")
    for r in rows:
        con.execute("""INSERT INTO dust_eval(model, run_at, test_from, test_to, n_train, n_test, n_events, threshold, pod, far, csi, auc, brier)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (r["model"], run_at, te["date"].min().date().isoformat(), te["date"].max().date().isoformat(), len(tr), len(te), int(y.sum()),
                     r["threshold"], r["pod"], r["far"], r["csi"], r["auc"], r["brier"]))
    # النموذج النهائي على كل البيانات
    model.fit(data[DUST_F], data["obs"])
    coef = model.named_steps["logisticregression"].coef_[0]
    con.execute("DELETE FROM dust_coef")
    con.executemany("INSERT INTO dust_coef VALUES (?,?)", [(f, round(float(c), 4)) for f, c in zip(DUST_F, coef)])

    # تطبيقه على الأقضية: آخر 400 يوم + اليومان القادمان من توقعات CAMS والطقس
    out = []
    since = (today - dt.timedelta(days=400)).isoformat()
    for d in D:
        sid = con.execute("SELECT station_id FROM district_stations WHERE district_id = ? AND role = 'now'", (d["id"],)).fetchone()
        sid = sid[0] if sid else None
        df = pd.read_sql_query("""SELECT a.date, a.dust AS cams_dust, a.pm10 AS cams_pm10, w.wind_max, w.rh_mean, w.t_max
                                  FROM air_daily a LEFT JOIN weather_daily w ON w.district_id = a.district_id AND w.date = a.date
                                  WHERE a.district_id = ? AND a.date >= ? ORDER BY a.date""", con, params=(d["id"], since), parse_dates=["date"])
        fc = pd.read_sql_query("""SELECT f.for_date AS date, MAX(CASE WHEN f.target='dust' THEN f.value END) AS cams_dust, MAX(CASE WHEN f.target='pm10' THEN f.value END) AS cams_pm10,
                                         w.wind_max, w.rh_mean, w.t_max
                                  FROM forecasts f LEFT JOIN weather_daily w ON w.district_id = f.district_id AND w.date = f.for_date
                                  WHERE f.district_id = ? AND f.model = 'cams' AND f.target IN ('dust','pm10') AND f.for_date > ? GROUP BY f.for_date ORDER BY f.for_date""",
                               con, params=(d["id"], df["date"].max().date().isoformat() if not df.empty else "0000"), parse_dates=["date"])
        fc["kind"] = "forecast"; df["kind"] = "past"
        df = pd.concat([x for x in (df, fc) if not x.empty], ignore_index=True) if not (df.empty and fc.empty) else df
        if df.empty:
            continue
        obs = {}
        if sid:
            for date, n, dh in con.execute("SELECT date, n_hours, dust_hours FROM station_daily WHERE station_id = ? AND date >= ?", (sid, since)):
                if n is not None and n >= 12:
                    obs[date] = 1.0 if (dh or 0) > 0 else 0.0
        df["obs"] = df["date"].dt.strftime("%Y-%m-%d").map(obs)
        df = _dust_frame(df)
        # يوم بلا رصد سابق معروف: نعوّض الاحتمال المتوقّع لليوم السابق (يحدث لليوم الثاني من التوقع)
        prev = None
        for i, r in df.iterrows():
            x = r[DUST_F].copy()
            if pd.isna(x["obs_lag1"]):
                x["obs_lag1"] = prev if prev is not None else float(np.nanmean(list(obs.values()))) if obs else 0.1
            if x.drop("obs_lag1").isna().any():
                prev = None; continue
            pr = float(model.predict_proba(pd.DataFrame([x.values], columns=DUST_F))[:, 1][0])
            prev = pr
            out.append((d["id"], r["date"].date().isoformat(), round(pr, 3), r["kind"], None if pd.isna(r["cams_dust"]) else round(float(r["cams_dust"]), 1),
                        None if pd.isna(r["obs"]) else int(r["obs"]), run_at))
    con.execute("DELETE FROM dust_prob")
    con.executemany("INSERT OR REPLACE INTO dust_prob VALUES (?,?,?,?,?,?,?)", out)
    con.commit()
    return len(out)
