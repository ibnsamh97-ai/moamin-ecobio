"""استيراد بحوث جامعة تكريت المنشورة من js/data-research.js (المصدر الوحيد للحقيقة) إلى جداول القاعدة."""
from __future__ import annotations

import json
import subprocess

from common import ROOT
from geo import km

# ربط كل بحث بالقضاء الذي جرت فيه الدراسة (ناحية العلم تابعة لقضاء تكريت)
STUDY_DISTRICTS = {
    "tikrit-2023": ["tikrit"],
    "baiji-2025": ["baiji"],
    "maryam-baiji-2015": ["baiji"],
    "maryam-treat-2012": ["baiji"],
    "balad-2022": ["balad"],
    "alalam-2018": ["tikrit"],
    "salahuddin-wqi-2023": [],  # أربع محطات على مستوى المحافظة لم يحدد البحث أقضيتها
}

JS = """
global.window = { ECO: { util: {} } }; global.ECO = window.ECO;
require(process.argv[1]);
process.stdout.write(JSON.stringify(window.ECO.RESEARCH));
"""


def load_research():
    out = subprocess.run(["node", "-e", JS, str(ROOT / "js" / "data-research.js")], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def rows(districts):
    R = load_research()
    studies, links, values = [], [], []
    for r in R:
        studies.append({"id": r["id"], "title": r.get("title"), "authors": r.get("authors"), "journal": r.get("journal"), "volume": r.get("vol"),
                        "year": r.get("year"), "doi": r.get("doi"), "url": r.get("url"), "place": r.get("place"), "medium": r.get("medium"),
                        "period": r.get("period"), "summary": r.get("summary")})
        ds = STUDY_DISTRICTS.get(r["id"])
        if ds is None and r.get("lat") is not None:
            near = min(districts, key=lambda d: km(r["lat"], r["lon"], d["lat"], d["lon"]))
            ds = [near["id"]] if km(r["lat"], r["lon"], near["lat"], near["lon"]) <= 25 else []
        links += [{"study_id": r["id"], "district_id": d} for d in (ds or [])]
        for g in r.get("ranges") or []:
            for stat in ("min", "max"):
                if _num(g.get(stat)) is not None:
                    values.append({"study_id": r["id"], "table_id": "ranges", "item": g.get("label") or g.get("k"), "col": g.get(stat + "At"),
                                   "stat": stat, "value": _num(g.get(stat)), "unit": g.get("unit"), "note": None})
        for t in r.get("tables") or []:
            cols = t.get("cols") or []
            for row in t.get("rows") or []:
                item = row[0]
                for c, v in zip(cols, row[1:]):
                    if _num(v) is not None:
                        values.append({"study_id": r["id"], "table_id": t.get("id"), "item": str(item), "col": str(c), "stat": "value",
                                       "value": _num(v), "unit": t.get("unit"), "note": t.get("title")})
    return studies, links, values
