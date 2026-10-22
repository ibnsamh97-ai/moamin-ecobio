"""تجربة خطوات الأقمار الصناعية على نسخة من القاعدة الحقيقية بميزانية قصيرة."""
import json, sqlite3, sys, time, datetime as dt, traceback, subprocess
from pathlib import Path
sys.path.insert(0, "etl")
subprocess.run("git fetch -q --depth 1 origin db && git show origin/db:ecobio.db.gz > /tmp/e.db.gz && gunzip -f /tmp/e.db.gz && git show origin/db:tigris.json > /tmp/tigris.json", shell=True, check=True)
con = sqlite3.connect("/tmp/e.db")
con.executescript(Path("etl/schema.sql").read_text(encoding="utf-8"))
import satellites as sat
from common import Log
log = Log(con, "probe")
D = [dict(zip([c[0] for c in con.execute("select * from districts").description], r)) for r in con.execute("select * from districts order by ord")]
lines = json.load(open("/tmp/tigris.json"))
for name, fn in (("fires", lambda: sat.fires(con, D, "probe", log, budget=90)), ("ndvi", lambda: sat.ndvi(con, D, "probe", log, budget=90)),
                 ("lst", lambda: sat.river_lst(con, D, lines, "probe", log, budget=90)), ("s5p", lambda: sat.s5p(con, D, "probe", log, budget=120))):
    t = time.time()
    try:
        print(name, fn(), round(time.time() - t, 1), "s", flush=True)
    except Exception:
        print(name, "ERROR", traceback.format_exc(), flush=True)
q = lambda s: con.execute(s).fetchall()
print("fires", q("select count(*), min(date), max(date), sum(near_kind is not null) from fire_pixels"))
print("fires by district", q("select district_id, count(*), round(avg(frp),1) from fire_pixels group by 1"))
print("near", q("select near_kind, near_name, count(*) from fire_pixels where near_kind is not null group by 1,2 order by 3 desc limit 8"))
print("hotspots", q("select * from fire_hotspots limit 8"))
print("ndvi", q("select district_id, count(*), min(date), max(date), round(avg(ndvi),3), round(avg(pct_green),1) from ndvi_16d group by 1"))
print("points", q("select * from river_points"))
print("lst", q("select point_id, count(*), min(date), max(date), round(avg(lst_c),1), min(lst_c), max(lst_c) from river_lst group by 1"))
print("s5p", q("select gas, district_id, count(*), min(date), max(date), round(avg(value),2) from s5p_daily group by 1,2"))
json.dump({"ok": True}, open("probe.json", "w"))
