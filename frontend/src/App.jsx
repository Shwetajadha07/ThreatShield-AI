import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Register from "./pages/register";
import AdminDashboard from "./pages/AdminDashboard";
import Scanner from "./pages/Scanner";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Threats from "./pages/Threats";
import Users from "./pages/Users";
import AdminLayout from "./layouts/AdminLayout";

function App(){
  return(
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />

        {/* ADMIN ROUTES WITH SHARED LAYOUT */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/threats" element={<Threats />} />
          <Route path="/users" element={<Users />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
