from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import chat, documents
from app.services.storage import ensure_storage

app = FastAPI(
    title="LexIA API",
    description="Assistant juridique intelligent local base sur RAG.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(chat.router)


@app.on_event("startup")
def on_startup() -> None:
    ensure_storage()


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "LexIA API is running", "status": "ok"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "lexia-backend"}
