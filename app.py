from __future__ import annotations

import os
from datetime import datetime
from flask import Flask, render_template, request, jsonify, abort, send_file
from storage import init_db, save_analysis, list_analyses, get_analysis
from propertyedge_core import run_propertyedge

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(APP_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "propertyedge.db")
PPD_SQLITE_PATH = os.path.join(DATA_DIR, "ppd.sqlite")  # optional (for sold comps)

os.makedirs(DATA_DIR, exist_ok=True)

app = Flask(__name__)
init_db(DB_PATH)


@app.get("/")
def home():
    rows = list_analyses(DB_PATH, limit=30)
    return render_template("dashboard.html", analyses=rows)


@app.post("/analyze")
def analyze():
    payload = request.get_json(silent=True) or {}
    url = (payload.get("url") or "").strip()
    if not url:
        return jsonify({"ok": False, "error": "Please paste a Rightmove link."}), 400

    # Run analysis
    try:
        result = run_propertyedge(
            url=url,
            ppd_sqlite_path=PPD_SQLITE_PATH if os.path.exists(PPD_SQLITE_PATH) else None,
        )
    except Exception as e:
        return jsonify({"ok": False, "error": f"Analysis failed: {e}"}), 500

    analysis_id = save_analysis(DB_PATH, result)
    result["analysis_id"] = analysis_id
    result["permalink"] = f"/a/{analysis_id}"

    return jsonify({"ok": True, "result": result})


@app.get("/a/<int:analysis_id>")
def analysis_page(analysis_id: int):
    row = get_analysis(DB_PATH, analysis_id)
    if not row:
        abort(404)
    return render_template("analysis.html", row=row)


@app.get("/a/<int:analysis_id>/json")
def analysis_json(analysis_id: int):
    row = get_analysis(DB_PATH, analysis_id)
    if not row:
        abort(404)
    return jsonify({"ok": True, "analysis": row})


@app.get("/a/<int:analysis_id>/md")
def analysis_md(analysis_id: int):
    row = get_analysis(DB_PATH, analysis_id)
    if not row:
        abort(404)

    md = row.get("md_report") or ""
    # Write to a temp file-like response
    from io import BytesIO
    buf = BytesIO(md.encode("utf-8"))
    filename = f"propertyedge_{row.get('property_id') or analysis_id}.md"
    return send_file(buf, as_attachment=True, download_name=filename, mimetype="text/markdown")


if __name__ == "__main__":
    # local dev
    app.run(host="0.0.0.0", port=5050, debug=True)
