"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import type { Components } from "react-markdown";
import { Copy, Check, ExternalLink, Loader2 } from "lucide-react";

interface Message { id: string; role: "user" | "assistant"; content: string; }
interface SharedChat { title: string; createdAt: string; messages: Message[]; }

// ─── Hex Icon (sin animación) ──────────────────────────────────────────────
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

function DocuIAIcon({ size = 24 }: { size?: number }) {
  const lx = 33, ly = 31, lr = 14;
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" style={{ display: "block", filter: "drop-shadow(0 0 3px rgba(0,180,255,.25))" }}>
      <defs>
        <linearGradient id="share-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#1a6eff" />
        </linearGradient>
      </defs>
      <polygon points={hexPoints(36, 36, 30)} fill="none" stroke="rgba(0,229,255,0.2)" strokeWidth="0.8" />
      <polygon points={hexPoints(36, 36, 24)} fill="none" stroke="rgba(0,229,255,0.12)" strokeWidth="0.8" strokeDasharray="3 5" />
      {([[36, 6], [62.57, 21], [62.57, 51]] as [number, number][]).map(([nx, ny], i) => (
        <circle key={i} cx={nx} cy={ny} r={2} fill="#00e5ff" opacity={0.5} />
      ))}
      <circle cx={lx} cy={ly} r={lr} fill="#06060f" />
      <circle cx={lx} cy={ly} r={lr} fill="none" stroke="url(#share-g)" strokeWidth="2" />
      <path d={`M${lx - 7} ${ly - 7} Q${lx - 3} ${ly - 11} ${lx + 3} ${ly - 10}`} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" strokeLinecap="round" />
      {[{ y: ly - 2, x2: lx + 7, op: 0.42 }, { y: ly + 2, x2: lx + 4, op: 0.28 }, { y: ly + 6, x2: lx + 6, op: 0.22 }].map((l, i) => (
        <line key={i} x1={lx - 7} y1={l.y} x2={l.x2} y2={l.y} stroke="#00e5ff" strokeWidth="1" strokeLinecap="round" opacity={l.op} />
      ))}
      <circle cx={43} cy={41} r={1.5} fill="#00e5ff" opacity={0.9} />
      <line x1={43} y1={41} x2={55} y2={53} stroke="url(#share-g)" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}

// ─── Markdown ─────────────────────────────────────────────────────────────────
const codeTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': { color: "#e2e8f0", background: "none", fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", lineHeight: "1.6" },
  comment: { color: "#4a5568", fontStyle: "italic" },
  keyword: { color: "#00e5ff", fontStyle: "italic" },
  string: { color: "#68d391" },
  number: { color: "#f6ad55" },
  function: { color: "#b794f4" },
  property: { color: "#00e5ff" },
  operator: { color: "#90cdf4" },
  punctuation: { color: "#718096" },
};

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,229,255,0.15)", margin: "10px 0", background: "#0a0a14" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 14px", background: "rgba(0,229,255,0.05)", borderBottom: "1px solid rgba(0,229,255,0.1)" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#00e5ff", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>{language || "código"}</span>
        <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: copied ? "#4ade80" : "#555", fontSize: 11, fontFamily: "inherit" }}>
          {copied ? <><Check size={11} />Copiado</> : <><Copy size={11} />Copiar</>}
        </button>
      </div>
      <div style={{ padding: "14px 16px", overflowX: "auto" }}>
        <SyntaxHighlighter language={language || "text"} style={codeTheme} customStyle={{ background: "none", padding: 0, margin: 0 }} PreTag="div">
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

function buildMdComponents(): Components {
  return {
    code({ className, children, ...props }: any) {
      const isBlock = !props.inline;
      const lang = (className || "").replace("language-", "");
      const val = String(children).replace(/\n$/, "");
      if (isBlock) return <CodeBlock language={lang} value={val} />;
      return <code style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.15)", padding: "1px 7px", borderRadius: 4, fontFamily: "monospace", fontSize: "0.85em", color: "#00e5ff" }}>{children}</code>;
    },
    p: ({ children }: any) => <p style={{ margin: "0.45em 0", lineHeight: 1.75, color: "#d0d0d0" }}>{children}</p>,
    h1: ({ children }: any) => <h1 style={{ fontSize: "1.25em", fontWeight: 600, color: "#f0f0f0", margin: "1em 0 0.4em" }}>{children}</h1>,
    h2: ({ children }: any) => <h2 style={{ fontSize: "1.1em", fontWeight: 600, color: "#f0f0f0", margin: "0.9em 0 0.35em" }}>{children}</h2>,
    h3: ({ children }: any) => <h3 style={{ fontSize: "1em", fontWeight: 600, color: "#e0e0e0", margin: "0.8em 0 0.3em" }}>{children}</h3>,
    ul: ({ children }: any) => <ul style={{ paddingLeft: "1.4em", margin: "0.4em 0", color: "#d0d0d0" }}>{children}</ul>,
    ol: ({ children }: any) => <ol style={{ paddingLeft: "1.4em", margin: "0.4em 0", color: "#d0d0d0" }}>{children}</ol>,
    li: ({ children }: any) => <li style={{ margin: "0.2em 0", lineHeight: 1.65 }}>{children}</li>,
    strong: ({ children }: any) => <strong style={{ color: "#f0f0f0", fontWeight: 600 }}>{children}</strong>,
    blockquote: ({ children }: any) => <blockquote style={{ borderLeft: "3px solid rgba(0,229,255,0.4)", paddingLeft: 14, margin: "8px 0", color: "#888", fontStyle: "italic" }}>{children}</blockquote>,
    a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#00e5ff", textDecoration: "underline", textUnderlineOffset: 3 }}>{children}</a>,
    hr: () => <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.07)", margin: "12px 0" }} />,
    table: ({ children }: any) => <div style={{ overflowX: "auto", margin: "10px 0" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#d0d0d0" }}>{children}</table></div>,
    th: ({ children }: any) => <th style={{ padding: "7px 12px", textAlign: "left", background: "rgba(0,229,255,0.08)", borderBottom: "1px solid rgba(0,229,255,0.2)", color: "#00e5ff", fontWeight: 600, fontSize: 12 }}>{children}</th>,
    td: ({ children }: any) => <td style={{ padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{children}</td>,
  };
}

function MarkdownRenderer({ content }: { content: string }) {
  return <ReactMarkdown components={buildMdComponents()} unwrapDisallowed>{content}</ReactMarkdown>;
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SharePage() {
  const params = useParams();
  const publicId = params?.publicId as string;
  const [chat, setChat] = useState<SharedChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!publicId) return;
    fetch(`/api/share/${publicId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setChat(data);
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [publicId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d0d; color: #f0f0f0; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        .scrollbar::-webkit-scrollbar { width: 4px; }
        .scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      <div style={{ minHeight: "100dvh", background: "#0d0d0d" }}>

        {/* Header */}
        <header style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#0d0d0d", zIndex: 10 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <DocuIAIcon size={26} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f0", letterSpacing: "-0.3px" }}>DocuIA</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {chat && (
              <button onClick={copyLink}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: copied ? "rgba(74,222,128,0.1)" : "rgba(0,229,255,0.08)", border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(0,229,255,0.2)"}`, borderRadius: 20, cursor: "pointer", color: copied ? "#4ade80" : "#00e5ff", fontSize: 12, fontWeight: 500, fontFamily: "inherit", transition: "all .15s" }}>
                {copied ? <><Check size={12} />Copiado</> : <><Copy size={12} />Copiar link</>}
              </button>
            )}
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "var(--bg-surface, #1a1a1a)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, textDecoration: "none", color: "#888", fontSize: 12, fontWeight: 500 }}>
              <ExternalLink size={12} />Abrir DocuIA
            </Link>
          </div>
        </header>

        {/* Content */}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px" }}>

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 14 }}>
              <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#00e5ff" }} />
              <span style={{ fontSize: 13, color: "#444" }}>Cargando conversación…</span>
            </div>
          )}

          {error && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
              <p style={{ fontSize: 16, color: "#555", marginBottom: 8 }}>Esta conversación no está disponible</p>
              <p style={{ fontSize: 13, color: "#333" }}>Puede que el enlace haya expirado o el propietario haya desactivado el compartir.</p>
              <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 24, padding: "8px 18px", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 20, textDecoration: "none", color: "#00e5ff", fontSize: 13, fontWeight: 500 }}>
                Ir a DocuIA
              </Link>
            </div>
          )}

          {chat && (
            <div style={{ animation: "fadeUp 0.35s ease" }}>
              {/* Chat header */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 20, padding: "2px 10px", color: "#00e5ff", fontWeight: 600, letterSpacing: ".04em" }}>
                    COMPARTIDO
                  </span>
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f0f0f0", letterSpacing: "-0.4px", marginBottom: 6 }}>
                  {chat.title}
                </h1>
                <p style={{ fontSize: 13, color: "#444" }}>
                  {formatDate(chat.createdAt)} · {chat.messages.length} mensajes
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 28 }} />

              {/* Messages */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {chat.messages.map((m) => (
                  <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    {m.role === "user" ? (
                      <div style={{ maxWidth: "75%", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "18px 18px 4px 18px", padding: "11px 16px", fontSize: 14, lineHeight: 1.65, color: "#f0f0f0" }}>
                        {m.content}
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 12, maxWidth: "100%" }}>
                        <div style={{ marginTop: 3, flexShrink: 0 }}>
                          <DocuIAIcon size={24} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.7 }}>
                          <MarkdownRenderer content={m.content} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer CTA */}
              <div style={{ marginTop: 48, padding: "20px 24px", background: "#0e0e18", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f0", marginBottom: 4 }}>Analiza tus propios documentos</p>
                  <p style={{ fontSize: 12, color: "#555" }}>Sube PDFs, imágenes o pega una URL y conversa con ellos.</p>
                </div>
                <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)", borderRadius: 20, textDecoration: "none", color: "#00e5ff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                  Probar DocuIA gratis →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
