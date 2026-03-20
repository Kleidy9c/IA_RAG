"use client";
import { useState, ChangeEvent, useEffect, useRef, FormEvent } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  Paperclip,
  Copy,
  Edit2,
  Check,
  LogOut,
  Search,
  MessageSquare,
  Download,
  ChevronDown,
  FileText,
  ImageIcon,
  Mic,
  X,
  AlertCircle,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  documentId: string | null;
  fileName: string | null;
  messages: Message[];
  createdAt: number;
}

// ─── Logo DocuIA — Hex Data ───────────────────────────────────────────────────
// Lupa con hexágono exterior, líneas de datos internas y nodos en vértices.
// isThinking=true: hexágono rotante + nodos parpadeantes + glow cyan.
function DocuIAIcon({
  size = 28,
  isThinking = false,
}: {
  size?: number;
  isThinking?: boolean;
}) {
  // Escala todo desde un viewBox de 72×72
  const vb = 72;
  const s = size;

  // Puntos del hexágono exterior (radio 30, centro 36,36)
  const hexOuter = hexPoints(36, 36, 30);
  // Puntos del hexágono interior (radio 24)
  const hexInner = hexPoints(36, 36, 24);
  // Lupa: círculo cx=33 cy=31 r=14
  const lx = 33,
    ly = 31,
    lr = 14;
  // Mango: de (43,41) a (55,53)

  return (
    <div style={{ position: "relative", width: s, height: s, flexShrink: 0 }}>
      {/* Estado pensando — hex exterior rotante como "aura" */}
      {isThinking && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={s * 1.6}
            height={s * 1.6}
            viewBox="0 0 72 72"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              animation: "hex-spin 4s linear infinite",
              overflow: "visible",
            }}
          >
            <polygon
              points={hexPoints(36, 36, 38)}
              fill="none"
              stroke="rgba(0,229,255,0.25)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          </svg>
          <svg
            width={s * 1.9}
            height={s * 1.9}
            viewBox="0 0 72 72"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              animation: "hex-spin-rev 6s linear infinite",
              overflow: "visible",
            }}
          >
            <polygon
              points={hexPoints(36, 36, 44)}
              fill="none"
              stroke="rgba(0,229,255,0.1)"
              strokeWidth="0.8"
              strokeDasharray="2 8"
            />
          </svg>
        </div>
      )}

      {/* SVG principal */}
      <svg
        width={s}
        height={s}
        viewBox={`0 0 ${vb} ${vb}`}
        style={{
          position: "relative",
          zIndex: 1,
          display: "block",
          filter: isThinking
            ? "drop-shadow(0 0 5px rgba(0,229,255,0.7)) drop-shadow(0 0 12px rgba(0,180,255,0.4))"
            : "drop-shadow(0 0 3px rgba(0,180,255,0.25))",
          transition: "filter 0.4s ease",
          animation: isThinking ? "hex-glow 1.8s ease-in-out infinite" : "none",
        }}
      >
        <defs>
          <linearGradient id={`hd-g-${s}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00e5ff" />
            <stop offset="100%" stopColor="#1a6eff" />
          </linearGradient>
        </defs>

        {/* Hexágono exterior — borde fino */}
        <polygon
          points={hexOuter}
          fill="none"
          stroke="rgba(0,229,255,0.2)"
          strokeWidth="0.8"
        />

        {/* Hexágono interior — dasharray rotante cuando piensa */}
        <polygon
          points={hexInner}
          fill="none"
          stroke="rgba(0,229,255,0.12)"
          strokeWidth="0.8"
          strokeDasharray="3 5"
          style={
            isThinking
              ? {
                  animation: "hex-dash 3s linear infinite",
                  transformOrigin: "36px 36px",
                }
              : {}
          }
        />

        {/* Nodos en 3 vértices del hex exterior */}
        {[
          [36, 6],
          [62, 21],
          [62, 51],
        ].map(([nx, ny], i) => (
          <circle
            key={i}
            cx={nx}
            cy={ny}
            r={2}
            fill="#00e5ff"
            opacity={isThinking ? 1 : 0.5}
            style={
              isThinking
                ? {
                    animation: `hex-node-pulse 1.4s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                  }
                : {}
            }
          />
        ))}

        {/* Cristal de la lupa */}
        <circle cx={lx} cy={ly} r={lr} fill="#06060f" />
        <circle
          cx={lx}
          cy={ly}
          r={lr}
          fill="none"
          stroke={`url(#hd-g-${s})`}
          strokeWidth="2"
        />

        {/* Reflejo interior (sensación de vidrio) */}
        <path
          d={`M${lx - 7} ${ly - 7} Q${lx - 3} ${ly - 11} ${lx + 3} ${ly - 10}`}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Líneas de datos dentro del cristal */}
        {[
          [lx - 7, ly - 2, lx + 7, ly - 2, 0.4],
          [lx - 7, ly + 2, lx + 4, ly + 2, 0.28],
          [lx - 7, ly + 6, lx + 6, ly + 6, 0.22],
        ].map(([x1, y1, x2, y2, op], i) => (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#00e5ff"
            strokeWidth="1"
            strokeLinecap="round"
            opacity={op}
            style={
              isThinking
                ? {
                    animation: "hex-line-pulse 2s ease-in-out infinite",
                    animationDelay: `${i * 0.25}s`,
                  }
                : {}
            }
          />
        ))}

        {/* Punto de unión lupa→mango */}
        <circle cx={43} cy={41} r={1.5} fill="#00e5ff" opacity={0.9} />

        {/* Mango — terminación cuadrada tech */}
        <line
          x1={43}
          y1={41}
          x2={55}
          y2={53}
          stroke={`url(#hd-g-${s})`}
          strokeWidth="3"
          strokeLinecap="square"
        />
      </svg>
    </div>
  );
}

// Genera el string de puntos para un polígono hexagonal regular
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

// ─── Markdown renderer simple ────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^#{3}\s(.+)$/gm, "<h3>$1</h3>")
    .replace(/^#{2}\s(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#{1}\s(.+)$/gm, "<h1>$1</h1>")
    .replace(/^[-•]\s(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hul])(.+)$/gm, (m) =>
      m.startsWith("<") ? m : `<p>${m}</p>`,
    );
}

export default function Home() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userInitial, setUserInitial] = useState("U");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "Usuario");
        setUserInitial((user.email?.[0] || "U").toUpperCase());
      }
    };
    checkUser();

    const saved = localStorage.getItem("docuia_sessions_v4");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
        } else createInitialSession();
      } catch {
        createInitialSession();
      }
    } else createInitialSession();

    setIsSidebarOpen(window.innerWidth >= 1024);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && sessions.length > 0)
      localStorage.setItem("docuia_sessions_v4", JSON.stringify(sessions));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, mounted]);

  // Cerrar menú de usuario al hacer clic afuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      )
        setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const createInitialSession = () => {
    const newId = Date.now().toString();
    const session: ChatSession = {
      id: newId,
      title: "Nuevo Chat",
      documentId: null,
      fileName: null,
      messages: [],
      createdAt: Date.now(),
    };
    setSessions([session]);
    setActiveSessionId(newId);
  };

  const createNewChat = () => {
    const newId = Date.now().toString();
    const session: ChatSession = {
      id: newId,
      title: "Nuevo Chat",
      documentId: null,
      fileName: null,
      messages: [],
      createdAt: Date.now(),
    };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(newId);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      if (filtered.length > 0) setActiveSessionId(filtered[0].id);
      else createInitialSession();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Agrupar sesiones por fecha
  const groupSessions = (sessions: ChatSession[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: Record<string, ChatSession[]> = {
      Hoy: [],
      Ayer: [],
      "Esta semana": [],
      Anterior: [],
    };

    sessions.forEach((s) => {
      const d = new Date(s.createdAt);
      if (d >= today) groups["Hoy"].push(s);
      else if (d >= yesterday) groups["Ayer"].push(s);
      else if (d >= weekAgo) groups["Esta semana"].push(s);
      else groups["Anterior"].push(s);
    });

    return groups;
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.documentId) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  documentId: data.documentId,
                  fileName: file.name,
                  title: file.name.replace(/\.[^/.]+$/, "").substring(0, 28),
                  messages: [
                    ...s.messages,
                    {
                      id: Date.now().toString(),
                      role: "assistant",
                      content: `📄 **${file.name}** procesado y listo. Tengo acceso completo a su contenido.\n\n¿Qué quieres saber sobre este documento?`,
                    },
                  ],
                }
              : s,
          ),
        );
      } else {
        setUploadError(data.error || "Error al procesar el archivo");
      }
    } catch {
      setUploadError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const sendMessage = async (e?: FormEvent, overrideContent?: string) => {
    if (e) e.preventDefault();
    const currentSession = sessions.find((s) => s.id === activeSessionId);
    const textToSend = overrideContent || input;
    if (!textToSend.trim() || isLoading || !currentSession) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
    };
    const currentMessages = [...currentSession.messages, userMsg];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId ? { ...s, messages: currentMessages } : s,
      ),
    );
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages,
          documentId: currentSession.documentId,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const assistantId = Date.now().toString() + "ai";

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  { id: assistantId, role: "assistant", content: "" },
                ],
              }
            : s,
        ),
      );

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value);
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: assistantText }
                        : m,
                    ),
                  }
                : s,
            ),
          );
        }
      }

      // Auto-title tras primer mensaje
      if (currentSession.title === "Nuevo Chat" && textToSend.length > 0) {
        const title =
          textToSend.slice(0, 36) + (textToSend.length > 36 ? "…" : "");
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, title } : s)),
        );
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportChat = () => {
    if (!activeSession || activeSession.messages.length === 0) return;
    let content = `# DocuIA — Exportación\n**Chat:** ${activeSession.title}\n\n`;
    activeSession.messages.forEach((m) => {
      content += `### ${m.role === "user" ? "Tú" : "DocuIA"}:\n${m.content}\n\n---\n\n`;
    });
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DocuIA_${activeSession.title}.md`;
    a.click();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEdit = (m: Message) => {
    setEditingMessageId(m.id);
    setEditValue(m.content);
  };

  const saveEdit = () => {
    if (!activeSession || !editingMessageId) return;
    const msgIndex = activeSession.messages.findIndex(
      (m) => m.id === editingMessageId,
    );
    const newHistory = activeSession.messages.slice(0, msgIndex);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId ? { ...s, messages: newHistory } : s,
      ),
    );
    const textToResend = editValue;
    setEditingMessageId(null);
    sendMessage(undefined, textToResend);
  };

  const suggestedPrompts = [
    { icon: <FileText size={16} />, text: "Resume los puntos clave" },
    { icon: <Search size={16} />, text: "Busca información específica" },
    { icon: <Sparkles size={16} />, text: "Explícame este concepto" },
    { icon: <MessageSquare size={16} />, text: "Compara secciones" },
  ];

  if (!mounted || !activeSession) return null;

  const sessionGroups = groupSessions(filteredSessions);

  return (
    <>
      <style>{`
        :root {
          --bg-base: #0d0d0d;
          --bg-sidebar: #111111;
          --bg-surface: #1a1a1a;
          --bg-hover: #232323;
          --bg-active: #2a2a2a;
          --bg-input: #1e1e1e;
          --border: rgba(255,255,255,0.07);
          --border-hover: rgba(255,255,255,0.13);
          --text-primary: #f0f0f0;
          --text-secondary: #888;
          --text-muted: #555;
          --accent: #00e5ff;
          --accent-dim: rgba(0,229,255,0.1);
          --accent-hover: rgba(0,229,255,0.18);
          --user-bubble: #1e1e1e;
          --ai-bubble: #161616;
          --success: #4ade80;
          --danger: #f87171;
          --warning: #fb923c;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg-base); color: var(--text-primary); font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; }
        .scrollbar::-webkit-scrollbar { width: 4px; }
        .scrollbar::-webkit-scrollbar-track { background: transparent; }
        .scrollbar::-webkit-scrollbar-thumb { background: var(--border-hover); border-radius: 4px; }
        .prose h1, .prose h2, .prose h3 { font-weight: 600; margin: 0.75em 0 0.4em; color: var(--text-primary); }
        .prose h1 { font-size: 1.2em; }
        .prose h2 { font-size: 1.1em; }
        .prose h3 { font-size: 1em; }
        .prose p { margin: 0.5em 0; line-height: 1.7; color: #d0d0d0; }
        .prose ul { padding-left: 1.4em; margin: 0.4em 0; }
        .prose li { margin: 0.25em 0; color: #d0d0d0; }
        .prose code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.85em; color: var(--accent); }
        .prose strong { color: var(--text-primary); font-weight: 600; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        .msg-in { animation: fadeSlideUp 0.25s ease forwards; }
        .dot-pulse { animation: pulse 1.2s ease-in-out infinite; }
        .dot-pulse:nth-child(2) { animation-delay: 0.2s; }
        .dot-pulse:nth-child(3) { animation-delay: 0.4s; }
        .sidebar-item { transition: background 0.15s, color 0.15s; }
        .btn-ghost { background: none; border: none; cursor: pointer; color: var(--text-secondary); transition: color 0.15s, background 0.15s; border-radius: 8px; }
        .btn-ghost:hover { color: var(--text-primary); background: var(--bg-hover); }
      `}</style>

      <div
        style={{
          display: "flex",
          height: "100dvh",
          background: "var(--bg-base)",
          overflow: "hidden",
        }}
      >
        {/* ── Overlay móvil ── */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 20,
              display: "none",
            }}
            className="mobile-overlay"
          />
        )}

        {/* ════════════════ SIDEBAR ════════════════ */}
        <aside
          style={{
            width: isSidebarOpen ? 260 : 0,
            minWidth: isSidebarOpen ? 260 : 0,
            background: "var(--bg-sidebar)",
            borderRight: `1px solid var(--border)`,
            display: "flex",
            flexDirection: "column",
            transition: "width 0.25s ease, min-width 0.25s ease",
            overflow: "hidden",
            flexShrink: 0,
            zIndex: 30,
          }}
        >
          <div style={{ padding: "16px 12px 8px", flexShrink: 0 }}>
            {/* Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 4px 16px",
              }}
            >
              <DocuIAIcon size={32} />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.3px",
                }}
              >
                DocuIA
              </span>
            </div>

            {/* Nuevo chat */}
            <button
              onClick={createNewChat}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "9px 12px",
                background: "var(--bg-surface)",
                border: `1px solid var(--border)`,
                borderRadius: 10,
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "var(--border-hover)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--text-secondary)";
              }}
            >
              <Plus size={15} />
              Nuevo chat
            </button>

            {/* Búsqueda */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--bg-surface)",
                border: `1px solid var(--border)`,
                borderRadius: 10,
                padding: "7px 10px",
                marginTop: 8,
              }}
            >
              <Search size={13} color="var(--text-muted)" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar chats..."
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  width: "100%",
                }}
              />
            </div>
          </div>

          {/* Lista de chats */}
          <div
            className="scrollbar"
            style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}
          >
            {Object.entries(sessionGroups).map(([group, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={group} style={{ marginBottom: 8 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      padding: "8px 8px 4px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {group}
                  </p>
                  {items.map((s) => (
                    <div
                      key={s.id}
                      className="sidebar-item"
                      onClick={() => {
                        setActiveSessionId(s.id);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: 8,
                        cursor: "pointer",
                        background:
                          activeSessionId === s.id
                            ? "var(--bg-active)"
                            : "transparent",
                        border:
                          activeSessionId === s.id
                            ? `1px solid var(--border-hover)`
                            : "1px solid transparent",
                        marginBottom: 1,
                      }}
                      onMouseEnter={(e) => {
                        if (activeSessionId !== s.id)
                          (e.currentTarget as HTMLDivElement).style.background =
                            "var(--bg-hover)";
                      }}
                      onMouseLeave={(e) => {
                        if (activeSessionId !== s.id)
                          (e.currentTarget as HTMLDivElement).style.background =
                            "transparent";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          overflow: "hidden",
                          flex: 1,
                        }}
                      >
                        <MessageSquare
                          size={13}
                          color={
                            activeSessionId === s.id
                              ? "var(--accent)"
                              : "var(--text-muted)"
                          }
                          style={{ flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            color:
                              activeSessionId === s.id
                                ? "var(--text-primary)"
                                : "var(--text-secondary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.title}
                        </span>
                      </div>
                      <button
                        onClick={(e) => deleteChat(s.id, e)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          padding: 4,
                          borderRadius: 6,
                          opacity: 0,
                          flexShrink: 0,
                          transition: "opacity 0.15s, color 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color =
                            "var(--danger)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color =
                            "var(--text-muted)")
                        }
                        className="delete-btn"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Footer sidebar — usuario */}
          <div
            ref={userMenuRef}
            style={{
              padding: "10px 12px",
              borderTop: `1px solid var(--border)`,
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "8px 10px",
                background: "none",
                border: "none",
                cursor: "pointer",
                borderRadius: 10,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "var(--bg-hover)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "none")
              }
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #00e5ff, #0066ff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {userInitial}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  flex: 1,
                  textAlign: "left",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {userEmail || "Usuario"}
              </span>
              <ChevronDown
                size={14}
                color="var(--text-muted)"
                style={{
                  transform: showUserMenu ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>

            {showUserMenu && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 4px)",
                  left: 12,
                  right: 12,
                  background: "var(--bg-surface)",
                  border: `1px solid var(--border)`,
                  borderRadius: 10,
                  overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                {[
                  {
                    icon: <Download size={14} />,
                    label: "Exportar chat",
                    action: exportChat,
                  },
                  {
                    icon: <LogOut size={14} />,
                    label: "Cerrar sesión",
                    action: handleSignOut,
                    danger: true,
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.action();
                      setShowUserMenu(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "10px 14px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: item.danger
                        ? "var(--danger)"
                        : "var(--text-secondary)",
                      fontSize: 13,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        "var(--bg-hover)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        "none")
                    }
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ════════════════ MAIN ════════════════ */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            position: "relative",
            background: "var(--bg-base)",
          }}
        >
          {/* Header */}
          <header
            style={{
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              borderBottom: `1px solid var(--border)`,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setIsSidebarOpen((v) => !v)}
                className="btn-ghost"
                style={{ padding: "6px 8px", fontSize: 13 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="1"
                    y="3"
                    width="14"
                    height="1.5"
                    rx="0.75"
                    fill="currentColor"
                  />
                  <rect
                    x="1"
                    y="7.25"
                    width="14"
                    height="1.5"
                    rx="0.75"
                    fill="currentColor"
                  />
                  <rect
                    x="1"
                    y="11.5"
                    width="14"
                    height="1.5"
                    rx="0.75"
                    fill="currentColor"
                  />
                </svg>
              </button>

              {activeSession.documentId && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--accent-dim)",
                    border: `1px solid rgba(0,229,255,0.2)`,
                    borderRadius: 20,
                    padding: "3px 10px",
                  }}
                >
                  <FileText size={12} color="var(--accent)" />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--accent)",
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {activeSession.fileName}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {activeSession.messages.length > 0 && (
                <button
                  onClick={exportChat}
                  className="btn-ghost"
                  style={{ padding: "6px 8px" }}
                  title="Exportar"
                >
                  <Download size={15} />
                </button>
              )}
              <label
                htmlFor="header-upload"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 20,
                  cursor: "pointer",
                  background: activeSession.documentId
                    ? "var(--accent-dim)"
                    : "var(--bg-surface)",
                  border: `1px solid ${activeSession.documentId ? "rgba(0,229,255,0.25)" : "var(--border)"}`,
                  fontSize: 12,
                  fontWeight: 500,
                  color: activeSession.documentId
                    ? "var(--accent)"
                    : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                {isUploading ? (
                  <Loader2
                    size={13}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                ) : activeSession.documentId ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <Paperclip size={13} />
                )}
                <span className="hide-mobile">
                  {isUploading
                    ? "Procesando..."
                    : activeSession.documentId
                      ? "Doc. activo"
                      : "Subir archivo"}
                </span>
              </label>
              <input
                id="header-upload"
                type="file"
                style={{ display: "none" }}
                onChange={handleUpload}
                accept=".pdf,.docx,.txt,image/png,image/jpeg,image/webp"
                disabled={isUploading}
              />
            </div>
          </header>

          {/* Error banner */}
          {uploadError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(248,113,113,0.1)",
                border: `1px solid rgba(248,113,113,0.3)`,
                padding: "10px 16px",
                fontSize: 13,
                color: "var(--danger)",
              }}
            >
              <AlertCircle size={14} />
              {uploadError}
              <button
                onClick={() => setUploadError(null)}
                style={{
                  marginLeft: "auto",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--danger)",
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Mensajes */}
          <div
            className="scrollbar"
            style={{ flex: 1, overflowY: "auto", padding: "24px 16px 160px" }}
          >
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              {/* Pantalla de bienvenida */}
              {activeSession.messages.length === 0 && (
                <div
                  style={{ paddingTop: 60, animation: "fadeSlideUp 0.4s ease" }}
                >
                  <div style={{ marginBottom: 20 }}>
                    <DocuIAIcon size={52} />
                  </div>
                  <h1
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: 8,
                      letterSpacing: "-0.5px",
                    }}
                  >
                    ¿En qué puedo ayudarte?
                  </h1>
                  <p
                    style={{
                      fontSize: 15,
                      color: "var(--text-secondary)",
                      marginBottom: 32,
                    }}
                  >
                    {userEmail
                      ? `Conectado como ${userEmail}`
                      : "Sube un documento y pregúntame lo que necesites."}
                  </p>

                  {/* Suggested prompts */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      maxWidth: 480,
                    }}
                  >
                    {suggestedPrompts.map((p) => (
                      <button
                        key={p.text}
                        onClick={() => setInput(p.text)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "12px 14px",
                          background: "var(--bg-surface)",
                          border: `1px solid var(--border)`,
                          borderRadius: 10,
                          cursor: "pointer",
                          color: "var(--text-secondary)",
                          fontSize: 13,
                          textAlign: "left",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.borderColor = "var(--border-hover)";
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "var(--text-primary)";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.borderColor = "var(--border)";
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "var(--text-secondary)";
                        }}
                      >
                        <span style={{ color: "var(--accent)", flexShrink: 0 }}>
                          {p.icon}
                        </span>
                        {p.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensajes */}
              {activeSession.messages.map((m) => (
                <div
                  key={m.id}
                  className="msg-in"
                  style={{
                    display: "flex",
                    justifyContent:
                      m.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: 20,
                  }}
                >
                  {m.role === "user" ? (
                    <div
                      style={{ maxWidth: "75%", position: "relative" }}
                      className="group"
                    >
                      {editingMessageId === m.id ? (
                        <div
                          style={{
                            background: "var(--bg-surface)",
                            border: `1px solid var(--border)`,
                            borderRadius: 16,
                            padding: 14,
                            minWidth: 260,
                          }}
                        >
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                            rows={3}
                            style={{
                              width: "100%",
                              background: "none",
                              border: "none",
                              outline: "none",
                              resize: "none",
                              color: "var(--text-primary)",
                              fontSize: 14,
                            }}
                          />
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            <button
                              onClick={() => setEditingMessageId(null)}
                              style={{
                                fontSize: 12,
                                color: "var(--text-muted)",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={saveEdit}
                              style={{
                                fontSize: 12,
                                color: "var(--accent)",
                                fontWeight: 600,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              Re-enviar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ position: "relative" }}>
                          <div
                            style={{
                              background: "var(--user-bubble)",
                              border: `1px solid var(--border)`,
                              borderRadius: "18px 18px 4px 18px",
                              padding: "11px 16px",
                              fontSize: 14,
                              lineHeight: 1.65,
                              color: "var(--text-primary)",
                            }}
                          >
                            {m.content}
                          </div>
                          <button
                            onClick={() => handleEdit(m)}
                            style={{
                              position: "absolute",
                              left: -32,
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-muted)",
                              opacity: 0,
                              transition: "opacity 0.15s",
                              padding: 4,
                            }}
                            className="edit-btn"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 12, maxWidth: "100%" }}>
                      {/* ✅ Logo animado — isThinking cuando content está vacío */}
                      <div style={{ marginTop: 2 }}>
                        <DocuIAIcon size={28} isThinking={!m.content} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ position: "relative", paddingBottom: 8 }}>
                          {m.content ? (
                            <div
                              className="prose"
                              dangerouslySetInnerHTML={{
                                __html: renderMarkdown(m.content),
                              }}
                              style={{
                                fontSize: 14,
                                lineHeight: 1.7,
                                color: "#d0d0d0",
                              }}
                            />
                          ) : (
                            /* Estado "pensando" — skeleton animado */
                            <div
                              style={{
                                paddingTop: 4,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                  marginBottom: 4,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <span>Analizando</span>
                                <span style={{ display: "flex", gap: 3 }}>
                                  {[0, 0.25, 0.5].map((delay, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        width: 4,
                                        height: 4,
                                        borderRadius: "50%",
                                        background: "var(--accent)",
                                        display: "inline-block",
                                        animation: `pulse 1.2s ease-in-out infinite`,
                                        animationDelay: `${delay}s`,
                                      }}
                                    />
                                  ))}
                                </span>
                              </div>
                              {[200, 160, 180].map((w, i) => (
                                <div
                                  key={i}
                                  style={{
                                    height: 9,
                                    borderRadius: 5,
                                    background: "rgba(255,255,255,0.06)",
                                    width: w,
                                    animation:
                                      "docuia-skeleton 1.8s ease-in-out infinite",
                                    animationDelay: `${i * 0.2}s`,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          {m.content && (
                            <button
                              onClick={() => copyToClipboard(m.content, m.id)}
                              style={{
                                marginTop: 8,
                                padding: "4px 8px",
                                background: "none",
                                border: `1px solid var(--border)`,
                                borderRadius: 6,
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                fontSize: 12,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.borderColor = "var(--border-hover)";
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.color = "var(--text-secondary)";
                              }}
                              onMouseLeave={(e) => {
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.borderColor = "var(--border)";
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.color = "var(--text-muted)";
                              }}
                            >
                              {copiedId === m.id ? (
                                <Check size={12} color="var(--success)" />
                              ) : (
                                <Copy size={12} />
                              )}
                              {copiedId === m.id ? "Copiado" : "Copiar"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* ── Input ── */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background:
                "linear-gradient(to top, var(--bg-base) 70%, transparent)",
              padding: "20px 16px 24px",
            }}
          >
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <div
                style={{
                  background: "var(--bg-input)",
                  border: `1px solid var(--border)`,
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                  transition: "border-color 0.15s",
                }}
                onFocusCapture={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.borderColor =
                    "rgba(0,229,255,0.4)")
                }
                onBlurCapture={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.borderColor =
                    "var(--border)")
                }
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={
                    activeSession.documentId
                      ? `Pregunta sobre "${activeSession.fileName}"…`
                      : "Escribe tu pregunta o sube un documento…"
                  }
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    padding: "14px 16px 0",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    minHeight: 52,
                    maxHeight: 200,
                    fontFamily: "inherit",
                  }}
                  rows={1}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px 10px",
                  }}
                >
                  <div style={{ display: "flex", gap: 2 }}>
                    <label
                      htmlFor="input-upload"
                      className="btn-ghost"
                      style={{
                        padding: "6px 8px",
                        borderRadius: 8,
                        cursor: "pointer",
                        display: "flex",
                      }}
                    >
                      {isUploading ? (
                        <Loader2
                          size={16}
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                      ) : activeSession.documentId ? (
                        <CheckCircle2 size={16} color="var(--accent)" />
                      ) : (
                        <Paperclip size={16} />
                      )}
                    </label>
                    <input
                      id="input-upload"
                      type="file"
                      style={{ display: "none" }}
                      onChange={handleUpload}
                      accept=".pdf,.docx,.txt,image/png,image/jpeg,image/webp"
                      disabled={isUploading}
                    />
                    <button
                      className="btn-ghost"
                      style={{ padding: "6px 8px" }}
                      title="Voz (próximamente)"
                      disabled
                    >
                      <Mic size={16} />
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: "6px 8px" }}
                      title="Imagen (próximamente)"
                      disabled
                    >
                      <ImageIcon size={16} />
                    </button>
                  </div>

                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background:
                        input.trim() && !isLoading
                          ? "var(--accent)"
                          : "var(--bg-hover)",
                      border: "none",
                      cursor:
                        input.trim() && !isLoading ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {isLoading ? (
                      <Loader2
                        size={15}
                        color="#fff"
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <Send
                        size={15}
                        color={input.trim() ? "#fff" : "var(--text-muted)"}
                      />
                    )}
                  </button>
                </div>
              </div>
              <p
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 8,
                }}
              >
                DocuIA puede cometer errores. Verifica la información
                importante.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* CSS para hover en items de sidebar */}
      <style>{`
        .sidebar-item:hover .delete-btn { opacity: 1 !important; }
        .group:hover .edit-btn { opacity: 1 !important; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes hex-spin {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes hex-spin-rev {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(-360deg); }
        }
        @keyframes hex-dash {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -48; }
        }
        @keyframes hex-glow {
          0%,100% { filter: drop-shadow(0 0 3px rgba(0,229,255,0.5)); }
          50%      { filter: drop-shadow(0 0 10px rgba(0,229,255,1)) drop-shadow(0 0 20px rgba(0,180,255,0.5)); }
        }
        @keyframes hex-node-pulse {
          0%,100% { opacity: 0.4; r: 2; }
          50%      { opacity: 1;   r: 3.5; }
        }
        @keyframes hex-line-pulse {
          0%,100% { opacity: 0.25; }
          50%      { opacity: 0.75; }
        }
        @keyframes docuia-skeleton {
          0%,100% { opacity: 0.35; }
          50%      { opacity: 0.7; }
        }
        @media (max-width: 768px) {
          aside { position: fixed !important; height: 100dvh; }
          .mobile-overlay { display: block !important; }
          .hide-mobile { display: none; }
        }
      `}</style>
    </>
  );
}
