import type {
  ChatRequest,
  ChatResponse,
  DocumentListResponse,
  UploadResponse,
} from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Une erreur est survenue avec l'API LexIA.";
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) message = payload.detail;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getDocuments() {
  const response = await fetch(`${API_URL}/documents`, { cache: "no-store" });
  return parseResponse<DocumentListResponse>(response);
}

export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/documents/upload`, {
    method: "POST",
    body: formData,
  });
  return parseResponse<UploadResponse>(response);
}

export async function deleteDocument(documentId: string) {
  const response = await fetch(`${API_URL}/documents/${documentId}`, {
    method: "DELETE",
  });
  return parseResponse<void>(response);
}

export async function sendChat(payload: ChatRequest) {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<ChatResponse>(response);
}
