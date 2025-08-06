"use client";

import React, { useState, useEffect } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ALLOWED_EMAILS = [
    "tua@email.com",
    "altro@email.com"
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

      // Inserisci qui la tua logica di login (es. Firebase)
      // Esempio: await signInWithEmailAndPassword(auth, email, password);

      // Redirect simulato (cambia con router se vuoi)
      window.location.href = "/shipment";

    } catch (err) {
      setError("Email o password errati");
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #007aff, #0047b3)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen",
    }}>
      <form
        onSubmit={handleLogin}
        style={{
          background: "white",
          padding: 32,
          borderRadius: 24,
          width: 320,
          boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <h2 style={{ margin: 0, fontWeight: "700", color: "#007aff", textAlign: "center" }}>
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
          style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
          required
          style={{ padding: 12, fontSize: 16, borderRadius: 8, border: "1px solid #ccc" }}
        />

        {error && <div style={{ color: "#d93025", fontWeight: "600", fontSize: 14 }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: "#007aff",
            color: "white",
            fontWeight: "700",
            padding: 14,
            borderRadius: 12,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            userSelect: "none",
            fontSize: 16,
            boxShadow: "0 6px 12px rgba(0, 122, 255, 0.6)",
          }}
        >
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>
    </div>
  );
}