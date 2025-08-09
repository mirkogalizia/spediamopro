'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        router.push("/");
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (authLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 18,
          fontWeight: 500,
        }}
      >
        Verifica accesso in corso…
      </div>
    );
  }

  return isAuthenticated ? children : null;
}