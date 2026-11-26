import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

import { Bar, Doughnut } from "react-chartjs-2";
import "./admin.css";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useEffect, useState } from "react";

type Login = {
  type?: string;
  email?: string;
  ip?: string;
  device?: string;
  date?: string;
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

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

export default function AdminDashboard() {
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    values: [] as number[]
  });

  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isSuspicious, setIsSuspicious] = useState(false);
  const [logins, setLogins] = useState<Login[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "logins"));
        if (!mounted) return;

        const data: Login[] = [];
        let success = 0;
        let failed = 0;

        querySnapshot.forEach((doc) => {
          const raw = doc.data() as Record<string, unknown>;
          const log: Login = {
            type: typeof raw.type === "string" ? raw.type : undefined,
            email: typeof raw.email === "string" ? raw.email : undefined,
            ip: typeof raw.ip === "string" ? raw.ip : undefined,
            device: typeof raw.device === "string" ? raw.device : undefined,
            date: normalizeDate(raw.date),
          };
          data.push(log);

          if ((log.type || "").toLowerCase() === "success") success++;
          if ((log.type || "").toLowerCase() === "failed") failed++;
        });

        data.sort((a, b) => sortTime(b.date) - sortTime(a.date));

        setSuccessCount(success);
        setFailedCount(failed);
        setIsSuspicious(data.slice(0, 5).filter((d) => (d.type || "").toLowerCase() === "failed").length >= 3);
        setLogins(data);
        setChartData({
          labels: ["Failed Logins", "Successful Logins"],
          values: [failed, success],
        });
      } catch (err) {
        console.error("Failed to load admin dashboard data", err);
      }
    };

    void loadData();
    const interval = window.setInterval(loadData, 10000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const barData = {
    labels: chartData.labels.length ? chartData.labels : ["Loading..."],
    datasets: [
      {
        label: "Login Activity",
        data: chartData.values.length ? chartData.values : [0],
        backgroundColor: ["#ef4444", "#22c55e"],
      },
    ],
  };

  const doughnutData = {
    labels: chartData.labels.length ? chartData.labels : ["Loading..."],
    datasets: [
      {
        data: chartData.values.length ? chartData.values : [0],
        backgroundColor: ["#ef4444", "#22c55e"],
      },
    ],
  };

  return (
    <>
      <div className="admin-topbar">
        <h1>Admin Security Dashboard</h1>
        <p>Welcome Admin 👋</p>
      </div>

      <div className="admin-cards">
        <div className="admin-card">
          <h3>Failed Logins</h3>
          <p>{failedCount}</p>
        </div>

        <div className="admin-card">
          <h3>Successful Logins</h3>
          <p>{successCount}</p>
        </div>

        <div className="admin-card">
          <h3>Suspicious Activity</h3>
          <p>{isSuspicious ? "⚠ YES" : "✅ NO"}</p>
        </div>
      </div>

      <div className="admin-bottom">
        <div className="activity-box">
          <h3>Recent Activity</h3>
          <ul>
            {logins.length === 0 && <li>No activity yet</li>}
            {logins.slice(0, 5).map((log, index) => (
              <li key={index}>
                {log.type === "failed" && "❌ Failed login"}
                {log.type === "success" && "✅ Login success"}
                {log.type && !["failed", "success"].includes(log.type) && log.type}
                {" - "}
                {log.email || "Unknown"}
              </li>
            ))}
          </ul>
        </div>

        <div className="chart-box">
          <h3>Login Overview</h3>

          <div style={{height:"200px"}}>
            <Bar data={barData} />
          </div>

          <div style={{marginTop:"20px", height:"200px"}}>
            <Doughnut data={doughnutData} />
          </div>
        </div>

        <div className="table-box" style={{marginTop:"20px"}}>
          <h3>Threat Management</h3>

          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Type</th>
                <th>Suspicious</th>
                <th>IP</th>
                <th>Device</th>
              </tr>
            </thead>

            <tbody>
              {logins.length === 0 && (
                <tr><td colSpan={5}>No data</td></tr>
              )}

              {logins.slice(0, 5).map((log, index) => (
                <tr key={index}>
                  <td>{log.email || "N/A"}</td>
                  <td>{log.type || "N/A"}</td>
                  <td className={log.type === "failed" ? "high" : "low"}>
                    {log.type === "failed" ? "Yes" : "No"}
                  </td>
                  <td>{log.ip || "N/A"}</td>
                  <td>{log.device ? log.device.substring(0,20)+"..." : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )  
}
