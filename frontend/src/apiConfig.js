const DEFAULT_API_BASE_URL = "https://groovetreet1.onrender.com";

const rawBase = import.meta.env?.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
const normalizedBase =
  typeof rawBase === "string" && rawBase.startsWith("/")
    ? DEFAULT_API_BASE_URL
    : rawBase;
export const API_BASE_URL = normalizedBase.replace(/\/+$/, "");

export function buildApiUrl(path = "") {
  if (!path) return API_BASE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
}
