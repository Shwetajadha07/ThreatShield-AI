import axios from "axios";

const BASE_URL = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:5000";

export type ScanResult = {
  status: "clean" | "active";
  result: string;
  hash: string;
};

/**
 * Call backend /scan-url before letting the user download a file.
 * Throws if the backend returns an error.
 */
export async function scanUrlBeforeDownload(url: string, userId: string): Promise<ScanResult> {
  const resp = await axios.post<ScanResult>(`${BASE_URL}/scan-url`, { url, userId });
  return resp.data;
}

export async function fetchAndDownloadClean(url: string, userId: string) {
  const resp = await axios.post(`${BASE_URL}/fetch-download`, { url, userId }, { responseType: "blob" });
  const disposition = resp.headers["content-disposition"] as string | undefined;
  let filename = "download.bin";
  if (disposition) {
    const match = disposition.match(/filename="?([^";]+)"?/i);
    if (match && match[1]) filename = match[1];
  }
  const blobUrl = window.URL.createObjectURL(resp.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function safeDownloadFile(file: File, userId: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("userId", userId);
  const resp = await axios.post(`${BASE_URL}/scan-upload-download`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    responseType: "blob",
  });
  const disposition = resp.headers["content-disposition"] as string | undefined;
  let filename = file.name || "download.bin";
  if (disposition) {
    const match = disposition.match(/filename="?([^";]+)"?/i);
    if (match && match[1]) filename = match[1];
  }
  const blobUrl = window.URL.createObjectURL(resp.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
