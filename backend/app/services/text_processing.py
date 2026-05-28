from __future__ import annotations

import re
import unicodedata
from collections import Counter
from pathlib import Path

from pypdf import PdfReader

from app.models import Chunk

SUPPORTED_EXTENSIONS = {".pdf", ".txt"}

STOPWORDS = {
    "a",
    "afin",
    "ai",
    "ainsi",
    "alors",
    "au",
    "aucun",
    "aux",
    "avec",
    "ce",
    "ces",
    "cet",
    "cette",
    "comme",
    "dans",
    "de",
    "des",
    "du",
    "elle",
    "en",
    "est",
    "et",
    "etre",
    "fait",
    "il",
    "ils",
    "la",
    "le",
    "les",
    "leur",
    "lors",
    "mais",
    "ne",
    "ou",
    "par",
    "pas",
    "plus",
    "pour",
    "qu",
    "que",
    "qui",
    "sa",
    "sans",
    "se",
    "selon",
    "ses",
    "son",
    "sur",
    "un",
    "une",
    "aux",
    "vos",
    "votre",
}


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.lower())
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def tokenize(value: str) -> list[str]:
    normalized = normalize_text(value)
    return [
        token
        for token in re.findall(r"[a-z0-9]{2,}", normalized)
        if token not in STOPWORDS and not token.isdigit()
    ]


def extract_text_from_file(path: Path, extension: str) -> tuple[str, list[tuple[int | None, str]]]:
    if extension == ".txt":
        text = path.read_text(encoding="utf-8", errors="ignore")
        return text, [(None, text)]

    if extension == ".pdf":
        reader = PdfReader(str(path))
        pages: list[tuple[int | None, str]] = []
        for page_number, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text() or ""
            pages.append((page_number, page_text))
        return "\n\n".join(page_text for _, page_text in pages), pages

    raise ValueError("Format non pris en charge. Merci d'envoyer un PDF ou un TXT.")


def chunk_text(
    document_id: str,
    document_name: str,
    pages: list[tuple[int | None, str]],
    chunk_size: int = 950,
    overlap: int = 180,
) -> list[Chunk]:
    chunks: list[Chunk] = []
    position = 0

    for page_number, page_text in pages:
        clean_text = re.sub(r"\s+", " ", page_text).strip()
        if not clean_text:
            continue

        start = 0
        while start < len(clean_text):
            end = min(start + chunk_size, len(clean_text))
            if end < len(clean_text):
                punctuation = max(
                    clean_text.rfind(".", start, end),
                    clean_text.rfind(";", start, end),
                    clean_text.rfind("\n", start, end),
                )
                if punctuation > start + 300:
                    end = punctuation + 1

            chunk_value = clean_text[start:end].strip()
            if chunk_value:
                chunks.append(
                    Chunk(
                        id=f"{document_id}-{position}",
                        document_id=document_id,
                        document_name=document_name,
                        text=chunk_value,
                        page=page_number,
                        position=position,
                    )
                )
                position += 1

            if end >= len(clean_text):
                break
            start = max(0, end - overlap)

    return chunks


def score_tokens(text: str) -> Counter[str]:
    return Counter(tokenize(text))


def best_sentences(text: str, query: str, limit: int = 3) -> list[str]:
    query_tokens = set(tokenize(query))
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", text)
        if len(sentence.strip()) > 35
    ]
    if not sentences:
        return [text[:320].strip()]

    ranked = sorted(
        sentences,
        key=lambda sentence: len(query_tokens.intersection(tokenize(sentence))),
        reverse=True,
    )
    return ranked[:limit]


def build_summary(text: str) -> str:
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", re.sub(r"\s+", " ", text))
        if len(sentence.strip()) > 45
    ]
    if not sentences:
        return "Document indexe. Aucun resume automatique disponible faute de texte exploitable."

    selected = sentences[:3]
    return " ".join(selected)[:900]


def build_suggestions(text: str, filename: str) -> list[str]:
    tokens = [token for token, _ in score_tokens(text).most_common(8)]
    subject = filename.rsplit(".", 1)[0].replace("_", " ")

    suggestions = [
        f"Quels sont les points juridiques essentiels de {subject} ?",
        f"Quels risques ou obligations ressortent de {subject} ?",
        f"Resume ce document en 5 points actionnables.",
    ]
    if tokens:
        suggestions.append(f"Que dit le document a propos de {', '.join(tokens[:3])} ?")
    return suggestions[:4]
