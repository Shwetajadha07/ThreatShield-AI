import "./admin.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

type Threat = { status?: string; date?: string };
type Report = { status?: string; date?: string };
type Login = { type?: string; date?: string };

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

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

const sortByDateDesc = <T extends { date?: unknown }>(items: T[]) =>
  [...items].sort((a, b) => {
    const right = Date.parse(normalizeDate(b.date));
    const left = Date.parse(normalizeDate(a.date));
    return (Number.isNaN(right) ? 0 : right) - (Number.isNaN(left) ? 0 : left);
  });

export default function Dashboard() {
  const navigate = useNavigate();
  const [threats, setThreats] = useState<Threat[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [logins, setLogins] = useState<Login[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setError("Please sign in to view your dashboard.");
      return;
    }

    let mounted = true;
    const tq = query(collection(db, "threats"), where("userId", "==", uid));
    const rq = query(collection(db, "reports"), where("userId", "==", uid));
    const lq = query(collection(db, "logins"), where("userId", "==", uid));

    const loadData = async () => {
      try {
        const [threatSnap, reportSnap, loginSnap] = await Promise.all([getDocs(tq), getDocs(rq), getDocs(lq)]);
        if (!mounted) return;

        const threatRows: Threat[] = threatSnap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            status: typeof raw.status === "string" ? raw.status : undefined,
            date: normalizeDate(raw.date),
          };
        });

        const reportRows: Report[] = reportSnap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            status: typeof raw.status === "string" ? raw.status : undefined,
            date: normalizeDate(raw.date),
          };
        });

        const loginRows: Login[] = loginSnap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            type: typeof raw.type === "string" ? raw.type : undefined,
            date: normalizeDate(raw.date),
          };
        });

        setThreats(sortByDateDesc(threatRows));
        setReports(sortByDateDesc(reportRows));
        setLogins(loginRows);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load dashboard.");
      }
    };

    void loadData();
    const interval = window.setInterval(loadData, 10000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const totalThreats = threats.length;
  const activeThreats = threats.filter((t) => (t.status || "").toLowerCase() === "active").length;
  const lastThreatDate = threats[0]?.date || "—";

  const totalReports = reports.length;
  const openReports = reports.filter((r) => (r.status || "").toLowerCase() === "open").length;
  const lastReportDate = reports[0]?.date || "—";

  const failedLogins = logins.filter((l) => (l.type || "").toLowerCase() === "failed").length;
  const successfulLogins = logins.filter((l) => (l.type || "").toLowerCase() === "success").length;
  const suspiciousLogins =
    logins.filter((l) => (l.type || "").toLowerCase().includes("suspicious")).length || failedLogins;

  const loginBarData = {
    labels: ["Successful", "Failed", "Suspicious"],
    datasets: [
      {
        label: "Logins",
        data: [successfulLogins, failedLogins, suspiciousLogins],
        backgroundColor: ["#22c55e", "#ef4444", "#f97316"],
      },
    ],
  };

  const loginPieData = {
    labels: ["Successful", "Failed", "Suspicious"],
    datasets: [
      {
        data: [successfulLogins, failedLogins, suspiciousLogins],
        backgroundColor: ["#22c55e", "#ef4444", "#f97316"],
      },
    ],
  };

  const card = (title: string, value: string | number, color = "#3b82f6") => (
    <div className="admin-card">
      <h3>{title}</h3>
      <p style={{ color }}>{value}</p>
    </div>
  );

  const formatShort = (dateStr?: string) => {
    if (!dateStr) return "—";
    const dt = new Date(dateStr);
    if (Number.isNaN(dt.getTime())) return dateStr;
    return dt.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="admin-dashboard">
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

      <div className="admin-main">
        <div className="admin-topbar">
          <h1>User Dashboard</h1>
          <p>Your personal security overview.</p>
        </div>

        {error && <p style={{ color: "#f87171" }}>{error}</p>}

        <div className="admin-cards">
          {card("Threats Detected", totalThreats)}
          {card("Active Threats", activeThreats, "#ef4444")}
          {card("Last Threat", formatShort(lastThreatDate), "#cbd5e1")}
        </div>

        <div className="admin-cards">
          {card("Reports", totalReports)}
          {card("Unresolved Reports", openReports, "#ef4444")}
          {card("Last Report", formatShort(lastReportDate), "#cbd5e1")}
        </div>

        <div className="admin-cards" style={{ gap: "20px", alignItems: "stretch" }}>
          {card("Failed Logins", failedLogins, "#ef4444")}
          {card("Successful Logins", successfulLogins, "#22c55e")}
          {card("Suspicious Activity", suspiciousLogins, "#f97316")}
        </div>

        <div className="admin-cards" style={{ gap: "20px", flexWrap: "wrap" }}>
          <div className="admin-card" style={{ flex: 1, minWidth: 240 }}>
            <h3>Login Activity (Bar)</h3>
            <div style={{ height: 220 }}>
              <Bar data={loginBarData} options={{ responsive: true, plugins: { legend: { display: false } }, maintainAspectRatio: false }} />
            </div>
          </div>
          <div className="admin-card" style={{ flex: 1, minWidth: 240 }}>
            <h3>Login Breakdown (Pie)</h3>
            <div style={{ height: 220 }}>
              <Pie data={loginPieData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
