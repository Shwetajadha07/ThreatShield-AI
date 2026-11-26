import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { enablePushNotifications, PushStatus } from "../messaging";
import "../pages/admin.css";

type Alert = {
  id: string;
  title: string;
  message: string;
  tone?: "danger" | "warn";
};

type Row = {
  status?: string;
  date?: string;
  indicator?: string;
  email?: string;
  type?: string;
};

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

export default function AdminLayout() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const prevThreats = useRef<number | null>(null);
  const prevFailedLogins = useRef<number | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>("idle");
  const [pushMessage, setPushMessage] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;

    const loadAlerts = async () => {
      try {
        const [threatSnap, loginSnap] = await Promise.all([
          getDocs(collection(db, "threats")),
          getDocs(collection(db, "logins")),
        ]);

        if (!mounted) return;

        const threatDocs = threatSnap.docs
          .map((d) => d.data() as Row)
          .sort((a, b) => sortTime(b.date) - sortTime(a.date));

        const active = threatDocs.filter((d) => (d.status || "").toLowerCase() === "active");
        if (prevThreats.current !== null && active.length > prevThreats.current) {
          const latest = active[0];
          pushAlert({
            title: "Malware detected",
            message: latest?.indicator ? `File/indicator: ${latest.indicator}` : "A file was flagged as malware.",
            tone: "danger",
          });
        }
        prevThreats.current = active.length;

        const loginDocs = loginSnap.docs
          .map((d) => d.data() as Row)
          .sort((a, b) => sortTime(b.date) - sortTime(a.date));

        const failed = loginDocs.filter((d) => (d.type || "").toLowerCase() === "failed");
        if (prevFailedLogins.current !== null && failed.length > prevFailedLogins.current) {
          const latest = failed[0];
          pushAlert({
            title: "Suspicious login",
            message: latest?.email ? `Failed attempt for ${latest.email}` : "A suspicious login attempt was detected.",
            tone: "warn",
          });
        }
        prevFailedLogins.current = failed.length;
      } catch (err) {
        console.error("Failed to load admin alerts", err);
      }
    };

    void loadAlerts();
    const interval = window.setInterval(loadAlerts, 10000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  function pushAlert(alert: Alert) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    setAlerts((prev) => [...prev, { ...alert, id }]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 6000);
  }

  async function handleEnablePush() {
    setPushStatus("loading");
    const result = await enablePushNotifications();
    setPushStatus(result.status);
    setPushMessage(result.message);
  }

  return (
    <div className="admin-dashboard">
      <div className="alert-stack">
        {alerts.map((a) => (
          <div key={a.id} className={`alert-toast ${a.tone === "danger" ? "alert-danger" : "alert-warn"}`}>
            <div className="alert-title">{a.title}</div>
            <div className="alert-message">{a.message}</div>
          </div>
        ))}
      </div>

      <button className="notif-btn" onClick={handleEnablePush} disabled={pushStatus === "loading"}>
        {pushStatus === "enabled" ? "🔔 Alerts On" : "🔔 Enable Alerts"}
      </button>
      {pushMessage && <div className="notif-hint">{pushMessage}</div>}
      {pushStatus === "blocked" && (
        <div className="notif-hint">Unblock notifications in browser settings to receive alerts.</div>
      )}

      <div className="admin-sidebar">
        <h2 className="admin-logo" style={{ cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
          ThreatShield
        </h2>
        <ul>
          <li onClick={() => navigate("/dashboard")}>📊 User Dashboard</li>
          <li onClick={() => navigate("/admin")}>🛡 Admin Dashboard</li>
          <li onClick={() => navigate("/scanner")}>🧰 Threat Scanner</li>
          <li onClick={() => navigate("/reports")}>📑 Reports</li>
          <li onClick={() => navigate("/settings")}>⚙️ Settings</li>
          <li onClick={() => navigate("/threats")}>🛠 Threats</li>
          <li onClick={() => navigate("/users")}>👥 Users</li>
        </ul>
      </div>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
