import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, addDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { scanUrlBeforeDownload, fetchAndDownloadClean } from "../utils/scan";

const cardStyle = {
  background: "#1e293b",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
};

type Report = {
  id: string;
  title?: string;
  status?: string;
  date?: string;
  result?: string;
  hash?: string;
  userId?: string;
};

const normalizeDate = (value: unknown) => {
  if (!value) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const maybeTimestamp = value as { toDate?: () => Date; seconds?: number };
    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate().toISOString();
    }
    if (typeof maybeTimestamp.seconds === "number") {
      return new Date(maybeTimestamp.seconds * 1000).toISOString();
    }
  }
  return String(value);
};

const reportSortTime = (value: unknown) => {
  const time = Date.parse(normalizeDate(value));
  return Number.isNaN(time) ? 0 : time;
};

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "reports"));
      const data: Report[] = snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          title: typeof raw.title === "string" ? raw.title : undefined,
          status: typeof raw.status === "string" ? raw.status : undefined,
          date: normalizeDate(raw.date),
          result: typeof raw.result === "string" ? raw.result : undefined,
          hash: typeof raw.hash === "string" ? raw.hash : undefined,
          userId: typeof raw.userId === "string" ? raw.userId : undefined,
        };
      });

      data.sort((a, b) => reportSortTime(b.date) - reportSortTime(a.date));
      setReports(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load reports.");
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const unresolved = reports.filter((r) => (r.status || "").toLowerCase() === "open").length;
  const lastGenerated = reports[0]?.date || "—";

  const handleScanAndDownload = async () => {
    if (!downloadUrl.trim()) {
      setDownloadStatus("Enter a file URL to scan.");
      return;
    }
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setDownloadStatus("Sign in to scan and download.");
      return;
    }
    setIsScanning(true);
    setDownloadStatus("Scanning...");
    try {
      const res = await scanUrlBeforeDownload(downloadUrl.trim(), userId);
      if (res.status === "clean") {
        setDownloadStatus("Clean — downloading now.");
        await fetchAndDownloadClean(downloadUrl.trim(), userId);
      } else {
        setDownloadStatus("Blocked: malware detected. Notification sent.");
        // persist malicious URL scan as a report
        await addDoc(collection(db, "reports"), {
          title: `URL Scan: ${downloadUrl.trim()}`,
          status: "open",
          date: new Date().toISOString(),
          result: res.result,
          hash: res.hash,
          userId,
        });
        await loadReports();
      }
    } catch (err: any) {
      setDownloadStatus(err?.response?.data?.error || "Scan failed. Try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reports", id));
      await loadReports();
    } catch (e: any) {
      setError(e.message || "Delete failed");
    }
  };

  const handleClearAll = async () => {
    try {
      await Promise.all(reports.map((r) => deleteDoc(doc(db, "reports", r.id))));
      await loadReports();
    } catch (e: any) {
      setError(e.message || "Clear failed");
    }
  };

  return (
    <div style={{ padding: "10px 10px 40px 10px", color: "white", background: "#0f172a", minHeight: "100vh" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ marginBottom: "4px" }}>📰 Reports</h1>
        <p style={{ color: "#cbd5e1" }}>View threat reports and exports.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div style={cardStyle}>
          <h3>Total Reports</h3>
          <p style={{ fontSize: "28px", color: "#3b82f6" }}>{reports.length}</p>
        </div>
        <div style={cardStyle}>
          <h3>Unresolved</h3>
          <p style={{ fontSize: "28px", color: "#ef4444" }}>{unresolved}</p>
        </div>
        <div style={cardStyle}>
          <h3>Last Generated</h3>
          <p style={{ color: "#cbd5e1" }}>{lastGenerated}</p>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: "20px" }}>
        <h3 style={{ marginBottom: "10px" }}>Scan before download (server-side)</h3>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            style={{ flex: 1, minWidth: "240px", padding: "10px", borderRadius: "8px", border: "1px solid #334155", background: "#0b1224", color: "white" }}
            placeholder="https://example.com/file.exe"
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
          />
          <button
            disabled={isScanning}
            style={{
              padding: "10px 14px",
              background: isScanning ? "#334155" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: isScanning ? "not-allowed" : "pointer",
            }}
            onClick={handleScanAndDownload}
          >
            {isScanning ? "Scanning..." : "Scan & Download"}
          </button>
        </div>
        {downloadStatus && <p style={{ marginTop: "8px", color: "#cbd5e1" }}>{downloadStatus}</p>}
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ margin: 0 }}>Recent Reports</h3>
          <button
            onClick={handleClearAll}
            disabled={reports.length === 0}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 10px",
              cursor: reports.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Clear All
          </button>
        </div>
        {error && <p style={{ color: "#f87171" }}>{error}</p>}
        {isLoading ? (
          <p style={{ color: "#cbd5e1" }}>Loading reports...</p>
        ) : reports.length === 0 ? (
          <p style={{ color: "#cbd5e1" }}>No reports yet.</p>
        ) : (
          <table style={{ width: "100%", color: "white", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#cbd5e1", textAlign: "left" }}>
                <th>Title</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{r.title || "Untitled"}</td>
                  <td style={{ color: (r.status || "").toLowerCase() === "open" ? "#ef4444" : "#22c55e" }}>
                    {r.status || "—"}
                  </td>
                  <td>{r.date || "—"}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(r.id)}
                      style={{
                        background: "#334155",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 8px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
