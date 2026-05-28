"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  Scale,
  Search,
  Trash2,
} from "lucide-react";

import { DocumentDropzone } from "@/components/DocumentDropzone";
import { StatusBadge } from "@/components/StatusBadge";
import { cn, formatBytes, shortDate } from "@/lib/utils";
import type { DocumentMetadata } from "@/types/api";

type SidebarProps = {
  documents: DocumentMetadata[];
  selectedDocumentIds: string[];
  onToggleDocument: (documentId: string) => void;
  onSelectAll: () => void;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  history: string[];
};

export function Sidebar({
  documents,
  selectedDocumentIds,
  onToggleDocument,
  onSelectAll,
  onDeleteDocument,
  onUpload,
  isUploading,
  query,
  onQueryChange,
  history,
}: SidebarProps) {
  const filteredDocuments = documents.filter((document) =>
    document.filename.toLowerCase().includes(query.toLowerCase()),
  );
  const indexedCount = documents.filter((document) => document.status === "indexed").length;

  return (
    <aside className="flex min-h-0 flex-col border-r border-[#ded8ce] bg-white/[0.92] px-4 py-5 backdrop-blur">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#14213d] text-white shadow-sm">
          <Scale className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-[#172033]">LexIA</h1>
          <p className="text-xs text-[#6f7888]">Assistant juridique RAG</p>
        </div>
      </div>

      <nav className="mb-5 grid grid-cols-3 gap-2">
        {[
          { label: "Espace", icon: LayoutDashboard, active: true },
          { label: "Docs", icon: FolderOpen, active: false },
          { label: "Questions", icon: History, active: false },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-semibold transition",
                item.active
                  ? "border-[#14213d] bg-[#14213d] text-white"
                  : "border-[#ded8ce] bg-[#fbfaf7] text-[#596273] hover:border-[#b8aea0]",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <DocumentDropzone onUpload={onUpload} isUploading={isUploading} />

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#172033]">Documents</h2>
          <p className="text-xs text-[#6f7888]">{indexedCount} indexé(s)</p>
        </div>
        <button
          type="button"
          onClick={onSelectAll}
          className="rounded-lg border border-[#ded8ce] px-3 py-2 text-xs font-semibold text-[#172033] transition hover:bg-[#f2eee7]"
        >
          Tous
        </button>
      </div>

      <label className="mt-3 flex h-10 items-center gap-2 rounded-lg border border-[#ded8ce] bg-[#fbfaf7] px-3 text-sm text-[#596273]">
        <Search className="h-4 w-4" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Rechercher"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8a93a3]"
        />
      </label>

      <div className="lexia-scrollbar mt-3 min-h-[180px] flex-1 space-y-2 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {filteredDocuments.length === 0 ? (
            <motion.div
              key="empty-documents"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-[#ded8ce] bg-[#fbfaf7] p-4 text-sm text-[#6f7888]"
            >
              Aucun document chargé.
            </motion.div>
          ) : (
            filteredDocuments.map((document) => {
              const isSelected = selectedDocumentIds.includes(document.id);
              return (
                <motion.div
                  key={document.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={cn(
                    "rounded-lg border bg-white p-3 shadow-sm transition",
                    isSelected ? "border-[#156348] ring-2 ring-[#ccecdf]" : "border-[#ded8ce]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onToggleDocument(document.id)}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0ebe2] text-[#14213d]">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#172033]">{document.filename}</span>
                      <span className="mt-1 block text-xs text-[#6f7888]">
                        {document.chunk_count} blocs · {formatBytes(document.size_bytes)}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={document.status} />
                        <span className="text-[11px] text-[#8a93a3]">{shortDate(document.created_at)}</span>
                      </span>
                    </span>
                  </button>

                  {document.status === "error" && document.error_message ? (
                    <p className="mt-2 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700">
                      {document.error_message}
                    </p>
                  ) : null}

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void onDeleteDocument(document.id)}
                      aria-label={`Supprimer ${document.filename}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[#8a4b4b] transition hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 border-t border-[#ded8ce] pt-4">
        <h2 className="text-sm font-semibold text-[#172033]">Historique</h2>
        <div className="mt-2 space-y-2">
          {history.length === 0 ? (
            <p className="rounded-lg bg-[#fbfaf7] px-3 py-2 text-xs text-[#6f7888]">Aucune question posée.</p>
          ) : (
            history.slice(0, 3).map((item) => (
              <p key={item} className="truncate rounded-lg bg-[#fbfaf7] px-3 py-2 text-xs text-[#596273]">
                {item}
              </p>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
