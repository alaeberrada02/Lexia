from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.models import DocumentListResponse, UploadResponse
from app.services.ingestion import delete_document, ingest_document
from app.services.storage import load_documents

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)) -> UploadResponse:
    try:
        document = await ingest_document(file)
        return UploadResponse(document=document)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible d'indexer ce document pour le moment.",
        ) from exc


@router.get("", response_model=DocumentListResponse)
def list_documents() -> DocumentListResponse:
    documents = sorted(
        load_documents(),
        key=lambda document: document.created_at,
        reverse=True,
    )
    return DocumentListResponse(documents=documents)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_document(document_id: str) -> None:
    if not delete_document(document_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document introuvable.")
