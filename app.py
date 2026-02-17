from __future__ import annotations

import os
import traceback
from datetime import datetime
from flask import Flask, render_template, request, jsonify, abort, send_file
from storage import init_db, save_analysis, list_analyses, get_analysis
from propertyscorecard_core import run_propertyscorecard

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(APP_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "propertyscorecard.db")
PPD_SQLITE_PATH = os.path.join(DATA_DIR, "ppd.sqlite")  # optional (for sold comps)

os.makedirs(DATA_DIR, exist_ok=True)

app = Flask(__name__)
app.config['DEBUG'] = True
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

    # Validate URL format
    if "rightmove.co.uk" not in url.lower():
        return jsonify({"ok": False, "error": "Please provide a valid Rightmove URL."}), 400

    # Run analysis
    try:
        print(f"[DEBUG] Starting analysis for URL: {url}")
        result = run_propertyscorecard(
            url=url,
            ppd_sqlite_path=PPD_SQLITE_PATH if os.path.exists(PPD_SQLITE_PATH) else None,
        )
        print(f"[DEBUG] Analysis completed successfully")
        print(f"[DEBUG] Result keys: {result.keys()}")
        print(f"[DEBUG] Facts: {result.get('facts', {})}")
    except Exception as e:
        error_msg = str(e)
        error_trace = traceback.format_exc()
        print(f"[ERROR] Analysis failed: {error_msg}")
        print(f"[ERROR] Traceback:\n{error_trace}")
        return jsonify({"ok": False, "error": f"Analysis failed: {error_msg}", "trace": error_trace}), 500

    try:
        analysis_id = save_analysis(DB_PATH, result)
        result["analysis_id"] = analysis_id
        result["permalink"] = f"/a/{analysis_id}"
    except Exception as e:
        print(f"[ERROR] Failed to save analysis: {e}")
        # Still return the result even if save fails
        result["analysis_id"] = None
        result["permalink"] = None

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
    filename = f"propertyscorecard_{row.get('property_id') or analysis_id}.md"
    return send_file(buf, as_attachment=True, download_name=filename, mimetype="text/markdown")


if __name__ == "__main__":
    # local dev
    print(f"[INFO] Starting Property Scorecard server...")
    print(f"[INFO] Data directory: {DATA_DIR}")
    print(f"[INFO] Database path: {DB_PATH}")
    print(f"[INFO] PPD SQLite exists: {os.path.exists(PPD_SQLITE_PATH)}")
    app.run(host="0.0.0.0", port=5050, debug=True)
