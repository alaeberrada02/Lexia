"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AnalysisPanel } from "@/components/AnalysisPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { Sidebar } from "@/components/Sidebar";
import { deleteDocument, getDocuments, sendChat, uploadDocument } from "@/lib/api";
import { makeId } from "@/lib/utils";
import type { AnalysisMode, ChatMessage, DocumentMetadata, Source } from "@/types/api";

function createInitialMessage(): ChatMessage {
  return {
    id: makeId("assistant-welcome"),
    role: "assistant",
    content:
      "Bonjour, je suis LexIA. Chargez un contrat, une note ou un texte juridique, puis interrogez-le avec des réponses sourcées.",
    createdAt: new Date().toISOString(),
  };
}

const defaultSuggestions = [
  "Quels sont les points juridiques essentiels ?",
  "Quels risques dois-je vérifier en priorité ?",
  "Résume le document en 5 points.",
  "Quelles obligations ressortent des passages indexés ?",
];

export default function Home() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createInitialMessage()]);
  const [mode, setMode] = useState<AnalysisMode>("standard");
  const [documentQuery, setDocumentQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const latestSources = useMemo<Source[]>(() => {
    const latestAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.sources?.length);
    return latestAssistant?.sources ?? [];
  }, [messages]);

  const history = useMemo(
    () =>
      messages
        .filter((message) => message.role === "user")
        .map((message) => message.content)
        .reverse(),
    [messages],
  );

  const suggestions = useMemo(() => {
    const selected = documents.filter((document) => selectedDocumentIds.includes(document.id));
    const fromDocuments = selected.flatMap((document) => document.suggestions ?? []);
    const pool = fromDocuments.length ? fromDocuments : documents.flatMap((document) => document.suggestions ?? []);
    return Array.from(new Set([...pool, ...defaultSuggestions])).slice(0, 6);
  }, [documents, selectedDocumentIds]);

  const loadDocuments = useCallback(async () => {
    try {
      const response = await getDocuments();
      setDocuments(response.documents);
      setSelectedDocumentIds((current) => {
        const indexedIds = response.documents
          .filter((document) => document.status === "indexed")
          .map((document) => document.id);
        const stillValid = current.filter((id) => indexedIds.includes(id));
        return stillValid.length ? stillValid : indexedIds.slice(0, 1);
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Backend LexIA indisponible.",
      });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocuments();
  }, [loadDocuments]);

  function flash(type: "success" | "error", message: string) {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 4600);
  }

  async function handleUpload(file: File) {
    setIsUploading(true);
    try {
      const response = await uploadDocument(file);
      await loadDocuments();
      setSelectedDocumentIds([response.document.id]);
      flash("success", `${response.document.filename} est indexé.`);
    } catch (error) {
      flash("error", error instanceof Error ? error.message : "Upload impossible.");
      await loadDocuments();
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(documentId: string) {
    try {
      await deleteDocument(documentId);
      setSelectedDocumentIds((current) => current.filter((id) => id !== documentId));
      await loadDocuments();
      flash("success", "Document supprimé.");
    } catch (error) {
      flash("error", error instanceof Error ? error.message : "Suppression impossible.");
    }
  }

  function toggleDocument(documentId: string) {
    setSelectedDocumentIds((current) => {
      if (current.includes(documentId)) {
        return current.filter((id) => id !== documentId);
      }
      return [...current, documentId];
    });
  }

  function selectAllDocuments() {
    const indexedIds = documents.filter((document) => document.status === "indexed").map((document) => document.id);
    setSelectedDocumentIds(indexedIds);
  }

  function startNewChat() {
    if (isAsking) return;
    setMessages([createInitialMessage()]);
    flash("success", "Nouveau chat créé. Les documents restent disponibles.");
  }

  async function ask(question: string) {
    if (!question.trim() || isAsking) return;

    const userMessage: ChatMessage = {
      id: makeId("user"),
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };
    const pendingMessage: ChatMessage = {
      id: makeId("assistant-pending"),
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setIsAsking(true);
    setMessages((current) => [...current, userMessage, pendingMessage]);

    try {
      const activeIndexedIds = selectedDocumentIds.filter((id) =>
        documents.some((document) => document.id === id && document.status === "indexed"),
      );
      const response = await sendChat({
        question,
        document_ids: activeIndexedIds.length ? activeIndexedIds : undefined,
        mode,
      });

      setMessages((current) =>
        current.map((message) =>
          message.id === pendingMessage.id
            ? {
                ...message,
                content: response.answer,
                pending: false,
                sources: response.sources,
                confidenceScore: response.confidence_score,
                usedDocuments: response.used_documents,
              }
            : message,
        ),
      );
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingMessage.id
            ? {
                ...message,
                content:
                  "Je n'arrive pas à joindre le backend LexIA. Vérifiez que FastAPI tourne sur http://localhost:8000.",
                pending: false,
                sources: [],
                confidenceScore: 0,
              }
            : message,
        ),
      );
      flash("error", error instanceof Error ? error.message : "Question impossible.");
    } finally {
      setIsAsking(false);
    }
  }

  async function summarizeSelectedDocument() {
    const selectedDocument = documents.find(
      (document) => selectedDocumentIds.includes(document.id) && document.status === "indexed",
    );
    if (!selectedDocument) {
      flash("error", "Sélectionnez un document indexé.");
      return;
    }
    await ask(`Résume le document ${selectedDocument.filename} en 5 points juridiques avec les passages à vérifier.`);
  }

  return (
    <main className="legal-grid min-h-screen bg-[#f7f5f0] text-[#172033]">
      <div className="mx-auto grid min-h-screen max-w-[1800px] grid-cols-1 bg-white/[0.35] lg:grid-cols-[290px_minmax(0,1fr)_320px] xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <Sidebar
          documents={documents}
          selectedDocumentIds={selectedDocumentIds}
          onToggleDocument={toggleDocument}
          onSelectAll={selectAllDocuments}
          onDeleteDocument={handleDelete}
          onUpload={handleUpload}
          isUploading={isUploading}
          query={documentQuery}
          onQueryChange={setDocumentQuery}
          history={history}
        />

        <ChatPanel
          messages={messages}
          suggestions={suggestions}
          onAsk={ask}
          onNewChat={startNewChat}
          isAsking={isAsking}
        />

        <div className="xl:block">
          <AnalysisPanel
            documents={documents}
            messages={messages}
            latestSources={latestSources}
            mode={mode}
            onModeChange={setMode}
            onSummarize={summarizeSelectedDocument}
            isAsking={isAsking}
          />
        </div>
      </div>

      <AnimatePresence>
        {notice ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-5 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-[#ded8ce] bg-white p-3 shadow-xl"
          >
            <div className="flex items-start gap-3">
              {notice.type === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#156348]" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              )}
              <p className="text-sm font-medium text-[#172033]">{notice.message}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
