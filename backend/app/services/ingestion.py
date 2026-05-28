from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile

from app.models import DocumentMetadata
from app.services.storage import UPLOADS_DIR, append_document, remove_document_storage
from app.services.text_processing import (
    SUPPORTED_EXTENSIONS,
    build_suggestions,
    build_summary,
    chunk_text,
    extract_text_from_file,
)


def _safe_filename(filename: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", filename).strip("._")
    return cleaned or "document"


async def ingest_document(file: UploadFile) -> DocumentMetadata:
    original_name = file.filename or "document"
    extension = Path(original_name).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError("Format non pris en charge. LexIA accepte les fichiers PDF et TXT.")

    content = await file.read()
    if not content:
        raise ValueError("Le fichier envoye est vide.")
    if len(content) > 20 * 1024 * 1024:
        raise ValueError("Fichier trop volumineux. Limite locale conseillee : 20 Mo.")

    document_id = uuid.uuid4().hex
    filename = _safe_filename(original_name)
    storage_path = UPLOADS_DIR / f"{document_id}_{filename}"
    storage_path.write_bytes(content)

    now = datetime.now(timezone.utc)
    try:
        extracted_text, pages = extract_text_from_file(storage_path, extension)
        if len(extracted_text.strip()) < 20:
            raise ValueError("Aucun texte exploitable n'a ete detecte dans ce document.")

        chunks = chunk_text(document_id=document_id, document_name=filename, pages=pages)
        if not chunks:
            raise ValueError("Impossible de creer un index exploitable pour ce document.")

        document = DocumentMetadata(
            id=document_id,
            filename=filename,
            document_type=extension.removeprefix(".").upper(),
            status="indexed",
            size_bytes=len(content),
            created_at=now,
            updated_at=now,
            chunk_count=len(chunks),
            char_count=len(extracted_text),
            storage_path=str(storage_path),
            summary=build_summary(extracted_text),
            suggestions=build_suggestions(extracted_text, filename),
        )
        append_document(document, chunks)
        return document
    except Exception as exc:
        document = DocumentMetadata(
            id=document_id,
            filename=filename,
            document_type=extension.removeprefix(".").upper(),
            status="error",
            size_bytes=len(content),
            created_at=now,
            updated_at=now,
            storage_path=str(storage_path),
            error_message=str(exc),
        )
        append_document(document, [])
        raise


def delete_document(document_id: str) -> bool:
    return remove_document_storage(document_id)
