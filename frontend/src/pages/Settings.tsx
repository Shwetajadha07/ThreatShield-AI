import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

const cardStyle = {
  background: "#1e293b",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
};

export default function Settings() {
  const [failedLogins, setFailedLogins] = useState(0);
  const [malwareDetected, setMalwareDetected] = useState(0);
  const [quarantined, setQuarantined] = useState(0);
  const [email, setEmail] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const [loginSnap, threatSnap] = await Promise.all([
          getDocs(collection(db, "logins")),
          getDocs(collection(db, "threats")),
        ]);

        if (!mounted) return;

        let failed = 0;
        loginSnap.forEach((d) => {
          const data: any = d.data();
          if ((data.type || "").toLowerCase() === "failed") failed++;
        });

        let malware = 0;
        let quarant = 0;
        threatSnap.forEach((d) => {
          const data: any = d.data();
          const status = (data.status || "").toLowerCase();
          if (status === "active" || status === "quarantined") malware++;
          if (status === "quarantined") quarant++;
        });

        setFailedLogins(failed);
        setMalwareDetected(malware);
        setQuarantined(quarant);
      } catch {
        if (mounted) setProfileStatus("Could not load security summary.");
      }
    };

    void loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setProfileStatus("Sign in to manage email alerts.");
      return;
    }
    (async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setEmail((data.email as string) || "");
          setEmailOptIn(!!data.emailOptIn);
        }
        setProfileStatus(null);
      } catch {
        setProfileStatus("Could not load alert preferences.");
      }
    })();
  }, []);

  const handleSaveProfile = async () => {
    const user = auth.currentUser;
    if (!user) {
      setProfileStatus("Sign in to manage email alerts.");
      return;
    }
    if (email && !email.includes("@")) {
      setProfileStatus("Enter a valid email.");
      return;
    }
    setSavingProfile(true);
    setProfileStatus("Saving...");
    try {
      const ref = doc(db, "users", user.uid);
      await setDoc(
        ref,
        {
          email: email.trim(),
          emailOptIn,
        },
        { merge: true }
      );
      setProfileStatus("Saved.");
    } catch {
      setProfileStatus("Save failed. Try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div style={{ padding: "10px 10px 40px 10px", color: "white", background: "#0f172a", minHeight: "100vh" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ marginBottom: "4px" }}>⚙️ Settings</h1>
        <p style={{ color: "#cbd5e1" }}>Live security posture</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <div style={cardStyle}>
          <h3>Suspicious Logins</h3>
          <p style={{ fontSize: "28px", color: "#ef4444" }}>{failedLogins}</p>
          <p style={{ color: "#cbd5e1" }}>Count of failed login events.</p>
        </div>
        <div style={cardStyle}>
          <h3>Malware Detected</h3>
          <p style={{ fontSize: "28px", color: "#f97316" }}>{malwareDetected}</p>
          <p style={{ color: "#cbd5e1" }}>Active + quarantined threats.</p>
        </div>
        <div style={cardStyle}>
          <h3>Quarantined</h3>
          <p style={{ fontSize: "28px", color: "#3b82f6" }}>{quarantined}</p>
          <p style={{ color: "#cbd5e1" }}>Items already contained.</p>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: "20px" }}>
        <h3>Email Alerts</h3>
        <p style={{ color: "#cbd5e1", marginBottom: "10px" }}>Get email when malware is detected or a suspicious login happens.</p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
          <input
            style={{ flex: 1, minWidth: "240px", padding: "10px", borderRadius: "8px", border: "1px solid #334155", background: "#0b1224", color: "white" }}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label style={{ display: "flex", alignItems: "center", gap: "6px", color: "white" }}>
            <input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} />
            Email alerts
          </label>
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            style={{
              padding: "10px 14px",
              background: savingProfile ? "#334155" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: savingProfile ? "not-allowed" : "pointer",
            }}
          >
            {savingProfile ? "Saving..." : "Save"}
          </button>
        </div>
        {profileStatus && <p style={{ color: "#cbd5e1" }}>{profileStatus}</p>}
      </div>
    </div>
  );
}
