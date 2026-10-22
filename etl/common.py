"""أدوات مشتركة لخط البيانات: طلبات HTTP مع إعادة المحاولة، السجل، وكتابة الصفوف."""
from __future__ import annotations

import datetime as dt
import json
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

UA = "EcoBio-AI/1.0 (+https://github.com/ibnsamh97-ai/moamin-ecobio; academic, Tikrit University)"
ROOT = Path(__file__).resolve().parent.parent


def utcnow() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def today() -> dt.date:
    return dt.datetime.now(dt.timezone.utc).date()


def http_json(url: str, params: dict | None = None, data: bytes | None = None, headers: dict | None = None,
              tries: int = 4, timeout: int = 90):
    """GET/POST يعيد JSON، ويعيد المحاولة عند أخطاء الشبكة و429 و5xx."""
    if params:
        url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(params, safe=",:")
    h = {"User-Agent": UA, "Accept": "application/json"}
    if headers:
        h.update(headers)
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=h)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:400]
            last = RuntimeError(f"HTTP {e.code}: {body}")
            if e.code in (400, 401, 403, 404):
                raise last
        except Exception as e:  # شبكة أو مهلة
            last = e
        time.sleep(2 * (i + 1) ** 2)
    raise last


class Log:
    """يسجّل كل خطوة في جدول etl_log وفي الطرفية."""

    def __init__(self, con: sqlite3.Connection, run_at: str):
        self.con, self.run_at, self.lines = con, run_at, []

    def write(self, step: str, status: str, rows: int | None = None, seconds: float | None = None, message: str = ""):
        self.con.execute("INSERT INTO etl_log(run_at, step, status, rows, seconds, message) VALUES (?,?,?,?,?,?)",
                         (self.run_at, step, status, rows, round(seconds or 0, 2), message[:2000]))
        self.con.commit()
        line = f"[{status:5}] {step:28} rows={rows if rows is not None else '-':>7} {seconds or 0:7.1f}s  {message}"
        self.lines.append(line)
        print(line, flush=True)

    def step(self, name: str):
        log = self

        class _Step:
            def __enter__(self):
                self.t = time.time(); self.rows = 0; self.msg = ""; self.status = "ok"
                return self

            def __exit__(self, et, ev, tb):
                if ev is not None:
                    log.write(name, "error", self.rows, time.time() - self.t, f"{type(ev).__name__}: {ev}")
                    return True  # لا نوقف خط البيانات كله بسبب مصدر واحد
                log.write(name, self.status, self.rows, time.time() - self.t, self.msg)
                return False

        return _Step()


def upsert(con: sqlite3.Connection, table: str, rows: list[dict]) -> int:
    if not rows:
        return 0
    cols = list(rows[0].keys())
    sql = f"INSERT OR REPLACE INTO {table} ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})"
    con.executemany(sql, [tuple(r.get(c) for c in cols) for r in rows])
    con.commit()
    return len(rows)


def max_date(con: sqlite3.Connection, table: str, district_id: str, col: str = "date"):
    r = con.execute(f"SELECT MAX({col}) FROM {table} WHERE district_id = ?", (district_id,)).fetchone()
    return r[0] if r and r[0] else None
