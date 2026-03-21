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
export function DocuIAIcon({
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

// ─── Markdown renderer con react-markdown + syntax highlighting ──────────────
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import type { Components } from "react-markdown";

// Tema oscuro personalizado que combina con la paleta cyan del proyecto
const codeTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: "#e2e8f0",
    background: "none",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: "13px",
    lineHeight: "1.6",
  },
  'pre[class*="language-"]': { background: "none", margin: 0, padding: 0 },
  comment: { color: "#4a5568", fontStyle: "italic" },
  prolog: { color: "#4a5568" },
  doctype: { color: "#4a5568" },
  cdata: { color: "#4a5568" },
  punctuation: { color: "#718096" },
  property: { color: "#00e5ff" },
  tag: { color: "#00e5ff" },
  boolean: { color: "#f6ad55" },
  number: { color: "#f6ad55" },
  constant: { color: "#f6ad55" },
  symbol: { color: "#f6ad55" },
  deleted: { color: "#fc8181" },
  selector: { color: "#68d391" },
  "attr-name": { color: "#68d391" },
  string: { color: "#68d391" },
  char: { color: "#68d391" },
  builtin: { color: "#68d391" },
  inserted: { color: "#68d391" },
  operator: { color: "#90cdf4" },
  entity: { color: "#90cdf4", cursor: "help" },
  url: { color: "#90cdf4" },
  variable: { color: "#90cdf4" },
  atrule: { color: "#b794f4" },
  "attr-value": { color: "#b794f4" },
  function: { color: "#b794f4" },
  "class-name": { color: "#b794f4" },
  keyword: { color: "#00e5ff", fontStyle: "italic" },
  regex: { color: "#f6ad55" },
  important: { color: "#f6ad55", fontWeight: "bold" },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
};

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid rgba(0,229,255,0.15)",
        margin: "10px 0",
        background: "#0a0a14",
      }}
    >
      {/* Header del bloque */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 14px",
          background: "rgba(0,229,255,0.05)",
          borderBottom: "1px solid rgba(0,229,255,0.1)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#00e5ff",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {language || "código"}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: copied ? "#4ade80" : "#555",
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4,
            transition: "color 0.2s",
            fontFamily: "system-ui",
          }}
        >
          {copied ? (
            <>
              <Check size={11} />
              Copiado
            </>
          ) : (
            <>
              <Copy size={11} />
              Copiar
            </>
          )}
        </button>
      </div>

      {/* Código con highlight */}
      <div
        style={{
          padding: "14px 16px",
          overflowX: "auto",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <SyntaxHighlighter
          language={language || "text"}
          style={codeTheme}
          customStyle={{ background: "none", padding: 0, margin: 0 }}
          wrapLongLines={false}
          PreTag="div"
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

// Componentes personalizados para react-markdown
function buildComponents(): Components {
  return {
    // Bloque de código ``` ... ```
    code({ node, className, children, ...props }: any) {
      const isBlock = !props.inline;
      const language = (className || "").replace("language-", "");
      const value = String(children).replace(/\n$/, "");

      if (isBlock) {
        return <CodeBlock language={language} value={value} />;
      }

      // Código inline `...`
      return (
        <code
          style={{
            background: "rgba(0,229,255,0.08)",
            border: "1px solid rgba(0,229,255,0.15)",
            padding: "1px 7px",
            borderRadius: 4,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.85em",
            color: "#00e5ff",
          }}
        >
          {children}
        </code>
      );
    },

    // Párrafos
    p({ children }: any) {
      return (
        <p style={{ margin: "0.45em 0", lineHeight: 1.75, color: "#d0d0d0" }}>
          {children}
        </p>
      );
    },

    // Encabezados
    h1({ children }: any) {
      return (
        <h1
          style={{
            fontSize: "1.25em",
            fontWeight: 600,
            color: "#f0f0f0",
            margin: "1em 0 0.4em",
            letterSpacing: "-0.3px",
          }}
        >
          {children}
        </h1>
      );
    },
    h2({ children }: any) {
      return (
        <h2
          style={{
            fontSize: "1.1em",
            fontWeight: 600,
            color: "#f0f0f0",
            margin: "0.9em 0 0.35em",
          }}
        >
          {children}
        </h2>
      );
    },
    h3({ children }: any) {
      return (
        <h3
          style={{
            fontSize: "1em",
            fontWeight: 600,
            color: "#e0e0e0",
            margin: "0.8em 0 0.3em",
          }}
        >
          {children}
        </h3>
      );
    },

    // Listas
    ul({ children }: any) {
      return (
        <ul
          style={{ paddingLeft: "1.4em", margin: "0.4em 0", color: "#d0d0d0" }}
        >
          {children}
        </ul>
      );
    },
    ol({ children }: any) {
      return (
        <ol
          style={{ paddingLeft: "1.4em", margin: "0.4em 0", color: "#d0d0d0" }}
        >
          {children}
        </ol>
      );
    },
    li({ children }: any) {
      return (
        <li style={{ margin: "0.2em 0", lineHeight: 1.65 }}>{children}</li>
      );
    },

    // Negritas y cursivas
    strong({ children }: any) {
      return (
        <strong style={{ color: "#f0f0f0", fontWeight: 600 }}>
          {children}
        </strong>
      );
    },
    em({ children }: any) {
      return (
        <em style={{ color: "#c0c0c0", fontStyle: "italic" }}>{children}</em>
      );
    },

    // Blockquote
    blockquote({ children }: any) {
      return (
        <blockquote
          style={{
            borderLeft: "3px solid rgba(0,229,255,0.4)",
            paddingLeft: 14,
            margin: "8px 0",
            color: "#888",
            fontStyle: "italic",
          }}
        >
          {children}
        </blockquote>
      );
    },

    // Links
    a({ href, children }: any) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#00e5ff",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          {children}
        </a>
      );
    },

    // Separador
    hr() {
      return (
        <hr
          style={{
            border: "none",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            margin: "12px 0",
          }}
        />
      );
    },

    // Tablas
    table({ children }: any) {
      return (
        <div style={{ overflowX: "auto", margin: "10px 0" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              color: "#d0d0d0",
            }}
          >
            {children}
          </table>
        </div>
      );
    },
    th({ children }: any) {
      return (
        <th
          style={{
            padding: "7px 12px",
            textAlign: "left",
            background: "rgba(0,229,255,0.08)",
            borderBottom: "1px solid rgba(0,229,255,0.2)",
            color: "#00e5ff",
            fontWeight: 600,
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return (
        <td
          style={{
            padding: "6px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {children}
        </td>
      );
    },
  };
}

// Componente final que usa react-markdown
function MarkdownRenderer({ content }: { content: string }) {
  const components = buildComponents();
  return (
    <ReactMarkdown
      components={components}
      // Evita que envuelva todo en un <p> extra
      unwrapDisallowed={true}
    >
      {content}
    </ReactMarkdown>
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
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [input, setInput] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userInitial, setUserInitial] = useState("U");
  const [userId, setUserId] = useState<string | null>(null);
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

  // ── 1. Init: usuario + chats desde Supabase ──────────────────────────────
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUserEmail(user.email || "Usuario");
      setUserInitial((user.email?.[0] || "U").toUpperCase());
      setUserId(user.id);
      await loadChats(user.id);
      setIsSidebarOpen(window.innerWidth >= 1024);
      setMounted(true);
    };
    init();
  }, []);

  // ── 2. Scroll al último mensaje ───────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions]);

  // ── 3. Cerrar menú usuario al clicar fuera ────────────────────────────────
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

  // ── 4. Auto-resize textarea ───────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  // ── SUPABASE: cargar chats con sus mensajes ───────────────────────────────
  const loadChats = async (uid: string) => {
    setIsLoadingChats(true);
    try {
      const { data: chatsData, error } = await supabase
        .from("chats")
        .select("id, title, document_id, file_name, created_at, updated_at")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      if (!chatsData || chatsData.length === 0) {
        await createNewChatInDB(uid);
        return;
      }

      const chatIds = chatsData.map((c) => c.id);
      const { data: messagesData } = await supabase
        .from("messages")
        .select("id, chat_id, role, content, created_at")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: true });

      const msgByChat: Record<string, Message[]> = {};
      (messagesData || []).forEach((m) => {
        if (!msgByChat[m.chat_id]) msgByChat[m.chat_id] = [];
        msgByChat[m.chat_id].push({
          id: m.id,
          role: m.role,
          content: m.content,
        });
      });

      const loaded: ChatSession[] = chatsData.map((c) => ({
        id: c.id,
        title: c.title,
        documentId: c.document_id ?? null,
        fileName: c.file_name ?? null,
        messages: msgByChat[c.id] || [],
        createdAt: new Date(c.created_at).getTime(),
      }));

      setSessions(loaded);
      setActiveSessionId(loaded[0].id);
    } catch (err) {
      console.error("Error cargando chats:", err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // ── SUPABASE: crear chat nuevo en BD ─────────────────────────────────────
  const createNewChatInDB = async (
    uid?: string,
  ): Promise<ChatSession | null> => {
    const targetUid = uid || userId;
    if (!targetUid) return null;
    const { data, error } = await supabase
      .from("chats")
      .insert({ user_id: targetUid, title: "Nuevo Chat" })
      .select("id, title, document_id, file_name, created_at")
      .single();
    if (error || !data) {
      console.error("Error creando chat:", error);
      return null;
    }
    const newSession: ChatSession = {
      id: data.id,
      title: data.title,
      documentId: null,
      fileName: null,
      messages: [],
      createdAt: new Date(data.created_at).getTime(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
    return newSession;
  };

  // ── SUPABASE: helpers ─────────────────────────────────────────────────────
  const updateChatTitle = async (chatId: string, title: string) => {
    await supabase.from("chats").update({ title }).eq("id", chatId);
    setSessions((prev) =>
      prev.map((s) => (s.id === chatId ? { ...s, title } : s)),
    );
  };

  const updateChatDocument = async (
    chatId: string,
    documentId: string,
    fileName: string,
  ) => {
    await supabase
      .from("chats")
      .update({ document_id: documentId, file_name: fileName })
      .eq("id", chatId);
  };

  const saveMessage = async (
    chatId: string,
    role: "user" | "assistant",
    content: string,
  ): Promise<string> => {
    const { data, error } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, role, content })
      .select("id")
      .single();
    if (error || !data) {
      console.error("Error guardando mensaje:", error);
      return Date.now().toString();
    }
    return data.id;
  };

  const updateMessageContent = async (messageId: string, content: string) => {
    await supabase.from("messages").update({ content }).eq("id", messageId);
  };

  const createNewChat = () => createNewChatInDB();

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("chats").delete().eq("id", id);
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      if (filtered.length > 0) setActiveSessionId(filtered[0].id);
      else await createNewChatInDB();
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
        await updateChatDocument(activeSession.id, data.documentId, file.name);
        const welcomeMsg = `📄 **${file.name}** procesado y listo. Tengo acceso completo a su contenido.\n\n¿Qué quieres saber sobre este documento?`;
        const msgId = await saveMessage(
          activeSession.id,
          "assistant",
          welcomeMsg,
        );
        const newTitle = file.name.replace(/\.[^/.]+$/, "").substring(0, 28);
        await updateChatTitle(activeSession.id, newTitle);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  documentId: data.documentId,
                  fileName: file.name,
                  title: newTitle,
                  messages: [
                    ...s.messages,
                    { id: msgId, role: "assistant", content: welcomeMsg },
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

    // Guardar mensaje del usuario en BD
    const userMsgId = await saveMessage(currentSession.id, "user", textToSend);
    const userMsg: Message = {
      id: userMsgId,
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

    // Crear mensaje vacío de IA (se actualiza al terminar el stream)
    const assistantMsgId = await saveMessage(
      currentSession.id,
      "assistant",
      "",
    );
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: [
                ...s.messages,
                { id: assistantMsgId, role: "assistant", content: "" },
              ],
            }
          : s,
      ),
    );

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
                      m.id === assistantMsgId
                        ? { ...m, content: assistantText }
                        : m,
                    ),
                  }
                : s,
            ),
          );
        }
      }

      // Una sola escritura en BD al terminar el stream
      await updateMessageContent(assistantMsgId, assistantText);

      // Auto-título tras primer intercambio
      if (currentSession.title === "Nuevo Chat" && textToSend.length > 0) {
        const title =
          textToSend.slice(0, 36) + (textToSend.length > 36 ? "\u2026" : "");
        await updateChatTitle(currentSession.id, title);
      }
    } catch (error) {
      console.error("Error:", error);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: s.messages.filter((m) => m.id !== assistantMsgId),
              }
            : s,
        ),
      );
      await supabase.from("messages").delete().eq("id", assistantMsgId);
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

  if (!mounted || !activeSession)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100dvh",
          background: "#0d0d0d",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <DocuIAIcon size={48} isThinking={true} />
        <span style={{ fontSize: 13, color: "#444", fontFamily: "system-ui" }}>
          Cargando tus chats…
        </span>
      </div>
    );

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
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes thinking-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1.2); opacity: 1; }
        }
        @keyframes thinking-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(500%); }
        }
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
                Skan AI
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
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        maxWidth: "100%",
                        width: "100%",
                      }}
                    >
                      {/* ── Icono pequeño solo cuando ya hay respuesta ── */}
                      {m.content && (
                        <div style={{ marginTop: 3, flexShrink: 0 }}>
                          <DocuIAIcon size={26} isThinking={false} />
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ position: "relative", paddingBottom: 8 }}>
                          {m.content ? (
                            <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                              <MarkdownRenderer content={m.content} />
                            </div>
                          ) : (
                            /* ── Estado PENSANDO — icono grande centrado estilo Claude/Gemini ── */
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "48px 0 40px",
                                width: "100%",
                                animation: "fadeSlideUp 0.3s ease",
                              }}
                            >
                              {/* Icono grande con animación completa */}
                              <div
                                style={{
                                  position: "relative",
                                  marginBottom: 28,
                                }}
                              >
                                <DocuIAIcon size={72} isThinking={true} />
                              </div>

                              {/* Texto "Pensando" con puntos */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 20,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 15,
                                    fontWeight: 500,
                                    color: "var(--text-secondary)",
                                    letterSpacing: "-0.2px",
                                  }}
                                >
                                  Pensando
                                </span>
                                <span
                                  style={{
                                    display: "flex",
                                    gap: 4,
                                    alignItems: "center",
                                  }}
                                >
                                  {[0, 0.2, 0.4].map((delay, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        background: "#00e5ff",
                                        display: "inline-block",
                                        animation:
                                          "thinking-dot 1.4s ease-in-out infinite",
                                        animationDelay: `${delay}s`,
                                      }}
                                    />
                                  ))}
                                </span>
                              </div>

                              {/* Barra de progreso indeterminada */}
                              <div
                                style={{
                                  width: 200,
                                  height: 2,
                                  background: "rgba(0,229,255,0.08)",
                                  borderRadius: 2,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: "45%",
                                    background:
                                      "linear-gradient(90deg, transparent, #00e5ff, transparent)",
                                    borderRadius: 2,
                                    animation:
                                      "thinking-bar 1.6s ease-in-out infinite",
                                  }}
                                />
                              </div>
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