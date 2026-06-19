from __future__ import annotations

import json
import os
from email.parser import BytesParser
from email.policy import default
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STORAGE_ROOT = ROOT / "storage"
MANIFEST_PATH = STORAGE_ROOT / "manifest.json"
MONTH_INDEX_NAME = "index.json"
HOST = "127.0.0.1"
PORT = 8000


class FinanceTrackerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path != "/api/archive":
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
            return

        try:
            content_type = self.headers.get("Content-Type", "")
            content_length = int(self.headers.get("Content-Length", "0"))
            if "multipart/form-data" not in content_type or content_length <= 0:
                self.send_json(
                    {"ok": False, "error": "Expected multipart/form-data upload."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return

            body = self.rfile.read(content_length)
            message = BytesParser(policy=default).parsebytes(
                f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8")
                + body
            )

            metadata = {}
            saved_files = []
            month_dir = None

            for part in message.iter_parts():
                field_name = part.get_param("name", header="content-disposition")
                filename = part.get_filename()
                payload = part.get_payload(decode=True) or b""

                if field_name == "metadata":
                    metadata = json.loads(payload.decode("utf-8") or "{}")
                    continue

                if field_name != "files" or not filename:
                    continue

                month_key = metadata.get("monthKey") or "unknown-month"
                month_dir = STORAGE_ROOT / sanitize_segment(month_key)
                month_dir.mkdir(parents=True, exist_ok=True)

                target = unique_path(month_dir / sanitize_filename(filename))
                target.write_bytes(payload)
                saved_files.append(str(target.relative_to(ROOT)))

            if saved_files:
                append_manifest_entries(metadata, saved_files)
                if month_dir is not None:
                    update_month_index(month_dir, metadata, saved_files)

            self.send_json(
                {
                    "ok": True,
                    "savedFiles": saved_files,
                    "monthKey": metadata.get("monthKey") or "unknown-month",
                }
            )
        except Exception as exc:
            self.send_json(
                {"ok": False, "error": f"Archive failed: {exc}"},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def sanitize_segment(value: str) -> str:
    return "".join(char for char in value if char.isalnum() or char in {"-", "_"}) or "unknown"


def sanitize_filename(filename: str) -> str:
    basename = os.path.basename(filename)
    allowed = {"-", "_", ".", " "}
    return "".join(char for char in basename if char.isalnum() or char in allowed) or "statement.pdf"


def unique_path(path: Path) -> Path:
    if not path.exists():
        return path

    stem = path.stem
    suffix = path.suffix
    counter = 2
    while True:
        candidate = path.with_name(f"{stem}-{counter}{suffix}")
        if not candidate.exists():
            return candidate
        counter += 1


def append_manifest_entries(metadata: dict, saved_files: list[str]):
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    if MANIFEST_PATH.exists():
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    else:
        manifest = []

    for saved_file in saved_files:
        manifest.append(
            {
                "savedFile": saved_file,
                "monthKey": metadata.get("monthKey") or "unknown-month",
                "statementPeriod": metadata.get("statementPeriod") or "",
                "accountNumber": metadata.get("accountNumber") or "",
                "statementKind": metadata.get("statementKind") or "",
                "archivedAt": metadata.get("archivedAt") or "",
            }
        )

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def update_month_index(month_dir: Path, metadata: dict, saved_files: list[str]):
    month_index_path = month_dir / MONTH_INDEX_NAME
    if month_index_path.exists():
        month_index = json.loads(month_index_path.read_text(encoding="utf-8"))
    else:
        month_index = {
            "monthKey": metadata.get("monthKey") or month_dir.name,
            "updatedAt": "",
            "statements": [],
        }

    statements = month_index.setdefault("statements", [])
    statement_record = build_statement_record(metadata, saved_files)
    statement_key = statement_record["statementKey"]

    replaced = False
    for index, existing in enumerate(statements):
        if existing.get("statementKey") == statement_key:
            statements[index] = statement_record
            replaced = True
            break

    if not replaced:
        statements.append(statement_record)

    month_index["updatedAt"] = metadata.get("archivedAt") or ""
    month_index["statements"] = sorted(
        statements,
        key=lambda item: (item.get("statementPeriod") or "", item.get("fileName") or ""),
    )
    month_index_path.write_text(json.dumps(month_index, indent=2), encoding="utf-8")


def build_statement_record(metadata: dict, saved_files: list[str]) -> dict:
    parsed_statement = metadata.get("parsedStatement") or {}
    return {
        "statementKey": metadata.get("statementKey") or "",
        "monthKey": metadata.get("monthKey") or "",
        "archivedAt": metadata.get("archivedAt") or "",
        "fileName": parsed_statement.get("fileName") or "",
        "savedFiles": saved_files,
        "statementPeriod": parsed_statement.get("statementPeriod") or "",
        "statementKind": parsed_statement.get("statementKind") or "",
        "accountHolder": parsed_statement.get("accountHolder") or "",
        "accountType": parsed_statement.get("accountType") or "",
        "accountNumber": parsed_statement.get("accountNumber") or "",
        "openingBalance": parsed_statement.get("openingBalance") or 0,
        "closingBalance": parsed_statement.get("closingBalance") or 0,
        "totalInflow": parsed_statement.get("totalInflow") or 0,
        "totalOutflow": parsed_statement.get("totalOutflow") or 0,
        "serviceFees": parsed_statement.get("serviceFees") or 0,
        "transactions": parsed_statement.get("transactions") or [],
    }


def main():
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), FinanceTrackerHandler)
    print(f"My Personal Finance Tracker server running at http://{HOST}:{PORT}")
    print(f"Archiving uploads under {STORAGE_ROOT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
