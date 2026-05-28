from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


DocumentStatus = Literal["uploaded", "indexed", "error"]
AnalysisMode = Literal["standard", "legal_analysis"]


class DocumentMetadata(BaseModel):
    id: str
    filename: str
    document_type: str
    status: DocumentStatus
    size_bytes: int
    created_at: datetime
    updated_at: datetime
    chunk_count: int = 0
    char_count: int = 0
    storage_path: Optional[str] = None
    error_message: Optional[str] = None
    summary: Optional[str] = None
    suggestions: List[str] = Field(default_factory=list)


class DocumentListResponse(BaseModel):
    documents: List[DocumentMetadata]


class UploadResponse(BaseModel):
    document: DocumentMetadata


class Source(BaseModel):
    document_id: str
    document_name: str
    chunk_id: str
    excerpt: str
    score: float = Field(ge=0, le=1)
    relevance_label: str
    badge: str
    page: Optional[int] = None


class ChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    document_ids: Optional[List[str]] = None
    mode: AnalysisMode = "standard"


class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]
    confidence_score: float = Field(ge=0, le=1)
    used_documents: List[str]
    suggested_followups: List[str] = Field(default_factory=list)


class Chunk(BaseModel):
    id: str
    document_id: str
    document_name: str
    text: str
    page: Optional[int] = None
    position: int
