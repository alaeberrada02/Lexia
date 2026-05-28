# LexIA

LexIA est un MVP d'assistant juridique intelligent base sur RAG. L'application permet de charger des documents PDF ou TXT, d'indexer leur texte localement, puis de poser des questions avec reponses sourcees, score de confiance et extraits cites.

## Fonctionnalites

- Upload PDF/TXT avec extraction de texte et decoupage en chunks.
- Index local persistant dans `backend/storage`.
- Recherche RAG sans cle API par scoring lexical et similarite simple.
- Option OpenAI si `OPENAI_API_KEY` est disponible.
- Interface Next.js responsive : sidebar documents, chat central, panneau d'analyse.
- Statuts documents : `uploadé`, `indexé`, `erreur`.
- Historique simple des questions, suggestions automatiques et citations.
- Mode analyse juridique, bouton de resume et visualisation de pertinence.

## Architecture

```txt
backend/
  app/
    main.py
    models.py
    routes/
      chat.py
      documents.py
    services/
      ingestion.py
      rag.py
      storage.py
      text_processing.py
  storage/
    .gitkeep
  requirements.txt

frontend/
  app/
    globals.css
    layout.tsx
    page.tsx
  components/
  lib/
  types/
  package.json
```

## Installation backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

L'API sera disponible sur `http://localhost:8000`.

Endpoints principaux :

- `GET /health`
- `POST /documents/upload`
- `GET /documents`
- `DELETE /documents/{document_id}`
- `POST /chat`

## Installation frontend

```bash
cd frontend
npm install
npm run dev
```

Le frontend sera disponible sur `http://localhost:3000`.

## Variables d'environnement

Frontend :

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Backend optionnel :

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Sans `OPENAI_API_KEY`, LexIA utilise automatiquement son moteur RAG local.

## Commandes de verification

Backend :

```bash
cd backend
python -m compileall app
uvicorn app.main:app --reload --port 8000
```

Frontend :

```bash
cd frontend
npm run lint
npm run build
```

## Stockage local

Les fichiers uploades et les index sont crees dans `backend/storage` :

- `uploads/` : documents originaux
- `documents.json` : metadonnees
- `index.json` : chunks textes
- `stats.json` : statistiques locales

Ces fichiers runtime sont ignores par Git pour eviter de versionner des donnees sensibles ou volumineuses.
