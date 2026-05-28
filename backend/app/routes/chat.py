from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.models import ChatRequest, ChatResponse
from app.services.rag import answer_question

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question vide.")

    return answer_question(question=question, document_ids=request.document_ids, mode=request.mode)
