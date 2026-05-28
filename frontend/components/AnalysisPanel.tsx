"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpenCheck,
  Brain,
  FileText,
  Gauge,
  Loader2,
  Scale,
  Sparkles,
} from "lucide-react";

import { StatCard } from "@/components/StatCard";
import { cn, percent } from "@/lib/utils";
import type { AnalysisMode, ChatMessage, DocumentMetadata, Source } from "@/types/api";

type AnalysisPanelProps = {
  documents: DocumentMetadata[];
  messages: ChatMessage[];
  latestSources: Source[];
  mode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  onSummarize: () => Promise<void>;
  isAsking: boolean;
};

function averageConfidence(messages: ChatMessage[]) {
  const scores = messages
    .map((message) => message.confidenceScore)
    .filter((score): score is number => typeof score === "number");
  if (!scores.length) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function badgeClass(badge: string) {
  if (badge.includes("fiable")) return "bg-[#e9f5ef] text-[#156348] ring-[#ccecdf]";
  if (badge.includes("pertinent")) return "bg-[#fff1d6] text-[#945f09] ring-[#f3d08c]";
  return "bg-[#f3e8ff] text-[#6d3a9c] ring-[#e0c4f5]";
}

export function AnalysisPanel({
  documents,
  messages,
  latestSources,
  mode,
  onModeChange,
  onSummarize,
  isAsking,
}: AnalysisPanelProps) {
  const indexedDocuments = documents.filter((document) => document.status === "indexed");
  const questionsAsked = messages.filter((message) => message.role === "user").length;
  const confidence = averageConfidence(messages);

  return (
    <aside className="flex min-h-0 flex-col border-l border-[#ded8ce] bg-white/[0.92] px-4 py-5 backdrop-blur lg:h-screen">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#6f7888]">Analyse</h2>
          <p className="mt-1 text-lg font-semibold text-[#172033]">Dossier actif</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0ebe2] text-[#14213d]">
          <Brain className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <StatCard
          label="Index"
          value={`${indexedDocuments.length}`}
          detail="documents prêts pour la recherche"
          icon={BookOpenCheck}
          tone="emerald"
        />
        <StatCard
          label="Questions"
          value={`${questionsAsked}`}
          detail="requêtes posées dans cette session"
          icon={BarChart3}
          tone="navy"
        />
        <StatCard
          label="Confiance"
          value={confidence ? percent(confidence) : "--"}
          detail="moyenne des réponses sourcées"
          icon={Gauge}
          tone="amber"
        />
      </div>

      <div className="mt-5 rounded-lg border border-[#ded8ce] bg-[#fbfaf7] p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
          <Scale className="h-4 w-4 text-[#156348]" />
          Mode analyse juridique
        </div>
        <div className="mt-3 grid grid-cols-2 rounded-lg border border-[#ded8ce] bg-white p-1">
          {[
            { label: "Standard", value: "standard" as const },
            { label: "Analyse", value: "legal_analysis" as const },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onModeChange(item.value)}
              className={cn(
                "h-9 rounded-md text-xs font-semibold transition",
                mode === item.value ? "bg-[#14213d] text-white" : "text-[#596273] hover:bg-[#f2eee7]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={isAsking || indexedDocuments.length === 0}
        onClick={() => void onSummarize()}
        className="mt-3 flex h-11 items-center justify-center gap-2 rounded-lg bg-[#172033] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#24314a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Résumer le document
      </button>

      <div className="mt-5 min-h-0 flex-1">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#b36b1e]" />
          <h3 className="text-sm font-semibold text-[#172033]">Pertinence des sources</h3>
        </div>

        <div className="lexia-scrollbar max-h-[46vh] space-y-3 overflow-y-auto pr-1">
          {latestSources.length === 0 ? (
            <div className="rounded-lg border border-[#ded8ce] bg-[#fbfaf7] p-4 text-sm leading-6 text-[#6f7888]">
              Les citations apparaîtront ici après une question.
            </div>
          ) : (
            latestSources.map((source, index) => (
              <motion.div
                key={source.chunk_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-lg border border-[#ded8ce] bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#172033]">{source.document_name}</p>
                    <p className="mt-1 text-xs text-[#6f7888]">
                      {source.page ? `Page ${source.page}` : "Document"} · {source.relevance_label}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1", badgeClass(source.badge))}>
                    {source.badge}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[#efe8dc]">
                  <div
                    className="h-2 rounded-full bg-[#156348]"
                    style={{ width: `${Math.max(8, Math.round(source.score * 100))}%` }}
                  />
                </div>
                <p className="mt-3 line-clamp-3 text-xs leading-5 text-[#596273]">{source.excerpt}</p>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
