export interface SavedPrompt {
  id: string;
  text: string;
  createdAt: string;
}

export interface OutputImage {
  data: string;
  mimeType: string;
}

export type ApiFetch = (
  path: string,
  init?: RequestInit,
) => Promise<Response>;
