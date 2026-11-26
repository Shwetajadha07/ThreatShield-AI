import { useEffect, useState } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

const cardStyle = {
  background: "#1e293b",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
};

type RawUser = {
  email?: string;
  role?: string;
  status?: string;
  lastLogin?: string | Timestamp | Date;
};

type User = {
  id: string;
  email?: string;
  role?: string;
  status?: string;
  lastLogin?: string;
};

function formatLastLogin(value: RawUser["lastLogin"]) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  if (value instanceof Timestamp) return value.toDate().toLocaleString();
  if (value instanceof Date) return value.toLocaleString();
  return String(value);
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const snap = await getDocs(collection(db, "users"));
        if (!mounted) return;

        const data: User[] = [];
        snap.forEach((doc) => {
          const raw = doc.data() as RawUser;
          data.push({
            id: doc.id,
            email: raw.email,
            role: raw.role,
            status: raw.status,
            lastLogin: formatLastLogin(raw.lastLogin),
          });
        });

        setUsers(data);
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        console.error("Failed to load users", err);
        setError(err.message || "Unable to load users");
        setUsers([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  const admins = users.filter((u) => (u.role || "").toLowerCase() === "admin").length;
  const lastLogin = users[0]?.lastLogin || "—";

  return (
    <div style={{ padding: "10px 10px 40px 10px", color: "white", background: "#0f172a", minHeight: "100vh" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ marginBottom: "4px" }}>👤 Users</h1>
        <p style={{ color: "#cbd5e1" }}>Manage users and roles.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div style={cardStyle}>
          <h3>Total Users</h3>
          <p style={{ fontSize: "28px", color: "#3b82f6" }}>{users.length}</p>
        </div>
        <div style={cardStyle}>
          <h3>Admins</h3>
          <p style={{ fontSize: "28px", color: "#c084fc" }}>{admins}</p>
        </div>
        <div style={cardStyle}>
          <h3>Last Login</h3>
          <p style={{ color: "#cbd5e1" }}>{lastLogin}</p>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginBottom: "12px" }}>User List</h3>
        {error ? (
          <p style={{ color: "#f87171" }}>Error: {error}</p>
        ) : isLoading ? (
          <p style={{ color: "#cbd5e1" }}>Loading users...</p>
        ) : users.length === 0 ? (
          <p style={{ color: "#cbd5e1" }}>No users yet.</p>
        ) : (
          <table style={{ width: "100%", color: "white", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#cbd5e1", textAlign: "left" }}>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email || "—"}</td>
                  <td>{u.role || "—"}</td>
                  <td style={{ color: (u.status || "").toLowerCase() === "active" ? "#22c55e" : "#ef4444" }}>{u.status || "—"}</td>
                  <td>{u.lastLogin || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
