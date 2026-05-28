"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ChevronRight,
  FileSearch,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { cn, percent } from "@/lib/utils";
import type { ChatMessage, Source } from "@/types/api";

type ChatPanelProps = {
  messages: ChatMessage[];
  suggestions: string[];
  onAsk: (question: string) => Promise<void>;
  isAsking: boolean;
};

function SourcePill({ source }: { source: Source }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#ded8ce] bg-[#fbfaf7] px-3 py-1 text-xs font-medium text-[#596273]">
      <FileSearch className="h-3.5 w-3.5 shrink-0 text-[#156348]" />
      <span className="truncate">{source.document_name}</span>
      <span className="shrink-0 text-[#156348]">{percent(source.score)}</span>
    </span>
  );
}

function AssistantSources({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {sources.slice(0, 3).map((source) => (
          <SourcePill key={source.chunk_id} source={source} />
        ))}
      </div>
      <div className="space-y-2">
        {sources.slice(0, 2).map((source) => (
          <details key={`${source.chunk_id}-detail`} className="rounded-lg border border-[#e6e0d7] bg-white/80 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-[#172033]">
              Citation · {source.document_name}
              {source.page ? ` · p. ${source.page}` : ""}
            </summary>
            <p className="mt-2 text-xs leading-5 text-[#596273]">{source.excerpt}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#14213d] text-white">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}

      <article
        className={cn(
          "max-w-[820px] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm",
          isUser
            ? "bg-[#14213d] text-white"
            : "border border-[#ded8ce] bg-white text-[#273248]",
        )}
      >
        {message.pending ? (
          <div className="flex items-center gap-2 text-[#596273]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyse des passages pertinents...
          </div>
        ) : (
          <div className="whitespace-pre-line">{message.content}</div>
        )}

        {!isUser && typeof message.confidenceScore === "number" ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#e9f5ef] px-3 py-1 text-xs font-semibold text-[#156348]">
              confiance {percent(message.confidenceScore)}
            </span>
            {message.usedDocuments?.map((document) => (
              <span key={document} className="rounded-full bg-[#f3e8ff] px-3 py-1 text-xs font-semibold text-[#6d3a9c]">
                {document}
              </span>
            ))}
          </div>
        ) : null}

        {!isUser && message.sources ? <AssistantSources sources={message.sources} /> : null}
      </article>

      {isUser ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0ebe2] text-[#172033]">
          <User className="h-4 w-4" />
        </div>
      ) : null}
    </motion.div>
  );
}

export function ChatPanel({ messages, suggestions, onAsk, isAsking }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const visibleSuggestions = useMemo(() => suggestions.slice(0, 4), [suggestions]);

  async function submitQuestion() {
    const question = input.trim();
    if (!question || isAsking) return;
    setInput("");
    await onAsk(question);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitQuestion();
  }

  return (
    <section className="flex min-h-[680px] flex-col bg-[#f7f5f0] lg:h-screen">
      <header className="border-b border-[#ded8ce] bg-white/[0.88] px-5 py-4 backdrop-blur lg:px-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ded8ce] bg-[#fbfaf7] px-3 py-1 text-xs font-semibold text-[#596273]">
              <Sparkles className="h-3.5 w-3.5 text-[#b36b1e]" />
              Mode RAG local
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-[#172033]">Workspace juridique</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6f7888]">
              Les réponses s&apos;appuient sur les passages retrouvés dans vos documents indexés.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[#ded8ce] bg-[#fbfaf7] px-3 py-2 text-xs font-semibold text-[#596273]">
            <MessageSquarePlus className="h-4 w-4 text-[#156348]" />
            Conversation locale
          </div>
        </div>
      </header>

      <div className="lexia-scrollbar flex-1 overflow-y-auto px-5 py-5 lg:px-7">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <div key={message.id} className="mb-5">
              <MessageBubble message={message} />
            </div>
          ))}
        </AnimatePresence>
      </div>

      <div className="border-t border-[#ded8ce] bg-white/92 px-5 py-4 backdrop-blur lg:px-7">
        {visibleSuggestions.length > 0 ? (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {visibleSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={isAsking}
                onClick={() => void onAsk(suggestion)}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-[#ded8ce] bg-[#fbfaf7] px-3 text-xs font-semibold text-[#596273] transition hover:border-[#156348] hover:text-[#156348] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex items-end gap-3 rounded-lg border border-[#cfc7bb] bg-[#fbfaf7] p-2 shadow-sm">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submitQuestion();
              }
            }}
            rows={1}
            placeholder="Posez une question sur vos documents..."
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-[#172033] outline-none placeholder:text-[#8a93a3]"
          />
          <button
            type="submit"
            disabled={isAsking || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#156348] text-white shadow-sm transition hover:bg-[#104c38] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Envoyer"
          >
            {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </section>
  );
}
