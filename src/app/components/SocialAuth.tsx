"use client";
import { createBrowserClient } from "@supabase/ssr";
import { Github, Facebook } from "lucide-react";

export function SocialAuth() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleSocialLogin = async (provider: "github" | "facebook") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{ position: "relative", textAlign: "center", marginBottom: 16 }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 1,
            background: "rgba(255,255,255,0.07)",
          }}
        />
        <span
          style={{
            position: "relative",
            background: "#111",
            padding: "0 10px",
            fontSize: 12,
            color: "#555",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          O continúa con
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          {
            provider: "github" as const,
            label: "GitHub",
            icon: <Github size={16} />,
            color: "#f0f0f0",
          },
          {
            provider: "facebook" as const,
            label: "Facebook",
            icon: <Facebook size={16} fill="#1877F2" />,
            color: "#1877F2",
          },
        ].map((item) => (
          <button
            key={item.provider}
            onClick={() => handleSocialLogin(item.provider)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 14px",
              background: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              cursor: "pointer",
              color: item.color,
              fontSize: 13,
              fontWeight: 500,
              transition: "border-color 0.15s, background 0.15s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(255,255,255,0.15)";
              (e.currentTarget as HTMLButtonElement).style.background = "#222";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLButtonElement).style.background =
                "#1a1a1a";
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
