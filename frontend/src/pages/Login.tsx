import "./login.css";
import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db, provider } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logAttempt = async (entry: Record<string, any>) => {
    try {
      await addDoc(collection(db, "logins"), {
        ...entry,
        date: new Date().toISOString(),
        ts: serverTimestamp(),
        device: navigator.userAgent,
        userAgent: navigator.userAgent,
      });
    } catch (err) {
      // Avoid blocking login flow if logging fails
      console.warn("login log failed", err);
    }
  };

  const routeForEmail = (addr?: string | null) => (addr === "admin@gmail.com" ? "/admin" : "/dashboard");

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await logAttempt({
        type: "success",
        email: cred.user.email,
        userId: cred.user.uid,
        method: "password",
      });
      navigate(routeForEmail(cred.user.email));
    } catch (e: any) {
      const msg = e?.message || "Login failed";
      setError(msg);
      await logAttempt({
        type: "failed",
        email,
        method: "password",
        error: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    navigate("/register");
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user.email;
      await logAttempt({
        type: "success",
        email: userEmail,
        userId: result.user.uid,
        method: "google",
      });
      navigate(routeForEmail(userEmail));
    } catch (e: any) {
      const msg = e?.message || "Google sign-in failed";
      setError(msg);
      await logAttempt({
        type: "failed",
        email,
        method: "google",
        error: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">ThreatShield</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        {error && <p style={{ color: "#f87171", marginBottom: "8px" }}>{error}</p>}

        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </button>

        <button className="create-btn" onClick={handleCreateAccount} disabled={loading}>
          Create Account
        </button>

        <button className="google-btn" onClick={handleGoogleLogin} disabled={loading}>
          {loading ? "Please wait..." : "Login with Google"}
        </button>
      </div>
    </div>
  );
}
