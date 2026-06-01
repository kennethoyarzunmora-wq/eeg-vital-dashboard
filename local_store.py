from __future__ import annotations

import json
import os
import shutil
import sqlite3
import uuid
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


APP_NAME = "EEG Local Analyzer"


def get_data_dir() -> Path:
    base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
    data_dir = Path(base) / APP_NAME
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "imports").mkdir(exist_ok=True)
    (data_dir / "analyses").mkdir(exist_ok=True)
    return data_dir


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class LocalStore:
    def __init__(self, data_dir: Path | None = None) -> None:
        self.data_dir = data_dir or get_data_dir()
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.data_dir / "eeg_cases.sqlite3"
        self.imports_dir = self.data_dir / "imports"
        self.analyses_dir = self.data_dir / "analyses"
        self.imports_dir.mkdir(exist_ok=True)
        self.analyses_dir.mkdir(exist_ok=True)
        self.init_db()

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def init_db(self) -> None:
        with closing(self.connect()) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS cases (
                    id TEXT PRIMARY KEY,
                    patient_code TEXT,
                    procedure_date TEXT,
                    surgery_type TEXT,
                    hospital TEXT,
                    anesthesia_type TEXT,
                    source_file_name TEXT NOT NULL,
                    source_file_path TEXT NOT NULL,
                    analysis_json_path TEXT NOT NULL,
                    comments TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """,
            )
            connection.execute("CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at)")
            connection.execute("CREATE INDEX IF NOT EXISTS idx_cases_patient_code ON cases(patient_code)")
            connection.commit()

    def list_cases(self) -> list[dict[str, Any]]:
        with closing(self.connect()) as connection:
            rows = connection.execute(
                """
                SELECT id, patient_code, procedure_date, surgery_type, hospital, anesthesia_type,
                       source_file_name, comments, created_at, updated_at
                FROM cases
                ORDER BY datetime(created_at) DESC
                """,
            ).fetchall()
        return [dict(row) for row in rows]

    def get_case(self, case_id: str) -> dict[str, Any] | None:
        with closing(self.connect()) as connection:
            row = connection.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
        if row is None:
            return None
        record = dict(row)
        analysis_path = Path(record["analysis_json_path"])
        record["analysis"] = json.loads(analysis_path.read_text(encoding="utf-8")) if analysis_path.exists() else {}
        return record

    def create_case(
        self,
        *,
        source_file: Path,
        analysis: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        case_id = str(uuid.uuid4())
        created_at = now_iso()
        metadata = metadata or {}

        safe_name = source_file.name.replace("/", "_").replace("\\", "_")
        case_import_dir = self.imports_dir / case_id
        case_import_dir.mkdir(parents=True, exist_ok=True)
        stored_file = case_import_dir / safe_name
        shutil.copy2(source_file, stored_file)

        analysis_path = self.analyses_dir / f"{case_id}.json"
        analysis_path.write_text(json.dumps(analysis, ensure_ascii=False, indent=2), encoding="utf-8")

        record = {
            "id": case_id,
            "patient_code": metadata.get("patient_code", ""),
            "procedure_date": metadata.get("procedure_date", ""),
            "surgery_type": metadata.get("surgery_type", ""),
            "hospital": metadata.get("hospital", ""),
            "anesthesia_type": metadata.get("anesthesia_type", ""),
            "source_file_name": source_file.name,
            "source_file_path": str(stored_file),
            "analysis_json_path": str(analysis_path),
            "comments": metadata.get("comments", ""),
            "created_at": created_at,
            "updated_at": created_at,
        }

        with closing(self.connect()) as connection:
            connection.execute(
                """
                INSERT INTO cases (
                    id, patient_code, procedure_date, surgery_type, hospital, anesthesia_type,
                    source_file_name, source_file_path, analysis_json_path, comments, created_at, updated_at
                ) VALUES (
                    :id, :patient_code, :procedure_date, :surgery_type, :hospital, :anesthesia_type,
                    :source_file_name, :source_file_path, :analysis_json_path, :comments, :created_at, :updated_at
                )
                """,
                record,
            )
            connection.commit()
        return {**record, "analysis": analysis}

    def update_comments(self, case_id: str, comments: str) -> dict[str, Any] | None:
        updated_at = now_iso()
        with closing(self.connect()) as connection:
            cursor = connection.execute(
                "UPDATE cases SET comments = ?, updated_at = ? WHERE id = ?",
                (comments, updated_at, case_id),
            )
            connection.commit()
        return self.get_case(case_id) if cursor.rowcount else None

    def delete_case(self, case_id: str) -> bool:
        record = self.get_case(case_id)
        if not record:
            return False
        with closing(self.connect()) as connection:
            connection.execute("DELETE FROM cases WHERE id = ?", (case_id,))
            connection.commit()
        for path_key in ("source_file_path", "analysis_json_path"):
            path = Path(record[path_key])
            if path.exists():
                path.unlink()
        import_dir = self.imports_dir / case_id
        if import_dir.exists():
            shutil.rmtree(import_dir, ignore_errors=True)
        return True
