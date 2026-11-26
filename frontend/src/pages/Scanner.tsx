import { useState } from "react";
import axios from "axios";
import { addDoc, collection } from "firebase/firestore";
import { db, auth } from "../firebase";
import { safeDownloadFile } from "../utils/scan";

const cardStyle = {
  background: "#1e293b",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
  minHeight: "120px",
};

type ScanItem = { name: string; result: string; time: string; hash: string };

export default function Scanner() {
  const [recentScans, setRecentScans] = useState<ScanItem[]>([]);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiBase = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:5000";
  const apiDisplay = `${apiBase}/scan`;

  const handleFile = async (file?: File) => {
    if (!file) return;
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setError("Sign in to scan and receive alerts.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("userId", uid);
      const url = `${apiBase}/scan`;
      const res = await axios.post(url, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { result, hash } = res.data;
      const now = new Date().toLocaleTimeString();
      const item: ScanItem = { name: file.name, result, time: now, hash };
      setLastResult(result);
      setLastHash(hash);
      setRecentScans((prev) => [item, ...prev].slice(0, 5));

      const isMalicious = result.toLowerCase().includes("malware") || result.includes("⚠️");

      if (isMalicious) {
        await addDoc(collection(db, "reports"), {
          title: `Scan: ${file.name}`,
          status: "open",
          date: new Date().toISOString(),
          result,
          hash,
          userId: uid,
        });

        await addDoc(collection(db, "threats"), {
          indicator: file.name,
          type: "file",
          status: "active",
          date: new Date().toISOString().slice(0, 10),
          hash,
          userId: uid,
        });
      } else {
        // Clean: only allow download after server-side scan
        await safeDownloadFile(file, uid);
      }
    } catch (e: any) {
      const code = e?.response?.status;
      const msg = e?.response?.data?.message || e.message || "Scan failed";
      setError(code ? `${msg} (HTTP ${code})` : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "10px 10px 40px 10px", color: "white", background: "#0f172a", minHeight: "100vh" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ marginBottom: "4px" }}>🛡️ Threat Scanner</h1>
        <p style={{ color: "#cbd5e1" }}>Upload a file to scan for malware (talks to backend /scan).</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div style={cardStyle}>
          <h3>Upload</h3>
          <p style={{ color: "#cbd5e1" }}>Drop a file or click the button.</p>
          <input
            type="file"
            onChange={(e) => handleFile(e.target.files?.[0])}
            style={{ marginTop: "10px", width: "100%" }}
            disabled={loading}
          />
          {loading && <p style={{ marginTop: "8px", color: "#cbd5e1" }}>Scanning...</p>}
          {error && <p style={{ marginTop: "8px", color: "#f87171" }}>{error}</p>}
        </div>
        <div style={cardStyle}>
          <h3>Last Scan</h3>
          <p style={{ color: "#cbd5e1" }}>{lastResult ? lastResult : "No scans yet"}</p>
          {lastHash && <p style={{ color: "#94a3b8", fontSize: "12px", wordBreak: "break-all" }}>hash: {lastHash}</p>}
        </div>
        <div style={cardStyle}>
          <h3>Detection</h3>
          {error ? (
            <>
              <p style={{ color: "#f87171" }}>{error}</p>
              <p style={{ color: "#fbbf24", fontSize: "12px" }}>
                Make sure backend is running and reachable at {apiDisplay}
              </p>
            </>
          ) : lastResult ? (
            <p style={{ color: "#cbd5e1" }}>{lastResult}</p>
          ) : (
            <p style={{ color: "#cbd5e1" }}>Waiting for a file…</p>
          )}
          <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "8px" }}>API: {apiDisplay}</p>
          <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
            Clean files are scanned only—no automatic download.
          </p>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginBottom: "12px" }}>Recent Scans</h3>
        {recentScans.length === 0 ? (
          <p style={{ color: "#cbd5e1" }}>No scans yet.</p>
        ) : (
          <table style={{ width: "100%", color: "white", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#cbd5e1", textAlign: "left" }}>
                <th>File</th>
                <th>Result</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentScans.map((scan, idx) => (
                <tr key={idx}>
                  <td>{scan.name}</td>
                  <td>{scan.result}</td>
                  <td>{scan.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
