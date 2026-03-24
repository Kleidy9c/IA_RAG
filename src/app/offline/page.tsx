"use client";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100dvh",
      background: "#0d0d0d", color: "#f0f0f0",
      fontFamily: "'SF Pro Display', -apple-system, sans-serif",
      gap: 16, padding: 24, textAlign: "center",
    }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>📡</div>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.4px" }}>
        Sin conexión
      </h1>
      <p style={{ fontSize: 14, color: "#555", maxWidth: 300, lineHeight: 1.6 }}>
        Revisa tu conexión a internet e inténtalo de nuevo.
      </p>
      <Link href="/"
        style={{
          marginTop: 8, padding: "9px 20px",
          background: "rgba(0,229,255,0.08)",
          border: "1px solid rgba(0,229,255,0.25)",
          borderRadius: 20, textDecoration: "none",
          color: "#00e5ff", fontSize: 13, fontWeight: 500,
        }}>
        Reintentar
      </Link>
    </div>
  );
}
