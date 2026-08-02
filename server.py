from __future__ import annotations

import json
import os
import re
import shutil
import sqlite3
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from email.parser import BytesParser
from email.policy import default
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STORAGE_ROOT = ROOT / "storage"
MANIFEST_PATH = STORAGE_ROOT / "manifest.json"
MONTH_INDEX_NAME = "index.json"
DATABASE_PATH = STORAGE_ROOT / "finance.db"
BACKUP_ROOT = STORAGE_ROOT / "backups"
HOST = "127.0.0.1"
PORT = 8000


class FinanceTrackerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path == "/api/data":
            try:
                self.send_json(load_database_snapshot())
            except Exception as exc:
                self.send_json(
                    {"ok": False, "error": f"Database read failed: {exc}"},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return

        if self.path == "/api/database/status":
            try:
                self.send_json(get_database_status())
            except Exception as exc:
                self.send_json(
                    {"ok": False, "error": f"Database check failed: {exc}"},
                    status=HTTPStatus.INTERNAL_SERVER_ERROR,
                )
            return

        super().do_GET()

    def do_POST(self):
        if self.path == "/api/data":
            self.save_data_snapshot()
            return

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
            uploaded_files = []
            saved_files = []

            for part in message.iter_parts():
                field_name = part.get_param("name", header="content-disposition")
                filename = part.get_filename()
                payload = part.get_payload(decode=True) or b""

                if field_name == "metadata":
                    metadata = json.loads(payload.decode("utf-8") or "{}")
                    continue

                if field_name == "files" and filename:
                    uploaded_files.append((filename, payload))

            # FormData sends the file before the metadata in this app. Wait until
            # every multipart field has been read before choosing a month folder.
            month_key = get_archive_month_key(metadata)
            metadata["monthKey"] = month_key
            month_dir = STORAGE_ROOT / sanitize_segment(month_key)
            for filename, payload in uploaded_files:
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
                    "monthKey": month_key,
                }
            )
        except Exception as exc:
            self.send_json(
                {"ok": False, "error": f"Archive failed: {exc}"},
                status=HTTPStatus.INTERNAL_SERVER_ERROR,
            )

    def save_data_snapshot(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0 or content_length > 50 * 1024 * 1024:
                self.send_json(
                    {"ok": False, "error": "Expected a JSON snapshot no larger than 50 MB."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return

            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            statements = payload.get("statements")
            budgets = payload.get("budgets")
            if not isinstance(statements, list) or not isinstance(budgets, list):
                self.send_json(
                    {"ok": False, "error": "Statements and budgets must be arrays."},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return

            result = save_database_snapshot(statements, budgets)
            self.send_json(result)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            self.send_json(
                {"ok": False, "error": f"Invalid JSON snapshot: {exc}"},
                status=HTTPStatus.BAD_REQUEST,
            )
        except Exception as exc:
            self.send_json(
                {"ok": False, "error": f"Database save failed: {exc}"},
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


def get_archive_month_key(metadata: dict) -> str:
    parsed_statement = metadata.get("parsedStatement") or {}
    end_date = clean_iso_date(parsed_statement.get("statementEndDate"))
    if not end_date:
        _, end_date = parse_statement_period(
            parsed_statement.get("statementPeriod") or metadata.get("statementPeriod") or ""
        )
    if end_date:
        return end_date[:7]

    requested_month = str(metadata.get("monthKey") or "")
    if re.fullmatch(r"20\d{2}-(0[1-9]|1[0-2])", requested_month):
        return requested_month
    return "unknown-month"


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


def month_key_from_filename(filename: str) -> str:
    match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", filename)
    if not match:
        return ""
    try:
        return date.fromisoformat(match.group(1)).strftime("%Y-%m")
    except ValueError:
        return ""


def reorganize_unknown_month_archives() -> dict:
    """Move dated PDFs out of the legacy unknown-month folder without deleting files."""
    unknown_dir = STORAGE_ROOT / "unknown-month"
    if not unknown_dir.exists():
        return {"moved": 0, "unmatched": [], "months": []}

    manifest = []
    if MANIFEST_PATH.exists():
        try:
            manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            manifest = []

    moved_paths = {}
    unmatched = []
    months = set()
    for source in sorted(unknown_dir.glob("*.pdf")):
        month_key = month_key_from_filename(source.name)
        if not month_key:
            matching_entries = [
                item for item in manifest
                if Path(item.get("savedFile") or "").name == source.name
            ]
            month_key = next(
                (
                    get_archive_month_key({
                        "monthKey": item.get("monthKey"),
                        "statementPeriod": item.get("statementPeriod"),
                    })
                    for item in matching_entries
                    if get_archive_month_key({
                        "monthKey": item.get("monthKey"),
                        "statementPeriod": item.get("statementPeriod"),
                    }) != "unknown-month"
                ),
                "",
            )
        if not month_key:
            unmatched.append(source.name)
            continue

        destination_dir = STORAGE_ROOT / month_key
        destination_dir.mkdir(parents=True, exist_ok=True)
        destination = unique_path(destination_dir / source.name)
        source_relative = str(source.relative_to(ROOT))
        shutil.move(str(source), destination)
        moved_paths[source_relative] = str(destination.relative_to(ROOT))
        months.add(month_key)

    manifest_changed = False
    for item in manifest:
        saved_file = str(item.get("savedFile") or "")
        if saved_file in moved_paths:
            item["savedFile"] = moved_paths[saved_file]
            item["monthKey"] = Path(moved_paths[saved_file]).parent.name
            manifest_changed = True
    if manifest_changed:
        MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    legacy_index_moved = migrate_legacy_unknown_month_index(unknown_dir, moved_paths)
    if not unmatched and unknown_dir.exists() and not any(unknown_dir.iterdir()):
        unknown_dir.rmdir()

    return {
        "moved": len(moved_paths),
        "unmatched": unmatched,
        "months": sorted(months),
        "legacyIndexMoved": legacy_index_moved,
    }


def migrate_legacy_unknown_month_index(unknown_dir: Path, moved_paths: dict[str, str]) -> bool:
    index_path = unknown_dir / MONTH_INDEX_NAME
    if not index_path.exists():
        return False
    try:
        legacy_index = json.loads(index_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return False

    statements_by_month: dict[str, list[dict]] = {}
    for statement in legacy_index.get("statements", []):
        if not isinstance(statement, dict):
            continue
        month_key = get_archive_month_key({"parsedStatement": statement})
        if month_key == "unknown-month":
            continue
        normalized_statement = dict(statement)
        normalized_statement["monthKey"] = month_key
        normalized_statement["savedFiles"] = [
            moved_paths.get(str(saved_file), str(saved_file))
            for saved_file in statement.get("savedFiles", [])
        ]
        statements_by_month.setdefault(month_key, []).append(normalized_statement)

    for month_key, statements in statements_by_month.items():
        month_dir = STORAGE_ROOT / month_key
        month_dir.mkdir(parents=True, exist_ok=True)
        target_index = month_dir / MONTH_INDEX_NAME
        if target_index.exists():
            try:
                month_index = json.loads(target_index.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                month_index = {"monthKey": month_key, "updatedAt": "", "statements": []}
        else:
            month_index = {"monthKey": month_key, "updatedAt": "", "statements": []}

        merged = {
            statement.get("statementKey"): statement
            for statement in month_index.get("statements", [])
            if statement.get("statementKey")
        }
        for statement in statements:
            statement_key = statement.get("statementKey")
            if statement_key:
                merged[statement_key] = statement
        month_index["updatedAt"] = datetime.now(timezone.utc).isoformat()
        month_index["statements"] = sorted(
            merged.values(),
            key=lambda item: (item.get("statementPeriod") or "", item.get("fileName") or ""),
        )
        target_index.write_text(json.dumps(month_index, indent=2), encoding="utf-8")

    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    archive_path = BACKUP_ROOT / "legacy-unknown-month-index.json"
    if archive_path.exists():
        archive_path = unique_path(archive_path)
    shutil.move(str(index_path), archive_path)
    return True


def remove_missing_manifest_entries() -> dict:
    """Remove only manifest records whose archived file is already absent."""
    if not MANIFEST_PATH.exists():
        return {"removed": 0, "backup": None}
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    existing_entries = []
    missing_entries = []
    for entry in manifest:
        saved_file = str(entry.get("savedFile") or "")
        if saved_file and (ROOT / saved_file).is_file():
            existing_entries.append(entry)
        else:
            missing_entries.append(entry)
    if not missing_entries:
        return {"removed": 0, "backup": None}

    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = BACKUP_ROOT / f"manifest-{timestamp}-before-reconciliation.json"
    shutil.copy2(MANIFEST_PATH, backup_path)
    MANIFEST_PATH.write_text(json.dumps(existing_entries, indent=2), encoding="utf-8")
    return {"removed": len(missing_entries), "backup": str(backup_path.relative_to(ROOT))}


def normalize_archive_filename(value: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", Path(value).stem.casefold()).split())


def rebuild_month_indexes_from_database() -> dict:
    """Recreate month indexes from SQLite and the PDFs that currently exist on disk."""
    snapshot = load_database_snapshot()
    statements_by_month: dict[str, list[dict]] = {}
    unmatched_statements = []

    for statement in snapshot["statements"]:
        month_key = clean_iso_date(statement.get("statementEndDate"))[:7]
        if not month_key:
            _, end_date = parse_statement_period(statement.get("statementPeriod") or "")
            month_key = end_date[:7] if end_date else ""
        if not month_key:
            unmatched_statements.append(str(statement.get("fileName") or statement.get("id") or "statement"))
            continue

        month_dir = STORAGE_ROOT / month_key
        expected_name = normalize_archive_filename(statement.get("fileName") or "")
        matching_files = [
            pdf for pdf in month_dir.glob("*.pdf")
            if normalize_archive_filename(pdf.name) == expected_name
        ]
        if not matching_files:
            unmatched_statements.append(str(statement.get("fileName") or statement.get("id") or "statement"))
            continue

        saved_files = [str(pdf.relative_to(ROOT)) for pdf in sorted(matching_files)]
        statements_by_month.setdefault(month_key, []).append(
            {
                "statementKey": str(statement.get("id") or build_statement_key_from_record(statement)),
                "monthKey": month_key,
                "indexedAt": datetime.now(timezone.utc).isoformat(),
                "fileName": matching_files[0].name,
                "savedFiles": saved_files,
                "statementPeriod": statement.get("statementPeriod") or "",
                "statementStartDate": statement.get("statementStartDate") or "",
                "statementEndDate": statement.get("statementEndDate") or "",
                "statementKind": statement.get("statementKind") or "",
                "accountHolder": statement.get("accountHolder") or "",
                "accountType": statement.get("accountType") or "",
                "accountNumber": statement.get("accountNumber") or "",
                "openingBalance": statement.get("openingBalance") or 0,
                "closingBalance": statement.get("closingBalance") or 0,
                "totalInflow": statement.get("totalInflow") or 0,
                "totalOutflow": statement.get("totalOutflow") or 0,
                "serviceFees": statement.get("serviceFees") or 0,
                "transactions": statement.get("transactions") or [],
            }
        )

    month_keys = set(statements_by_month)
    month_keys.update(
        directory.name for directory in STORAGE_ROOT.glob("20??-??") if directory.is_dir()
    )
    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_paths = []
    rebuilt = {}
    for month_key in sorted(month_keys):
        month_dir = STORAGE_ROOT / month_key
        month_dir.mkdir(parents=True, exist_ok=True)
        index_path = month_dir / MONTH_INDEX_NAME
        if index_path.exists():
            backup_path = BACKUP_ROOT / f"{month_key}-index-{timestamp}-before-rebuild.json"
            shutil.copy2(index_path, backup_path)
            backup_paths.append(str(backup_path.relative_to(ROOT)))
        records = sorted(
            statements_by_month.get(month_key, []),
            key=lambda item: (item["statementEndDate"], item["fileName"]),
        )
        index_path.write_text(
            json.dumps(
                {
                    "monthKey": month_key,
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                    "statements": records,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        rebuilt[month_key] = len(records)

    return {
        "months": rebuilt,
        "unmatchedStatements": unmatched_statements,
        "backups": backup_paths,
    }


def build_statement_key_from_record(statement: dict) -> str:
    return "::".join(
        str(statement.get(field) or "")
        for field in ("fileName", "statementPeriod", "accountNumber", "statementKind")
    )


def connect_database() -> sqlite3.Connection:
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA synchronous = FULL")
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


def initialize_database():
    with connect_database() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                account_type TEXT NOT NULL,
                masked_account_number TEXT NOT NULL,
                UNIQUE(name, account_type, masked_account_number)
            );

            CREATE TABLE IF NOT EXISTS statements (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL REFERENCES accounts(id),
                file_name TEXT NOT NULL,
                statement_period TEXT NOT NULL,
                statement_start_date TEXT NOT NULL DEFAULT '',
                statement_end_date TEXT NOT NULL DEFAULT '',
                opening_balance_cents INTEGER NOT NULL DEFAULT 0,
                closing_balance_cents INTEGER NOT NULL DEFAULT 0,
                payload_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                statement_id TEXT NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
                transaction_date TEXT NOT NULL,
                posting_date TEXT NOT NULL,
                description TEXT NOT NULL,
                amount_cents INTEGER NOT NULL,
                category TEXT NOT NULL,
                flow_type TEXT NOT NULL,
                payload_json TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_transactions_statement
                ON transactions(statement_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_date
                ON transactions(transaction_date);
            CREATE INDEX IF NOT EXISTS idx_transactions_category
                ON transactions(category);

            CREATE TABLE IF NOT EXISTS budgets (
                id TEXT PRIMARY KEY,
                start_month TEXT NOT NULL,
                payload_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )
        ensure_column(connection, "statements", "statement_start_date", "TEXT NOT NULL DEFAULT ''")
        ensure_column(connection, "statements", "statement_end_date", "TEXT NOT NULL DEFAULT ''")
        ensure_column(connection, "transactions", "data_quality", "TEXT NOT NULL DEFAULT 'verified'")


def ensure_column(connection: sqlite3.Connection, table: str, column: str, definition: str):
    existing_columns = {row[1] for row in connection.execute(f"PRAGMA table_info({table})")}
    if column not in existing_columns:
        connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def checkpoint_database() -> tuple[int, int, int]:
    """Merge committed WAL pages into finance.db for backups and file viewers."""
    with sqlite3.connect(DATABASE_PATH, timeout=10) as connection:
        connection.execute("PRAGMA busy_timeout = 10000")
        result = connection.execute("PRAGMA wal_checkpoint(TRUNCATE)").fetchone()
    return tuple(result)


def money_to_cents(value) -> int:
    try:
        if value is None or value == "":
            return 0
        amount = Decimal(str(value).replace(",", "").replace("$", "").strip())
        if not amount.is_finite():
            return 0
        return int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    except (InvalidOperation, TypeError, ValueError):
        return 0


def has_valid_money(value) -> bool:
    try:
        amount = Decimal(str(value).replace(",", "").replace("$", "").strip())
        return amount.is_finite()
    except (InvalidOperation, TypeError, ValueError):
        return False


def stable_id(prefix: str, *parts) -> str:
    import hashlib

    value = "::".join(str(part or "") for part in parts)
    return f"{prefix}-{hashlib.sha256(value.encode('utf-8')).hexdigest()[:24]}"


def normalize_identity_text(value) -> str:
    return " ".join(str(value or "").strip().casefold().split())


def clean_duplicate_name_suffix(value) -> str:
    """Remove OS/browser duplicate suffixes such as ' (1)' from account labels."""
    return re.sub(r"\s+\([1-9]\d{0,2}\)$", "", str(value or "").strip())


MONTH_NUMBERS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
    "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}


def clean_iso_date(value) -> str:
    if not value:
        return ""
    try:
        return date.fromisoformat(str(value).strip()).isoformat()
    except ValueError:
        return ""


def parse_period_date(value: str, fallback_year: int | None = None) -> date | None:
    cleaned = re.sub(r"\s+", " ", str(value or "").strip()).replace(",", "")
    if not cleaned:
        return None
    try:
        return date.fromisoformat(cleaned)
    except ValueError:
        pass

    numeric_match = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", cleaned)
    if numeric_match:
        month, day_number, year = map(int, numeric_match.groups())
        year = 2000 + year if year < 100 else year
        try:
            return date(year, month, day_number)
        except ValueError:
            return None

    text_match = re.fullmatch(r"([A-Za-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?", cleaned)
    if not text_match:
        return None
    month_name, day_number, explicit_year = text_match.groups()
    month = MONTH_NUMBERS.get(month_name.casefold())
    year = int(explicit_year) if explicit_year else fallback_year
    if not month or not year:
        return None
    try:
        return date(year, month, int(day_number))
    except ValueError:
        return None


def parse_statement_period(value: str) -> tuple[str, str]:
    """Parse common RBC ranges into ISO start/end dates without guessing missing years."""
    raw = re.sub(r"\s+", " ", str(value or "").strip())
    parts = re.split(r"\s+(?:to|-)\s+", raw, maxsplit=1, flags=re.IGNORECASE)
    if len(parts) != 2:
        return "", ""
    end_date = parse_period_date(parts[1])
    start_date = parse_period_date(parts[0], end_date.year if end_date else None)
    if not start_date or not end_date:
        return "", ""
    if start_date > end_date:
        # A statement crossing New Year may omit the start year.
        if not re.search(r"\b\d{4}\b", parts[0]) and start_date.month > end_date.month:
            start_date = date(end_date.year - 1, start_date.month, start_date.day)
        else:
            return "", ""
    return start_date.isoformat(), end_date.isoformat()


def format_statement_period(start_date: str, end_date: str, fallback: str) -> str:
    if not start_date or not end_date:
        return str(fallback or "").strip()
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    return f"{start.strftime('%b')} {start.day}, {start.year} to {end.strftime('%b')} {end.day}, {end.year}"


def normalize_statement_payload(statement: dict) -> tuple[dict, str, str]:
    payload = dict(statement)
    raw_period = str(payload.get("statementPeriod") or "").strip()
    existing_start = clean_iso_date(payload.get("statementStartDate"))
    existing_end = clean_iso_date(payload.get("statementEndDate"))
    start_date, end_date = parse_statement_period(raw_period)
    if not (start_date and end_date):
        start_date, end_date = existing_start, existing_end
    if start_date and end_date:
        normalized_period = format_statement_period(start_date, end_date, raw_period)
        if raw_period and raw_period != normalized_period:
            payload["statementPeriodRaw"] = payload.get("statementPeriodRaw") or raw_period
        payload["statementPeriod"] = normalized_period
        payload["statementStartDate"] = start_date
        payload["statementEndDate"] = end_date
    else:
        payload["statementPeriod"] = raw_period or "Period not found"
        payload["statementStartDate"] = ""
        payload["statementEndDate"] = ""
    return payload, start_date, end_date


def normalize_transaction_payload(transaction: dict) -> tuple[dict, str]:
    payload = dict(transaction)
    payload["description"] = " ".join(str(payload.get("description") or "").split())
    payload["category"] = str(payload.get("category") or "Undecided").strip() or "Undecided"
    payload["flowType"] = str(payload.get("flowType") or "").strip().casefold()
    if payload["flowType"] not in {"charge", "credit"}:
        raise ValueError("Every transaction must have a flow type of 'charge' or 'credit'.")
    if not payload["description"]:
        raise ValueError("Every transaction must have a description.")
    if not has_valid_money(payload.get("amount")):
        raise ValueError("Every transaction must have a valid numeric amount.")
    payload["isoDate"] = clean_iso_date(payload.get("isoDate"))
    payload["postingIsoDate"] = clean_iso_date(payload.get("postingIsoDate"))
    quality = "verified" if payload["isoDate"] else "missing_transaction_date"
    if not payload["postingIsoDate"]:
        quality = f"{quality};posting_date_not_provided"
    return payload, quality


def build_account_names(statements: list) -> dict[int, str]:
    grouped_names: dict[tuple[str, str], list[str]] = {}
    statement_groups: dict[int, tuple[str, str]] = {}

    for index, statement in enumerate(statements):
        if not isinstance(statement, dict):
            continue
        raw_name = str(statement.get("cardLabel") or statement.get("accountHolder") or "Account").strip()
        account_type = normalize_identity_text(statement.get("accountType") or statement.get("statementKind"))
        account_number = normalize_identity_text(statement.get("accountNumber"))
        has_account_number = bool(account_number and account_number != "unavailable")
        group_key = (
            account_type,
            account_number if has_account_number else normalize_identity_text(clean_duplicate_name_suffix(raw_name)),
        )
        statement_groups[index] = group_key
        grouped_names.setdefault(group_key, []).append(raw_name)

    canonical_by_group = {}
    for group_key, names in grouped_names.items():
        cleaned_names = [clean_duplicate_name_suffix(name) for name in names]
        canonical_by_group[group_key] = min(cleaned_names, key=lambda name: (len(name), name.casefold())) or "Account"

    return {
        index: canonical_by_group[group_key]
        for index, group_key in statement_groups.items()
    }


def create_daily_backup(connection: sqlite3.Connection) -> str | None:
    existing_count = connection.execute("SELECT COUNT(*) FROM statements").fetchone()[0]
    if existing_count == 0:
        return None

    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    backup_path = BACKUP_ROOT / f"finance-{today}.db"
    if backup_path.exists():
        return str(backup_path.relative_to(ROOT))

    with sqlite3.connect(backup_path) as destination:
        connection.backup(destination)
    return str(backup_path.relative_to(ROOT))


def save_database_snapshot(statements: list, budgets: list) -> dict:
    initialize_database()
    normalized_statements = []
    statement_dates = []
    for statement in statements:
        if not isinstance(statement, dict):
            raise ValueError("Every statement must be an object.")
        normalized_statement, start_date, end_date = normalize_statement_payload(statement)
        normalized_statements.append(normalized_statement)
        statement_dates.append((start_date, end_date))
    account_names = build_account_names(normalized_statements)
    with connect_database() as connection:
        backup_path = create_daily_backup(connection)
        connection.execute("BEGIN IMMEDIATE")
        try:
            connection.execute("DELETE FROM transactions")
            connection.execute("DELETE FROM statements")
            connection.execute("DELETE FROM accounts")
            connection.execute("DELETE FROM budgets")

            transaction_count = 0
            for statement_index, statement in enumerate(normalized_statements):
                statement_start_date, statement_end_date = statement_dates[statement_index]

                statement_id = str(statement.get("id") or stable_id(
                    "statement", statement.get("fileName"), statement.get("statementPeriod"), statement_index
                ))
                account_name = account_names.get(statement_index, "Account")
                account_type = str(statement.get("accountType") or statement.get("statementKind") or "")
                account_number = str(statement.get("accountNumber") or "Unavailable")
                normalized_account_number = normalize_identity_text(account_number)
                if normalized_account_number and normalized_account_number != "unavailable":
                    account_id = stable_id("account", normalize_identity_text(account_type), normalized_account_number)
                else:
                    account_id = stable_id(
                        "account", normalize_identity_text(account_type), normalize_identity_text(account_name)
                    )

                connection.execute(
                    "INSERT OR IGNORE INTO accounts(id, name, account_type, masked_account_number) VALUES (?, ?, ?, ?)",
                    (account_id, account_name, account_type, account_number),
                )
                statement_payload = dict(statement)
                if statement_payload.get("cardLabel"):
                    statement_payload["cardLabel"] = account_name
                statement_transactions = statement_payload.pop("transactions", []) or []
                connection.execute(
                    """
                    INSERT INTO statements(
                        id, account_id, file_name, statement_period,
                        statement_start_date, statement_end_date,
                        opening_balance_cents, closing_balance_cents, payload_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        statement_id,
                        account_id,
                        str(statement.get("fileName") or ""),
                        str(statement.get("statementPeriod") or ""),
                        statement_start_date,
                        statement_end_date,
                        money_to_cents(statement.get("openingBalance")),
                        money_to_cents(statement.get("closingBalance")),
                        json.dumps(statement_payload, separators=(",", ":")),
                    ),
                )

                for transaction_index, transaction in enumerate(statement_transactions):
                    if not isinstance(transaction, dict):
                        raise ValueError("Every transaction must be an object.")
                    transaction, data_quality = normalize_transaction_payload(transaction)
                    transaction_id = str(transaction.get("id") or stable_id(
                        "transaction", statement_id, transaction.get("isoDate"),
                        transaction.get("description"), transaction_index
                    ))
                    connection.execute(
                        """
                        INSERT INTO transactions(
                            id, statement_id, transaction_date, posting_date,
                            description, amount_cents, category, flow_type, data_quality, payload_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            transaction_id,
                            statement_id,
                            str(transaction.get("isoDate") or ""),
                            str(transaction.get("postingIsoDate") or ""),
                            str(transaction.get("description") or ""),
                            money_to_cents(transaction.get("amount")),
                            str(transaction.get("category") or "Undecided"),
                            str(transaction.get("flowType") or "charge"),
                            data_quality,
                            json.dumps(transaction, separators=(",", ":")),
                        ),
                    )
                    transaction_count += 1

            for budget_index, budget in enumerate(budgets):
                if not isinstance(budget, dict):
                    raise ValueError("Every budget must be an object.")
                budget_id = str(budget.get("id") or stable_id("budget", budget.get("startMonth"), budget_index))
                connection.execute(
                    "INSERT INTO budgets(id, start_month, payload_json) VALUES (?, ?, ?)",
                    (budget_id, str(budget.get("startMonth") or ""), json.dumps(budget, separators=(",", ":"))),
                )

            saved_at = datetime.now(timezone.utc).isoformat()
            connection.execute(
                "INSERT OR REPLACE INTO app_metadata(key, value) VALUES ('last_saved_at', ?)",
                (saved_at,),
            )
            connection.commit()
        except Exception:
            connection.rollback()
            raise

    checkpoint_result = checkpoint_database()

    return {
        "ok": True,
        "statementCount": len(statements),
        "transactionCount": transaction_count,
        "budgetCount": len(budgets),
        "savedAt": saved_at,
        "backupPath": backup_path,
        "checkpoint": checkpoint_result,
    }


def load_database_snapshot() -> dict:
    initialize_database()
    with connect_database() as connection:
        statement_rows = connection.execute(
            "SELECT id, payload_json FROM statements ORDER BY rowid"
        ).fetchall()
        transaction_rows = connection.execute(
            "SELECT statement_id, payload_json FROM transactions ORDER BY rowid"
        ).fetchall()
        budgets = [json.loads(row["payload_json"]) for row in connection.execute(
            "SELECT payload_json FROM budgets ORDER BY start_month, rowid"
        )]
        last_saved_row = connection.execute(
            "SELECT value FROM app_metadata WHERE key = 'last_saved_at'"
        ).fetchone()

    transactions_by_statement = {}
    for row in transaction_rows:
        transactions_by_statement.setdefault(row["statement_id"], []).append(json.loads(row["payload_json"]))

    statements = []
    for row in statement_rows:
        statement = json.loads(row["payload_json"])
        statement["id"] = statement.get("id") or row["id"]
        statement["transactions"] = transactions_by_statement.get(row["id"], [])
        statements.append(statement)

    return {
        "ok": True,
        "statements": statements,
        "budgets": budgets,
        "empty": not statements and not budgets,
        "lastSavedAt": last_saved_row["value"] if last_saved_row else None,
    }


def get_database_status() -> dict:
    initialize_database()
    with connect_database() as connection:
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        foreign_key_errors = [dict(row) for row in connection.execute("PRAGMA foreign_key_check")]
        counts = {
            table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in ("accounts", "statements", "transactions", "budgets")
        }
        statement_date_quality = {
            "withStartAndEnd": connection.execute(
                "SELECT COUNT(*) FROM statements WHERE statement_start_date <> '' AND statement_end_date <> ''"
            ).fetchone()[0],
            "missingEitherDate": connection.execute(
                "SELECT COUNT(*) FROM statements WHERE statement_start_date = '' OR statement_end_date = ''"
            ).fetchone()[0],
        }
        transaction_date_quality = {
            row["data_quality"]: row["count"]
            for row in connection.execute(
                "SELECT data_quality, COUNT(*) AS count FROM transactions GROUP BY data_quality"
            )
        }
    return {
        "ok": integrity == "ok" and not foreign_key_errors,
        "integrity": integrity,
        "foreignKeyErrors": foreign_key_errors,
        "counts": counts,
        "statementDateQuality": statement_date_quality,
        "transactionDateQuality": transaction_date_quality,
        "databasePath": str(DATABASE_PATH.relative_to(ROOT)),
    }


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
        key=lambda item: (item.get("statementEndDate") or item.get("statementPeriod") or "", item.get("fileName") or ""),
    )
    month_index_path.write_text(json.dumps(month_index, indent=2), encoding="utf-8")


def build_statement_record(metadata: dict, saved_files: list[str]) -> dict:
    parsed_statement, statement_start_date, statement_end_date = normalize_statement_payload(
        metadata.get("parsedStatement") or {}
    )
    return {
        "statementKey": metadata.get("statementKey") or "",
        "monthKey": metadata.get("monthKey") or "",
        "archivedAt": metadata.get("archivedAt") or "",
        "fileName": parsed_statement.get("fileName") or "",
        "savedFiles": saved_files,
        "statementPeriod": parsed_statement.get("statementPeriod") or "",
        "statementStartDate": statement_start_date,
        "statementEndDate": statement_end_date,
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
    initialize_database()
    checkpoint_database()
    server = ThreadingHTTPServer((HOST, PORT), FinanceTrackerHandler)
    print(f"My Personal Finance Tracker server running at http://{HOST}:{PORT}")
    print(f"Archiving uploads under {STORAGE_ROOT}")
    print(f"SQLite database: {DATABASE_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
