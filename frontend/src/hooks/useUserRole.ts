import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { useAuthUser } from "./useAuthUser";

export type UserRole = "admin" | "user" | string | null;

export type UserRoleSnapshot = {
  user: ReturnType<typeof useAuthUser>["user"];
  ready: boolean;
  role: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isUser: boolean;
};

export function useUserRole(): UserRoleSnapshot {
  const { user, ready } = useAuthUser();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!ready) {
      setLoading(true);
      return () => {
        mounted = false;
      };
    }

    if (!user) {
      setRole(null);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);

    const loadRole = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!mounted) return;

        const rawRole = snap.exists() ? snap.data().role : null;
        const resolvedRole =
          typeof rawRole === "string" && rawRole.trim()
            ? rawRole
            : user.email === "admin@gmail.com"
              ? "admin"
              : "user";

        setRole(resolvedRole);
      } catch {
        if (!mounted) return;
        setRole(user.email === "admin@gmail.com" ? "admin" : "user");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadRole();

    return () => {
      mounted = false;
    };
  }, [ready, user?.uid, user?.email]);

  return {
    user,
    ready,
    role,
    loading,
    isAdmin: role === "admin",
    isUser: role !== "admin",
  };
}
