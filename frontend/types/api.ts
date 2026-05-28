export type DocumentStatus = "uploaded" | "indexed" | "error";
export type AnalysisMode = "standard" | "legal_analysis";

export type DocumentMetadata = {
  id: string;
  filename: string;
  document_type: string;
  status: DocumentStatus;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  chunk_count: number;
  char_count: number;
  storage_path?: string | null;
  error_message?: string | null;
  summary?: string | null;
  suggestions: string[];
};

export type DocumentListResponse = {
  documents: DocumentMetadata[];
};

export type UploadResponse = {
  document: DocumentMetadata;
};

export type Source = {
  document_id: string;
  document_name: string;
  chunk_id: string;
  excerpt: string;
  score: number;
  relevance_label: string;
  badge: string;
  page?: number | null;
};

export type ChatRequest = {
  question: string;
  document_ids?: string[];
  mode: AnalysisMode;
};

export type ChatResponse = {
  answer: string;
  sources: Source[];
  confidence_score: number;
  used_documents: string[];
  suggested_followups: string[];
};

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
  sources?: Source[];
  confidenceScore?: number;
  usedDocuments?: string[];
  pending?: boolean;
};
