from __future__ import annotations

import os
from collections import Counter
from dataclasses import dataclass

from app.models import AnalysisMode, ChatResponse, Chunk, Source
from app.services.storage import load_chunks, load_documents, update_stats
from app.services.text_processing import best_sentences, normalize_text, score_tokens, tokenize


@dataclass
class RankedChunk:
    chunk: Chunk
    score: float


def _chunk_score(query: str, query_tokens: list[str], chunk: Chunk) -> float:
    chunk_tokens = score_tokens(chunk.text)
    if not chunk_tokens or not query_tokens:
        return 0.0

    query_counts = Counter(query_tokens)
    overlap = sum(min(query_counts[token], chunk_tokens[token]) for token in query_counts)
    coverage = overlap / max(len(query_counts), 1)
    density = sum(chunk_tokens[token] for token in query_counts) / max(sum(chunk_tokens.values()), 1)

    normalized_chunk = normalize_text(chunk.text)
    phrase_bonus = 0.0
    normalized_query = normalize_text(query)
    if len(normalized_query) > 12 and normalized_query in normalized_chunk:
        phrase_bonus = 0.25

    title_bonus = 0.08 if any(token in normalize_text(chunk.document_name) for token in query_tokens) else 0.0
    raw_score = (coverage * 0.58) + min(density * 8, 0.24) + phrase_bonus + title_bonus
    return min(raw_score, 1.0)


def _search(question: str, document_ids: list[str] | None, top_k: int = 5) -> list[RankedChunk]:
    query_tokens = tokenize(question)
    allowed_ids = set(document_ids) if document_ids is not None else set()
    ranked: list[RankedChunk] = []

    for chunk in load_chunks():
        if document_ids is not None and chunk.document_id not in allowed_ids:
            continue
        score = _chunk_score(question, query_tokens, chunk)
        if score > 0:
            ranked.append(RankedChunk(chunk=chunk, score=score))

    ranked.sort(key=lambda item: item.score, reverse=True)
    return ranked[:top_k]


def _label_for_score(score: float) -> tuple[str, str]:
    if score >= 0.72:
        return "Tres pertinent", "source fiable"
    if score >= 0.45:
        return "Pertinent", "extrait pertinent"
    return "A recouper", "a verifier"


def _sources_from_ranked(ranked_chunks: list[RankedChunk]) -> list[Source]:
    sources: list[Source] = []
    for item in ranked_chunks:
        label, badge = _label_for_score(item.score)
        excerpt = item.chunk.text[:520].strip()
        if len(item.chunk.text) > 520:
            excerpt += "..."
        sources.append(
            Source(
                document_id=item.chunk.document_id,
                document_name=item.chunk.document_name,
                chunk_id=item.chunk.id,
                excerpt=excerpt,
                score=round(item.score, 3),
                relevance_label=label,
                badge=badge,
                page=item.chunk.page,
            )
        )
    return sources


def _confidence(ranked_chunks: list[RankedChunk]) -> float:
    if not ranked_chunks:
        return 0.08

    top = ranked_chunks[0].score
    breadth = min(len({item.chunk.document_id for item in ranked_chunks}) * 0.08, 0.16)
    support = min(len(ranked_chunks) * 0.05, 0.2)
    return round(min(0.95, (top * 0.72) + breadth + support), 2)


def _local_answer(question: str, ranked_chunks: list[RankedChunk], mode: AnalysisMode) -> str:
    if not ranked_chunks:
        return (
            "Je n'ai pas trouve d'element suffisamment probant dans les documents indexes. "
            "Reformulez la question, ciblez un document precis ou ajoutez une piece plus explicite."
        )

    evidence: list[str] = []
    for item in ranked_chunks[:3]:
        sentences = best_sentences(item.chunk.text, question, limit=3)
        for sentence in sentences:
            evidence.append(f"- {sentence} ({item.chunk.document_name})")

    if mode == "legal_analysis":
        return "\n".join(
            [
                "Analyse juridique preliminaire",
                "",
                "Qualification des elements retrouves :",
                evidence[0] if evidence else "- Les documents contiennent des elements partiels.",
                "",
                "Points documentaires utiles :",
                *evidence[1:5],
                "",
                "Vigilance : cette reponse est construite a partir des passages indexes. Verifiez les pieces originales avant decision ou conseil juridique engageant.",
            ]
        )

    return "\n".join(
        [
            "Reponse synthetique",
            "",
            "D'apres les passages les plus pertinents, voici les elements a retenir :",
            *evidence[:5],
            "",
            "Conclusion : la reponse ci-dessus reste limitee aux documents charges dans LexIA et aux extraits cites.",
        ]
    )


def _followups(question: str, ranked_chunks: list[RankedChunk]) -> list[str]:
    if not ranked_chunks:
        return [
            "Quel document dois-je ajouter pour etayer cette question ?",
            "Peux-tu reformuler la question sous forme de points juridiques ?",
        ]

    documents = list(dict.fromkeys(item.chunk.document_name for item in ranked_chunks))
    first_doc = documents[0]
    return [
        f"Quels sont les risques principaux dans {first_doc} ?",
        "Resume les obligations identifiees en tableau.",
        "Quels passages dois-je verifier dans le document original ?",
    ]


def _try_openai_answer(question: str, ranked_chunks: list[RankedChunk], mode: AnalysisMode) -> str | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or not ranked_chunks:
        return None

    try:
        from openai import OpenAI
    except ImportError:
        return None

    context = "\n\n".join(
        f"Source: {item.chunk.document_name}, page {item.chunk.page or 'n/a'}\n{item.chunk.text}"
        for item in ranked_chunks[:5]
    )
    system = (
        "Tu es LexIA, un assistant juridique francophone. Reponds uniquement avec les informations "
        "du contexte fourni, cite les documents, et signale les incertitudes."
    )
    if mode == "legal_analysis":
        system += " Structure la reponse en qualification, points utiles, risques et verification."

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": f"Question: {question}\n\nContexte:\n{context}"},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content


def answer_question(
    question: str,
    document_ids: list[str] | None = None,
    mode: AnalysisMode = "standard",
) -> ChatResponse:
    documents = {document.id: document for document in load_documents()}
    indexed_documents = {doc_id for doc_id, document in documents.items() if document.status == "indexed"}

    if document_ids:
        missing = [doc_id for doc_id in document_ids if doc_id not in documents]
        if missing:
            return ChatResponse(
                answer="Le document selectionne n'existe plus dans l'espace LexIA.",
                sources=[],
                confidence_score=0.0,
                used_documents=[],
                suggested_followups=[],
            )
        target_ids = [doc_id for doc_id in document_ids if doc_id in indexed_documents]
    else:
        target_ids = list(indexed_documents)

    ranked_chunks = _search(question, target_ids, top_k=6)
    sources = _sources_from_ranked(ranked_chunks)
    confidence_score = _confidence(ranked_chunks)

    answer = _try_openai_answer(question, ranked_chunks, mode) or _local_answer(question, ranked_chunks, mode)
    used_documents = list(dict.fromkeys(source.document_name for source in sources))

    update_stats(confidence_score)
    return ChatResponse(
        answer=answer,
        sources=sources,
        confidence_score=confidence_score,
        used_documents=used_documents,
        suggested_followups=_followups(question, ranked_chunks),
    )
