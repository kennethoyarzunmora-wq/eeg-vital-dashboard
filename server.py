#!/usr/bin/env python3
"""Local web server for direct .vital upload and conversion.

Run this file, open http://127.0.0.1:8765, and upload a .vital file from the
dashboard. Files are processed in a temporary directory and deleted after each
request.
"""

from __future__ import annotations

import argparse
import json
import logging
import tempfile
from pathlib import Path
from traceback import format_exc

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException
import pandas as pd

from local_store import LocalStore
from vital_to_json import convert_payload


ROOT = Path(__file__).resolve().parent
LOG_DIR = ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_PATH = LOG_DIR / "server.log"

logging.basicConfig(
    filename=LOG_PATH,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    encoding="utf-8",
)

app = Flask(__name__, static_folder=str(ROOT), static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024
store = LocalStore()


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "service": "eeg-vital-dashboard"})


@app.get("/api/log")
def read_log():
    if not LOG_PATH.exists():
        return jsonify({"log": ""})
    return jsonify({"log": LOG_PATH.read_text(encoding="utf-8")[-12000:]})


@app.get("/api/cases")
def list_cases():
    return jsonify({"cases": store.list_cases()})


@app.get("/api/cases/<case_id>")
def get_case(case_id):
    record = store.get_case(case_id)
    if record is None:
        return jsonify({"error": "Caso no encontrado."}), 404
    return jsonify(record)


@app.patch("/api/cases/<case_id>/comments")
def update_case_comments(case_id):
    payload = request.get_json(silent=True) or {}
    record = store.update_comments(case_id, str(payload.get("comments", "")))
    if record is None:
        return jsonify({"error": "Caso no encontrado."}), 404
    return jsonify(record)


@app.delete("/api/cases/<case_id>")
def delete_case(case_id):
    if not store.delete_case(case_id):
        return jsonify({"error": "Caso no encontrado."}), 404
    return jsonify({"ok": True})


@app.post("/api/convert-vital")
def convert_vital():
    uploaded = request.files.get("file")
    if uploaded is None or uploaded.filename == "":
        return jsonify({"error": "No se recibio ningun archivo .vital."}), 400

    fs = float(request.form.get("fs", 128))
    interval = float(request.form.get("interval", 1))

    with tempfile.TemporaryDirectory(prefix="eeg_vital_") as temp_dir:
        input_path = Path(temp_dir) / "input.vital"
        uploaded.save(input_path)
        logging.info(
            "Converting file=%s size=%s fs=%s interval=%s",
            uploaded.filename,
            input_path.stat().st_size,
            fs,
            interval,
        )
        payload = convert_payload(input_path, fs=fs, interval=interval)
        logging.info(
            "Converted file=%s time=%s dsa=%s indices=%s",
            uploaded.filename,
            len(payload.get("time", [])),
            bool(payload.get("dsa", {}).get("power")),
            {key: len(value) for key, value in payload.get("indices", {}).items()},
        )

    return jsonify(payload)


@app.post("/api/import-case")
def import_case():
    uploaded = request.files.get("file")
    if uploaded is None or uploaded.filename == "":
        return jsonify({"error": "No se recibio ningun archivo."}), 400

    metadata = parse_case_metadata(request.form.get("metadata"))
    fs = float(request.form.get("fs", 128))
    interval = float(request.form.get("interval", 1))

    with tempfile.TemporaryDirectory(prefix="eeg_case_") as temp_dir:
        input_path = Path(temp_dir) / uploaded.filename
        uploaded.save(input_path)
        payload = convert_input_file(input_path, fs=fs, interval=interval)
        record = store.create_case(source_file=input_path, analysis=payload, metadata=metadata)

    return jsonify(record)


def parse_case_metadata(raw_metadata):
    if not raw_metadata:
        return {}
    try:
        payload = json.loads(raw_metadata)
        return payload if isinstance(payload, dict) else {}
    except json.JSONDecodeError:
        return {}


def convert_input_file(path: Path, fs: float = 128, interval: float = 1):
    suffix = path.suffix.lower()
    if suffix == ".vital":
        return convert_payload(path, fs=fs, interval=interval)
    if suffix == ".json":
        return json.loads(path.read_text(encoding="utf-8"))
    if suffix == ".csv":
        return csv_to_payload(path)
    raise ValueError("Formato no soportado. Usa .vital, .json o .csv.")


def csv_to_payload(path: Path):
    table = pd.read_csv(path)
    lower_columns = {str(column).strip().lower(): column for column in table.columns}
    time_column = lower_columns.get("time") or lower_columns.get("tiempo") or lower_columns.get("minute")
    if time_column is None:
        table.insert(0, "time", range(len(table)))
        time_column = "time"

    def series_for(*names):
        for name in names:
            column = lower_columns.get(name.lower())
            if column is not None:
                values = pd.to_numeric(table[column], errors="coerce")
                return [None if pd.isna(value) else float(value) for value in values]
        return []

    time_values = [float(value) for value in pd.to_numeric(table[time_column], errors="coerce").fillna(0)]
    return {
        "metadata": {
            "patient_id": "anonimized",
            "device": "CSV",
            "dsa_source": "csv",
        },
        "time": time_values,
        "eeg": series_for("eeg", "eeg1", "conox/eeg"),
        "dsa": {"frequencies": [], "times": [], "power": []},
        "indices": {
            "time": time_values,
            "qCON": series_for("qcon", "qCON"),
            "qNOX": series_for("qnox", "qNOX"),
            "BSR": series_for("bsr", "BSR"),
            "EMG": series_for("emg", "EMG"),
            "SQI": series_for("sqi", "SQI"),
        },
        "events": [],
    }


@app.errorhandler(Exception)
def handle_error(error):
    if isinstance(error, HTTPException):
        return jsonify({"error": error.description}), error.code
    logging.error("Unhandled error: %s\n%s", error, format_exc())
    return jsonify({"error": str(error), "log": str(LOG_PATH)}), 500


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the EEG Vital local dashboard server.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8765, type=int)
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
