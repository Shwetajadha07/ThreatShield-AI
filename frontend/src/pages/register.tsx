import "./register.css";
import { useState, type FormEvent } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const cleanName = name.trim();

    if (!cleanEmail || !password || !cleanName) {
      setError("Please fill all fields.");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await updateProfile(cred.user, { displayName: cleanName });

      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          uid: cred.user.uid,
          name: cleanName,
          email: cred.user.email,
          role: "user",
          status: "active",
          emailOptIn: false,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );

      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      const code = e?.code || "";
      if (code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (code === "auth/operation-not-allowed") {
        setError("Email/password sign-up is disabled in Firebase. Enable it in Authentication settings.");
      } else if (code === "auth/network-request-failed") {
        setError("Network error. Check your internet connection and try again.");
      } else {
        setError(e?.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <form className="register-card" onSubmit={handleRegister}>
        <h2>Create Account</h2>

        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <p style={{ color: "#f87171", marginBottom: "8px" }}>{error}</p>}

        <button className="register-btn" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>
        <button className="create-btn" type="button" onClick={() => navigate("/")}>
          Back to Login
        </button>
      </form>
    </div>
  );
}
