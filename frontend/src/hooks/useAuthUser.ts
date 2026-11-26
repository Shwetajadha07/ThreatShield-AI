import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../firebase";

export type AuthSnapshot = {
  ready: boolean;
  user: User | null;
};

export function useAuthUser(): AuthSnapshot {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [ready, setReady] = useState<boolean>(Boolean(auth.currentUser));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setReady(true);
    });

    return () => unsubscribe();
  }, []);

  return { user, ready };
}
