"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileUp, Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

type DocumentDropzoneProps = {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
};

export function DocumentDropzone({ onUpload, isUploading }: DocumentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    await onUpload(file);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        void handleFiles(event.dataTransfer.files);
      }}
      className={cn(
        "relative overflow-hidden rounded-lg border border-dashed p-4 transition",
        isDragging ? "border-[#156348] bg-[#edf8f2]" : "border-[#cfc7bb] bg-[#fbfaf7]",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files)}
      />

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#14213d] text-white">
          <AnimatePresence mode="wait">
            {isUploading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, rotate: -40 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 className="h-5 w-5 animate-spin" />
              </motion.div>
            ) : isDragging ? (
              <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <FileUp className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <UploadCloud className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#172033]">
            {isUploading ? "Indexation en cours" : "Déposer un document"}
          </p>
          <p className="mt-1 text-xs text-[#6f7888]">PDF ou TXT, 20 Mo max.</p>
        </div>
      </div>

      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#172033] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#24314a] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UploadCloud className="h-4 w-4" />
        Charger
      </button>
    </div>
  );
}
