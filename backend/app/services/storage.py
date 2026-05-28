from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.models import Chunk, DocumentMetadata

BASE_DIR = Path(__file__).resolve().parents[2]
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
DOCUMENTS_FILE = STORAGE_DIR / "documents.json"
INDEX_FILE = STORAGE_DIR / "index.json"
STATS_FILE = STORAGE_DIR / "stats.json"


def ensure_storage() -> None:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    for path, default in (
        (DOCUMENTS_FILE, []),
        (INDEX_FILE, []),
        (STATS_FILE, {"questions_asked": 0, "confidence_total": 0.0}),
    ):
        if not path.exists():
            path.write_text(json.dumps(default, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_json(path: Path, default: Any) -> Any:
    ensure_storage()
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return default


def _write_json(path: Path, payload: Any) -> None:
    ensure_storage()
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str), encoding="utf-8")


def load_documents() -> list[DocumentMetadata]:
    return [DocumentMetadata.model_validate(item) for item in _read_json(DOCUMENTS_FILE, [])]


def save_documents(documents: list[DocumentMetadata]) -> None:
    _write_json(DOCUMENTS_FILE, [document.model_dump(mode="json") for document in documents])


def load_chunks() -> list[Chunk]:
    return [Chunk.model_validate(item) for item in _read_json(INDEX_FILE, [])]


def save_chunks(chunks: list[Chunk]) -> None:
    _write_json(INDEX_FILE, [chunk.model_dump(mode="json") for chunk in chunks])


def append_document(document: DocumentMetadata, chunks: list[Chunk]) -> None:
    documents = [item for item in load_documents() if item.id != document.id]
    documents.append(document)
    save_documents(documents)

    existing_chunks = [chunk for chunk in load_chunks() if chunk.document_id != document.id]
    existing_chunks.extend(chunks)
    save_chunks(existing_chunks)


def remove_document_storage(document_id: str) -> bool:
    documents = load_documents()
    target = next((document for document in documents if document.id == document_id), None)
    if target is None:
        return False

    save_documents([document for document in documents if document.id != document_id])
    save_chunks([chunk for chunk in load_chunks() if chunk.document_id != document_id])

    if target.storage_path:
        path = Path(target.storage_path)
        if path.exists() and path.is_file():
            path.unlink()

    return True


def update_stats(confidence_score: float) -> None:
    stats = _read_json(STATS_FILE, {"questions_asked": 0, "confidence_total": 0.0})
    stats["questions_asked"] = int(stats.get("questions_asked", 0)) + 1
    stats["confidence_total"] = float(stats.get("confidence_total", 0.0)) + confidence_score
    _write_json(STATS_FILE, stats)
