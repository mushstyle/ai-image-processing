const DEFAULT_DEV_API_BASE_URL = "http://127.0.0.1:3001";

export function apiUrl(path: string): string {
  const baseUrl = import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_DEV_API_BASE_URL
    : "";

  return `${baseUrl}${path}`;
}
