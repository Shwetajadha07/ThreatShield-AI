import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const cardStyle = {
  background: "#1e293b",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
};

type Threat = { id: string; indicator?: string; type?: string; status?: string; date?: string };

const normalizeDate = (value: unknown) => {
  if (!value) return "";
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

const sortTime = (value: unknown) => {
  const time = Date.parse(normalizeDate(value));
  return Number.isNaN(time) ? 0 : time;
};

export default function Threats() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadThreats = useCallback(async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "threats"));
      const data: Threat[] = snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          indicator: typeof raw.indicator === "string" ? raw.indicator : undefined,
          type: typeof raw.type === "string" ? raw.type : undefined,
          status: typeof raw.status === "string" ? raw.status : undefined,
          date: normalizeDate(raw.date),
        };
      });
      data.sort((a, b) => sortTime(b.date) - sortTime(a.date));
      setThreats(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load threats.");
      setThreats([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThreats();
  }, [loadThreats]);

  const active = threats.filter((t) => (t.status || "").toLowerCase() === "active").length;
  const quarantined = threats.filter((t) => (t.status || "").toLowerCase() === "quarantined").length;
  const lastAlert = threats[0]?.date || "—";

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "threats", id));
      await loadThreats();
    } catch (e: any) {
      setError(e.message || "Delete failed");
    }
  };

  const handleClearAll = async () => {
    try {
      const ids = threats.map((t) => t.id);
      await Promise.all(ids.map((id) => deleteDoc(doc(db, "threats", id))));
      await loadThreats();
    } catch (e: any) {
      setError(e.message || "Clear failed");
    }
  };

  return (
    <div style={{ padding: "10px 10px 40px 10px", color: "white", background: "#0f172a", minHeight: "100vh" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ marginBottom: "4px" }}>Threats</h1>
        <p style={{ color: "#cbd5e1" }}>Threat intel and incidents.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div style={cardStyle}>
          <h3>Active</h3>
          <p style={{ fontSize: "28px", color: "#ef4444" }}>{active}</p>
        </div>
        <div style={cardStyle}>
          <h3>Quarantined</h3>
          <p style={{ fontSize: "28px", color: "#3b82f6" }}>{quarantined}</p>
        </div>
        <div style={cardStyle}>
          <h3>Last Alert</h3>
          <p style={{ color: "#cbd5e1" }}>{lastAlert}</p>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ margin: 0 }}>Indicators</h3>
          <button
            onClick={handleClearAll}
            disabled={threats.length === 0}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 10px",
              cursor: threats.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Clear All
          </button>
        </div>
        {error && <p style={{ color: "#f87171" }}>{error}</p>}
        {isLoading ? (
          <p style={{ color: "#cbd5e1" }}>Loading threats...</p>
        ) : threats.length === 0 ? (
          <p style={{ color: "#cbd5e1" }}>No threats detected yet.</p>
        ) : (
          <table style={{ width: "100%", color: "white", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#cbd5e1", textAlign: "left" }}>
                <th>Indicator</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {threats.map((t) => (
                <tr key={t.id}>
                  <td>{t.indicator || "—"}</td>
                  <td>{t.type || "—"}</td>
                  <td style={{ color: (t.status || "").toLowerCase() === "active" ? "#ef4444" : "#22c55e" }}>
                    {t.status || "—"}
                  </td>
                  <td>{t.date || "—"}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(t.id)}
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
