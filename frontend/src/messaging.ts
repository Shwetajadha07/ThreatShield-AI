import { getMessaging, getToken, isSupported, Messaging } from "firebase/messaging";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { app, auth, db } from "./firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export type PushStatus = "idle" | "loading" | "enabled" | "blocked" | "error" | "unsupported";

export async function ensureMessaging(): Promise<Messaging | null> {
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  return getMessaging(app);
}

export async function enablePushNotifications(): Promise<{ status: PushStatus; message?: string }> {
  const messaging = await ensureMessaging();
  if (!messaging) return { status: "unsupported", message: "Push not supported in this browser." };

  if (!("Notification" in window)) return { status: "unsupported", message: "Notifications not available." };
  if (Notification.permission === "denied") return { status: "blocked", message: "Notifications are blocked in browser settings." };

  if (!VAPID_KEY) return { status: "error", message: "Missing VAPID key (set VITE_FIREBASE_VAPID_KEY)." };

  const user = auth.currentUser;
  if (!user) return { status: "error", message: "Sign in first to enable alerts." };

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });

  if (!token) return { status: "error", message: "Failed to get push token." };

  await setDoc(doc(db, "users", user.uid, "tokens", token), {
    token,
    platform: "web",
    createdAt: serverTimestamp(),
  });

  return { status: "enabled" };
}
