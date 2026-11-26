import { Outlet, useNavigate } from "react-router-dom";
import "./admin.css";

export default function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard">
      <div className="admin-sidebar">
        <h2 className="admin-logo">ThreatShield</h2>

        <ul>
          <li onClick={() => navigate("/admin")}>📊 Dashboard</li>
          <li onClick={() => navigate("/admin/scanner")}>🛡 Threat Scanner</li>
          <li onClick={() => navigate("/admin/reports")}>📑 Reports</li>
          <li onClick={() => navigate("/admin/settings")}>⚙ Settings</li>
          <li onClick={() => navigate("/admin/threats")}>🛡 Threats</li>
          <li onClick={() => navigate("/admin/users")}>👥 Users</li>
        </ul>
      </div>

      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
