"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { SocialAuth } from "@/app/components/SocialAuth";
import { DocuIAIcon } from "@/app/page";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Validación de fuerza de contraseña
  const passwordStrength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabels = ["", "Débil", "Regular", "Buena", "Fuerte"];
  const strengthColors = ["", "#f87171", "#fb923c", "#facc15", "#4ade80"];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/api/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d0d; }
        .input-field {
          width: 100%; padding: 12px 14px;
          background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; color: #f0f0f0; font-size: 14px;
          outline: none; transition: border-color 0.15s;
          font-family: inherit;
        }
        .input-field:focus { border-color: rgba(193,122,255,0.5); }
        .input-field::placeholder { color: #555; }
        .btn-primary {
          width: 100%; padding: 12px;
          background: linear-gradient(135deg, #c17aff, #7c3aed);
          border: none; border-radius: 10px;
          color: #fff; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: opacity 0.15s;
          font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-primary:hover:not(:disabled) { opacity: 0.9; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div
        style={{
          minHeight: "100dvh",
          background: "#0d0d0d",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          fontFamily:
            "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            animation: "fadeUp 0.35s ease",
          }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                margin: "0 auto 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DocuIAIcon/>
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#f0f0f0",
                letterSpacing: "-0.4px",
              }}
            >
              Crea tu cuenta
            </h1>
            <p style={{ color: "#666", fontSize: 14, marginTop: 6 }}>
              Únete a Skan AI y analiza documentos con IA
            </p>
          </div>

          {/* Card */}
          <div
            style={{
              background: "#111",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              padding: "28px 24px",
            }}
          >
            {success ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <CheckCircle2
                  size={40}
                  color="#4ade80"
                  style={{ margin: "0 auto 14px" }}
                />
                <h2
                  style={{
                    color: "#f0f0f0",
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  ¡Revisa tu correo!
                </h2>
                <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6 }}>
                  Enviamos un enlace de confirmación a{" "}
                  <strong style={{ color: "#f0f0f0" }}>{email}</strong>.<br />
                  Confirma tu cuenta para comenzar.
                </p>
                <button
                  onClick={() => router.push("/login")}
                  className="btn-primary"
                  style={{ marginTop: 20 }}
                >
                  Ir al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "rgba(248,113,113,0.1)",
                      border: "1px solid rgba(248,113,113,0.25)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 16,
                      color: "#f87171",
                      fontSize: 13,
                    }}
                  >
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <form
                  onSubmit={handleRegister}
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <div>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Contraseña (mín. 8 caracteres)"
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ paddingRight: 44 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#555",
                          padding: 4,
                        }}
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>

                    {/* Barra de fuerza */}
                    {password && (
                      <div style={{ marginTop: 6 }}>
                        <div
                          style={{ display: "flex", gap: 3, marginBottom: 4 }}
                        >
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              style={{
                                flex: 1,
                                height: 3,
                                borderRadius: 2,
                                background:
                                  i <= passwordStrength
                                    ? strengthColors[passwordStrength]
                                    : "rgba(255,255,255,0.1)",
                                transition: "background 0.2s",
                              }}
                            />
                          ))}
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            color: strengthColors[passwordStrength],
                          }}
                        >
                          {strengthLabels[passwordStrength]}
                        </span>
                      </div>
                    )}
                  </div>

                  <input
                    type="password"
                    placeholder="Confirmar contraseña"
                    className="input-field"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{
                      borderColor:
                        confirmPassword && confirmPassword !== password
                          ? "rgba(248,113,113,0.4)"
                          : confirmPassword && confirmPassword === password
                            ? "rgba(74,222,128,0.4)"
                            : undefined,
                    }}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ marginTop: 4 }}
                  >
                    {loading ? (
                      <Loader2
                        size={16}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      "Crear cuenta"
                    )}
                  </button>
                </form>

                <SocialAuth />
              </>
            )}
          </div>

          <p
            style={{
              textAlign: "center",
              marginTop: 16,
              fontSize: 13,
              color: "#555",
            }}
          >
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              style={{
                color: "#c17aff",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
