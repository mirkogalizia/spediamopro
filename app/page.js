'use client';

import React, { useState } from "react";
import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ALLOWED_EMAILS = [
    "notforresaleitalia1@gmail.com"
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!email || !password) {
        setError("Inserisci email e password");
        setLoading(false);
        return;
      }

      if (!ALLOWED_EMAILS.includes(email.trim().toLowerCase())) {
        setError("Email non autorizzata");
        setLoading(false);
        return;
      }

      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/shipment");
    } catch (err) {
      setError("Email o password errati");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif",
        color: "#333",
        flexDirection: "column",
      }}
    >
      <div style={{
        width: 220,
        marginBottom: 40,
        filter: "drop-shadow(0 2px 14px #bbb8)",
      }}>
        <Image
          src="/logo.png"
          alt="Logo"
          width={220}
          height={90}
          style={{ width: "100%", height: "auto", objectFit: "contain" }}
          priority
        />
      </div>

      <form
        onSubmit={handleLogin}
        style={{
          background: "#fff",
          padding: 32,
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <h2 style={{ margin: 0, fontWeight: 700, color: "#007aff", textAlign: "center" }}>
          Login SpediamoPro
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading}
          required
          autoFocus
          style={{
            padding: 14,
            fontSize: 16,
            borderRadius: 12,
            border: "1px solid #ccc",
            outlineColor: "#007aff",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
          required
          style={{
            padding: 14,
            fontSize: 16,
            borderRadius: 12,
            border: "1px solid #ccc",
            outlineColor: "#007aff",
          }}
        />

        {error && (
          <div style={{ color: "#d93025", fontWeight: 600, fontSize: 14, textAlign: "center" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: "#007aff",
            color: "white",
            fontWeight: 700,
            padding: 16,
            borderRadius: 12,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            userSelect: "none",
            fontSize: 16,
            boxShadow: "0 6px 12px rgba(0, 122, 255, 0.6)",
            transition: "background-color 0.3s ease",
          }}
          onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = "#005bb5")}
          onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = "#007aff")}
        >
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>
    </div>
  );
}