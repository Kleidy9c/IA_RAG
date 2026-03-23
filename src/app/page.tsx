"use client";
import React, { useState, ChangeEvent, useEffect, useRef, FormEvent } from "react";
import {
  Send, Loader2, Sparkles, CheckCircle2, Trash2, Plus,
  Paperclip, Copy, Edit2, Check, LogOut, Search, MessageSquare,
  Download, ChevronDown, FileText, ImageIcon, Mic, X, AlertCircle,
  Globe, Link2, ExternalLink,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import type { Components } from "react-markdown";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message { id: string; role: "user" | "assistant"; content: string; }
interface ChatDocument { id: string; documentId: number; fileName: string; }
interface ChatSession {
  id: string; title: string; documents: ChatDocument[];
  messages: Message[]; createdAt: number;
  isPublic?: boolean; publicId?: string | null;
}

// ─── DocuIA Logo ──────────────────────────────────────────────────────────────
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

export function DocuIAIcon({ size = 28, isThinking = false }: { size?: number; isThinking?: boolean }) {
  const lx = 33, ly = 31, lr = 14;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {isThinking && (
        <div style={{ position: "absolute", inset: 0, zIndex: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width={size * 1.6} height={size * 1.6} viewBox="0 0 72 72"
            style={{ position: "absolute", top: "50%", left: "50%", animation: "hex-spin 4s linear infinite", overflow: "visible" }}>
            <polygon points={hexPoints(36, 36, 38)} fill="none" stroke="rgba(0,229,255,0.25)" strokeWidth="1" strokeDasharray="4 6" />
          </svg>
          <svg width={size * 1.9} height={size * 1.9} viewBox="0 0 72 72"
            style={{ position: "absolute", top: "50%", left: "50%", animation: "hex-spin-rev 6s linear infinite", overflow: "visible" }}>
            <polygon points={hexPoints(36, 36, 44)} fill="none" stroke="rgba(0,229,255,0.1)" strokeWidth="0.8" strokeDasharray="2 8" />
          </svg>
        </div>
      )}
      <svg width={size} height={size} viewBox="0 0 72 72"
        style={{
          position: "relative", zIndex: 1, display: "block",
          filter: isThinking ? "drop-shadow(0 0 5px rgba(0,229,255,.7))" : "drop-shadow(0 0 3px rgba(0,180,255,.25))",
          animation: isThinking ? "hex-glow 1.8s ease-in-out infinite" : "none"
        }}>
        <defs>
          <linearGradient id={`g${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00e5ff" />
            <stop offset="100%" stopColor="#1a6eff" />
          </linearGradient>
        </defs>
        <polygon points={hexPoints(36, 36, 30)} fill="none" stroke="rgba(0,229,255,0.2)" strokeWidth="0.8" />
        <polygon points={hexPoints(36, 36, 24)} fill="none" stroke="rgba(0,229,255,0.12)" strokeWidth="0.8" strokeDasharray="3 5"
          style={isThinking ? { animation: "hex-dash 3s linear infinite", transformOrigin: "36px 36px" } : {}} />
        {([[36, 6], [62.57, 21], [62.57, 51]] as [number, number][]).map(([nx, ny], i) => (
          <circle key={i} cx={nx} cy={ny} r={2} fill="#00e5ff" opacity={isThinking ? 1 : 0.5}
            style={isThinking ? { animation: "hex-node-pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.3}s` } : {}} />
        ))}
        <circle cx={lx} cy={ly} r={lr} fill="#06060f" />
        <circle cx={lx} cy={ly} r={lr} fill="none" stroke={`url(#g${size})`} strokeWidth="2" />
        <path d={`M${lx - 7} ${ly - 7} Q${lx - 3} ${ly - 11} ${lx + 3} ${ly - 10}`}
          fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" strokeLinecap="round" />
        {[{ y: ly - 2, x2: lx + 7, op: 0.42 }, { y: ly + 2, x2: lx + 4, op: 0.28 }, { y: ly + 6, x2: lx + 6, op: 0.22 }].map((l, i) => (
          <line key={i} x1={lx - 7} y1={l.y} x2={l.x2} y2={l.y}
            stroke="#00e5ff" strokeWidth="1" strokeLinecap="round" opacity={l.op}
            style={isThinking ? { animation: "hex-line-pulse 2s ease-in-out infinite", animationDelay: `${i * 0.25}s` } : {}} />
        ))}
        <circle cx={43} cy={41} r={1.5} fill="#00e5ff" opacity={0.9} />
        <line x1={43} y1={41} x2={55} y2={53} stroke={`url(#g${size})`} strokeWidth="3" strokeLinecap="square" />
      </svg>
    </div>
  );
}

// ─── Markdown ─────────────────────────────────────────────────────────────────
const codeTheme: React.CSSProperties | any = {
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
        <span style={{ fontSize: 11, fontWeight: 600, color: "#00e5ff", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>
          {language || "código"}
        </span>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
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
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [sessions, setSessions] = useState<ChatSession[]>([]); // <- ESTADO CORREGIDO

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUserEmail(user.email || "Usuario");
      setUserInitial((user.email?.[0] || "U").toUpperCase());
      setUserId(user.id);
      await loadChats(user.id);
      setIsSidebarOpen(window.innerWidth >= 1024);
      setMounted(true);
      const pendingDoc = sessionStorage.getItem("pending_doc");
      if (pendingDoc) {
        try {
          const { documentId, fileName } = JSON.parse(pendingDoc);
          sessionStorage.removeItem("pending_doc");
          const newSession = await createNewChatInDB(user.id);
          if (newSession) {
            const newDoc = await addDocumentToChat(newSession.id, documentId, fileName);
            if (newDoc) {
              const msg = `📄 **${fileName}** listo para analizar. ¿Qué quieres saber?`;
              const msgId = await saveMessage(newSession.id, "assistant", msg);
              setSessions((prev) => prev.map((s) =>
                s.id === newSession.id ? { ...s, documents: [newDoc], messages: [{ id: msgId, role: "assistant", content: msg }] } : s));
              await updateChatTitle(newSession.id, fileName.replace(/\.[^/.]+$/, "").substring(0, 28));
            }
          }
        } catch (e) { console.error("Error pending_doc:", e); }
      }
    };
    init();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [sessions]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  // ── Supabase ──────────────────────────────────────────────────────────────
  const loadChats = async (uid: string) => {
    setIsLoadingChats(true);
    try {
      const { data, error } = await supabase.from("chats")
        .select("id, title, created_at, updated_at, is_public, public_id").eq("user_id", uid).order("updated_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) { await createNewChatInDB(uid); return; }
      const ids = data.map((c) => c.id);
      const [msgRes, docRes] = await Promise.all([
        supabase.from("messages").select("id, chat_id, role, content").in("chat_id", ids).order("created_at", { ascending: true }),
        supabase.from("chat_documents").select("id, chat_id, document_id, file_name").in("chat_id", ids),
      ]);
      const msgMap: Record<string, Message[]> = {};
      (msgRes.data || []).forEach((m) => { if (!msgMap[m.chat_id]) msgMap[m.chat_id] = []; msgMap[m.chat_id].push({ id: m.id, role: m.role, content: m.content }); });
      const docMap: Record<string, ChatDocument[]> = {};
      (docRes.data || []).forEach((d) => { if (!docMap[d.chat_id]) docMap[d.chat_id] = []; docMap[d.chat_id].push({ id: d.id, documentId: d.document_id, fileName: d.file_name }); });
      const loaded = data.map((c) => ({ id: c.id, title: c.title, documents: docMap[c.id] || [], messages: msgMap[c.id] || [], createdAt: new Date(c.created_at).getTime(), isPublic: c.is_public || false, publicId: c.public_id || null }));
      setSessions(loaded);
      setActiveSessionId(loaded[0].id);
    } catch (err) { console.error("Error cargando chats:", err); }
    finally { setIsLoadingChats(false); }
  };

  const createNewChatInDB = async (uid?: string): Promise<ChatSession | null> => {
    const id = uid || userId;
    if (!id) return null;
    const { data, error } = await supabase.from("chats").insert({ user_id: id, title: "Nuevo Chat" }).select("id, title, created_at").single();
    if (error || !data) return null;
    const s: ChatSession = { id: data.id, title: data.title, documents: [], messages: [], createdAt: new Date(data.created_at).getTime() };
    setSessions((prev) => [s, ...prev]);
    setActiveSessionId(s.id);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
    return s;
  };

  const updateChatTitle = async (chatId: string, title: string) => {
    await supabase.from("chats").update({ title }).eq("id", chatId);
    setSessions((prev) => prev.map((s) => s.id === chatId ? { ...s, title } : s));
  };

  const addDocumentToChat = async (chatId: string, documentId: number, fileName: string): Promise<ChatDocument | null> => {
    const { data, error } = await supabase.from("chat_documents")
      .insert({ chat_id: chatId, document_id: documentId, file_name: fileName }).select("id, document_id, file_name").single();
    if (error || !data) return null;
    return { id: data.id, documentId: data.document_id, fileName: data.file_name };
  };

  const removeDocumentFromChat = async (chatDocId: string, chatId: string) => {
    await supabase.from("chat_documents").delete().eq("id", chatDocId);
    setSessions((prev) => prev.map((s) => s.id === chatId ? { ...s, documents: s.documents.filter((d) => d.id !== chatDocId) } : s));
  };

  const saveMessage = async (chatId: string, role: "user" | "assistant", content: string): Promise<string> => {
    const { data, error } = await supabase.from("messages").insert({ chat_id: chatId, role, content }).select("id").single();
    if (error || !data) return Date.now().toString();
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
    if (activeSessionId === id) filtered.length > 0 ? setActiveSessionId(filtered[0].id) : createNewChatInDB();
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };

  const toggleShare = async () => {
    if (!activeSession || !userId) return;
    setShareLoading(true);
    try {
      const enable = !activeSession.isPublic;
      const { data, error } = await supabase.rpc("toggle_chat_sharing", {
        p_chat_id: activeSession.id,
        p_user_id: userId,
        p_enable: enable,
      });
      if (error) throw error;
      const newPublicId = enable ? (data as string) : null;
      setSessions((prev) => prev.map((s) =>
        s.id === activeSessionId ? { ...s, isPublic: enable, publicId: newPublicId } : s
      ));
      if (enable && newPublicId) {
        const link = `${window.location.origin}/share/${newPublicId}`;
        await navigator.clipboard.writeText(link);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      }
    } catch (err) { console.error("Error al compartir:", err); }
    finally { setShareLoading(false); }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const filteredSessions = sessions.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const groupSessions = (list: ChatSession[]) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const g: Record<string, ChatSession[]> = { Hoy: [], Ayer: [], "Esta semana": [], Anterior: [] };
    list.forEach((s) => {
      const d = new Date(s.createdAt);
      if (d >= today) g["Hoy"].push(s);
      else if (d >= yesterday) g["Ayer"].push(s);
      else if (d >= weekAgo) g["Esta semana"].push(s);
      else g["Anterior"].push(s);
    });
    return g;
  };

  // ── Upload file ───────────────────────────────────────────────────────────
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;
    setIsUploading(true); setUploadError(null);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.status === 429) { setUploadError(data.error || "Límite alcanzado. Intenta más tarde."); return; }
      if (res.ok && data.documentId) {
        const doc = await addDocumentToChat(activeSession.id, data.documentId, file.name);
        if (!doc) { setUploadError("Error al vincular el documento"); return; }
        const count = activeSession.documents.length + 1;
        const msg = `📄 **${file.name}** añadido. Tienes **${count}** documento(s). ¿Qué quieres saber?`;
        const msgId = await saveMessage(activeSession.id, "assistant", msg);
        if (activeSession.documents.length === 0) await updateChatTitle(activeSession.id, file.name.replace(/\.[^/.]+$/, "").substring(0, 28));
        setSessions((prev) => prev.map((s) => s.id === activeSessionId
          ? { ...s, documents: [...s.documents, doc], messages: [...s.messages, { id: msgId, role: "assistant", content: msg }], title: s.documents.length === 0 ? file.name.replace(/\.[^/.]+$/, "").substring(0, 28) : s.title }
          : s));
      } else { setUploadError(data.error || "Error al procesar el archivo"); }
    } catch { setUploadError("Error de conexión."); }
    finally { setIsUploading(false); e.target.value = ""; }
  };

  // ── Upload URL ────────────────────────────────────────────────────────────
  const handleUploadUrl = async () => {
    if (!urlInput.trim() || !activeSession) return;
    setIsUploading(true); setUploadError(null); setShowUrlInput(false);
    const fd = new FormData(); fd.append("url", urlInput.trim());
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.status === 429) { setUploadError(data.error || "Límite alcanzado."); return; }
      if (res.ok && data.documentId) {
        const doc = await addDocumentToChat(activeSession.id, data.documentId, data.fileName);
        if (!doc) { setUploadError("Error al vincular la URL"); return; }
        const count = activeSession.documents.length + 1;
        const msg = `🌐 **${data.fileName}** analizada. Tienes **${count}** fuente(s). ¿Qué quieres saber?`;
        const msgId = await saveMessage(activeSession.id, "assistant", msg);
        if (activeSession.documents.length === 0) await updateChatTitle(activeSession.id, data.fileName.substring(0, 28));
        setSessions((prev) => prev.map((s) => s.id === activeSessionId
          ? { ...s, documents: [...s.documents, doc], messages: [...s.messages, { id: msgId, role: "assistant", content: msg }], title: s.documents.length === 0 ? data.fileName.substring(0, 28) : s.title }
          : s));
      } else { setUploadError(data.error || "Error al procesar la URL"); }
    } catch { setUploadError("Error de conexión."); }
    finally { setIsUploading(false); setUrlInput(""); }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (e?: FormEvent, overrideContent?: string) => {
    if (e) e.preventDefault();
    const cur = sessions.find((s) => s.id === activeSessionId);
    const text = overrideContent || input;
    if (!text.trim() || isLoading || !cur) return;
    const userMsgId = await saveMessage(cur.id, "user", text);
    const curMsgs = [...cur.messages, { id: userMsgId, role: "user" as const, content: text }];
    setSessions((prev) => prev.map((s) => s.id === activeSessionId ? { ...s, messages: curMsgs } : s));
    setInput(""); setIsLoading(true);
    const aiMsgId = await saveMessage(cur.id, "assistant", "");
    setSessions((prev) => prev.map((s) => s.id === activeSessionId
      ? { ...s, messages: [...s.messages, { id: aiMsgId, role: "assistant", content: "" }] } : s));
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: curMsgs, chatId: cur.id }),
      });
      if (res.status === 429) {
        const d = await res.json().catch(() => ({}));
        setRateLimitError(d.error || "Demasiados mensajes. Espera un momento.");
        setSessions((prev) => prev.map((s) => s.id === activeSessionId
          ? { ...s, messages: s.messages.filter((m) => m.id !== aiMsgId) } : s));
        await supabase.from("messages").delete().eq("id", aiMsgId);
        return;
      }
      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          aiText += decoder.decode(value);
          setSessions((prev) => prev.map((s) => s.id === activeSessionId
            ? { ...s, messages: s.messages.map((m) => m.id === aiMsgId ? { ...m, content: aiText } : m) } : s));
        }
      }
      await updateMessageContent(aiMsgId, aiText);
      if (cur.title === "Nuevo Chat") await updateChatTitle(cur.id, text.slice(0, 36) + (text.length > 36 ? "…" : ""));
    } catch (err) {
      console.error("Error:", err);
      setSessions((prev) => prev.map((s) => s.id === activeSessionId
        ? { ...s, messages: s.messages.filter((m) => m.id !== aiMsgId) } : s));
      await supabase.from("messages").delete().eq("id", aiMsgId);
    } finally { setIsLoading(false); }
  };

  const exportChat = () => {
    if (!activeSession || !activeSession.messages.length) return;
    let c = `# DocuIA\n**Chat:** ${activeSession.title}\n\n`;
    activeSession.messages.forEach((m) => { c += `### ${m.role === "user" ? "Tú" : "DocuIA"}:\n${m.content}\n\n---\n\n`; });
    const blob = new Blob([c], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `DocuIA_${activeSession.title}.md`; a.click();
  };

  const copyToClipboard = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };
  const handleEdit = (m: Message) => { setEditingMessageId(m.id); setEditValue(m.content); };
  const saveEdit = () => {
    if (!activeSession || !editingMessageId) return;
    const idx = activeSession.messages.findIndex((m) => m.id === editingMessageId);
    setSessions((prev) => prev.map((s) => s.id === activeSessionId ? { ...s, messages: s.messages.slice(0, idx) } : s));
    const t = editValue; setEditingMessageId(null); sendMessage(undefined, t);
  };

  const quickActions = [
    { id: "summary", icon: <FileText size={13} />, label: "Resumir", prompt: "Genera un resumen ejecutivo completo del documento con los puntos más importantes." },
    { id: "keypoints", icon: <Sparkles size={13} />, label: "Puntos clave", prompt: "Extrae y lista todos los puntos clave del documento en formato de viñetas." },
    { id: "questions", icon: <MessageSquare size={13} />, label: "Preguntas", prompt: "Genera 8 preguntas inteligentes sobre el contenido de este documento." },
    { id: "conclusion", icon: <CheckCircle2 size={13} />, label: "Conclusión", prompt: "¿Cuál es la conclusión principal de este documento?" },
    { id: "topics", icon: <Search size={13} />, label: "Temas", prompt: "Lista todos los temas y subtemas del documento de forma jerárquica." },
  ];

  const suggestedPrompts = [
    { icon: <FileText size={16} />, text: "Resume los puntos clave" },
    { icon: <Search size={16} />, text: "Busca información específica" },
    { icon: <Sparkles size={16} />, text: "Explícame este concepto" },
    { icon: <MessageSquare size={16} />, text: "Compara secciones" },
  ];

  if (!mounted || !activeSession) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#0d0d0d", flexDirection: "column", gap: 16 }}>
      <DocuIAIcon size={48} isThinking={true} />
      <span style={{ fontSize: 13, color: "#444", fontFamily: "system-ui" }}>Cargando tus chats…</span>
    </div>
  );

  const sessionGroups = groupSessions(filteredSessions);
  const hasDocs = activeSession.documents.length > 0;

  return (
    <>
      <style>{`
        :root {
          --bg-base:#0d0d0d; --bg-sidebar:#111; --bg-surface:#1a1a1a;
          --bg-hover:#232323; --bg-active:#2a2a2a; --bg-input:#1e1e1e;
          --border:rgba(255,255,255,.07); --border-hover:rgba(255,255,255,.13);
          --text-primary:#f0f0f0; --text-secondary:#888; --text-muted:#555;
          --accent:#00e5ff; --accent-dim:rgba(0,229,255,.1);
          --user-bubble:#1e1e1e; --success:#4ade80; --danger:#f87171; --warning:#fb923c;
        }
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg-base);color:var(--text-primary);font-family:'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif}
        .scrollbar::-webkit-scrollbar{width:4px}
        .scrollbar::-webkit-scrollbar-thumb{background:var(--border-hover);border-radius:4px}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes thinking-dot{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1.2);opacity:1}}
        @keyframes thinking-bar{0%{transform:translateX(-100%)}100%{transform:translateX(500%)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes hex-spin{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}
        @keyframes hex-spin-rev{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(-360deg)}}
        @keyframes hex-dash{from{stroke-dashoffset:0}to{stroke-dashoffset:-48}}
        @keyframes hex-glow{0%,100%{filter:drop-shadow(0 0 3px rgba(0,229,255,.5))}50%{filter:drop-shadow(0 0 10px rgba(0,229,255,1))}}
        @keyframes hex-node-pulse{0%,100%{opacity:.4}50%{opacity:1}}
        @keyframes hex-line-pulse{0%,100%{opacity:.25}50%{opacity:.75}}
        .msg-in{animation:fadeSlideUp .25s ease forwards}
        .btn-ghost{background:none;border:none;cursor:pointer;color:var(--text-secondary);transition:color .15s,background .15s;border-radius:8px}
        .btn-ghost:hover{color:var(--text-primary);background:var(--bg-hover)}
        .sidebar-item{transition:background .15s}
        .sidebar-item:hover .delete-btn{opacity:1!important}
        .group:hover .edit-btn{opacity:1!important}
        @media(max-width:768px){aside{position:fixed!important;height:100dvh}.mobile-overlay{display:block!important}.hide-mobile{display:none}}
      `}</style>

      <div style={{ display: "flex", height: "100dvh", background: "var(--bg-base)", overflow: "hidden" }}>

        {isSidebarOpen && (
          <div onClick={() => setIsSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 20, display: "none" }}
            className="mobile-overlay" />
        )}

        {/* SIDEBAR */}
        <aside style={{ width: isSidebarOpen ? 260 : 0, minWidth: isSidebarOpen ? 260 : 0, background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", transition: "width .25s ease,min-width .25s ease", overflow: "hidden", flexShrink: 0, zIndex: 30 }}>
          <div style={{ padding: "16px 12px 8px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px 16px" }}>
              <DocuIAIcon size={32} />
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>DocSkan</span>
            </div>
            <button onClick={createNewChat}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hover)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}>
              <Plus size={15} /> Nuevo chat
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "7px 10px", marginTop: 8 }}>
              <Search size={13} color="var(--text-muted)" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar chats..."
                style={{ background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontSize: 13, width: "100%" }} />
            </div>
          </div>

          <div className="scrollbar" style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
            {Object.entries(sessionGroups).map(([group, items]) => {
              if (!items.length) return null;
              return (
                <div key={group} style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: ".05em" }}>{group}</p>
                  {items.map((s) => (
                    <div key={s.id} className="sidebar-item"
                      onClick={() => { setActiveSessionId(s.id); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: activeSessionId === s.id ? "var(--bg-active)" : "transparent", border: activeSessionId === s.id ? "1px solid var(--border-hover)" : "1px solid transparent", marginBottom: 1 }}
                      onMouseEnter={(e) => { if (activeSessionId !== s.id) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-hover)"; }}
                      onMouseLeave={(e) => { if (activeSessionId !== s.id) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", flex: 1 }}>
                        <MessageSquare size={13} color={activeSessionId === s.id ? "var(--accent)" : "var(--text-muted)"} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: activeSessionId === s.id ? "var(--text-primary)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                      </div>
                      <button onClick={(e) => deleteChat(s.id, e)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, opacity: 0, flexShrink: 0, transition: "opacity .15s,color .15s" }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"}
                        className="delete-btn">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div ref={userMenuRef} style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", position: "relative" }}>
            <button onClick={() => setShowUserMenu((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", background: "none", border: "none", cursor: "pointer", borderRadius: 10, fontFamily: "inherit" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = "none"}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#00e5ff,#0066ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{userInitial}</div>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail || "Usuario"}</span>
              <ChevronDown size={14} color="var(--text-muted)" style={{ transform: showUserMenu ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            {showUserMenu && (
              <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 12, right: 12, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,.5)" }}>
                {[
                  { icon: <Download size={14} />, label: "Exportar chat", action: exportChat },
                  { icon: shareLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Link2 size={14} />, label: activeSession.isPublic ? "Desactivar link público" : "Compartir chat", action: toggleShare },
                  { icon: <FileText size={14} />, label: "Biblioteca de docs", action: () => window.location.href = "/biblioteca" },
                  { icon: <LogOut size={14} />, label: "Cerrar sesión", action: handleSignOut, danger: true },
                ].map((item) => (
                  <button key={item.label} onClick={() => { item.action(); setShowUserMenu(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", color: item.danger ? "var(--danger)" : "var(--text-secondary)", fontSize: 13, fontFamily: "inherit" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = "none"}>
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", background: "var(--bg-base)" }}>

          {/* Header */}
          <header style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setIsSidebarOpen((v) => !v)} className="btn-ghost" style={{ padding: "6px 8px" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="1.5" rx=".75" fill="currentColor" />
                  <rect x="1" y="7.25" width="14" height="1.5" rx=".75" fill="currentColor" />
                  <rect x="1" y="11.5" width="14" height="1.5" rx=".75" fill="currentColor" />
                </svg>
              </button>
              {hasDocs && (
                <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", maxWidth: 400 }}>
                  {activeSession.documents.map((doc) => (
                    <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--accent-dim)", border: "1px solid rgba(0,229,255,.2)", borderRadius: 20, padding: "3px 8px 3px 10px" }}>
                      <FileText size={11} color="var(--accent)" />
                      <span style={{ fontSize: 11, color: "var(--accent)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.fileName}</span>
                      <button onClick={() => removeDocumentFromChat(doc.id, activeSession.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,229,255,.5)", padding: "0 0 0 2px", display: "flex", alignItems: "center" }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,229,255,.5)"}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {activeSession.messages.length > 0 && (
                <button onClick={exportChat} className="btn-ghost" style={{ padding: "6px 8px" }}><Download size={15} /></button>
              )}
              <label htmlFor="header-upload"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, cursor: "pointer", background: hasDocs ? "var(--accent-dim)" : "var(--bg-surface)", border: `1px solid ${hasDocs ? "rgba(0,229,255,.25)" : "var(--border)"}`, fontSize: 12, fontWeight: 500, color: hasDocs ? "var(--accent)" : "var(--text-secondary)" }}>
                {isUploading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : hasDocs ? <CheckCircle2 size={13} /> : <Paperclip size={13} />}
                <span className="hide-mobile">{isUploading ? "Procesando..." : hasDocs ? `${activeSession.documents.length} doc.` : "Subir archivo"}</span>
              </label>
              <input id="header-upload" type="file" style={{ display: "none" }} onChange={handleUpload} accept=".pdf,.docx,.txt,image/png,image/jpeg,image/webp" disabled={isUploading} />
            </div>
          </header>

          {uploadError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.3)", padding: "10px 16px", fontSize: 13, color: "var(--danger)" }}>
              <AlertCircle size={14} /> {uploadError}
              <button onClick={() => setUploadError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}><X size={14} /></button>
            </div>
          )}
          {rateLimitError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(251,146,60,.1)", border: "1px solid rgba(251,146,60,.3)", padding: "10px 16px", fontSize: 13, color: "var(--warning)" }}>
              <AlertCircle size={14} /> {rateLimitError}
              <button onClick={() => setRateLimitError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--warning)" }}><X size={14} /></button>
            </div>
          )}

          {/* Messages */}
          <div className="scrollbar" style={{ flex: 1, overflowY: "auto", padding: "24px 16px 160px" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>

              {activeSession.messages.length === 0 && (
                <div style={{ paddingTop: 60, animation: "fadeSlideUp .4s ease" }}>
                  <div style={{ marginBottom: 20 }}><DocuIAIcon size={52} /></div>
                  <h1 style={{ fontSize: 28, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8, letterSpacing: "-0.5px" }}>¿En qué puedo ayudarte?</h1>
                  <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 32 }}>{userEmail ? `Conectado como ${userEmail}` : "Sube un documento y pregúntame lo que necesites."}</p>
                  {hasDocs ? (
                    <div>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>{activeSession.documents.length} documento(s) — acciones rápidas:</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 480 }}>
                        {quickActions.map((a) => (
                          <button key={a.id} onClick={() => sendMessage(undefined, a.prompt)}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "var(--bg-surface)", border: "1px solid rgba(0,229,255,.2)", borderRadius: 10, cursor: "pointer", color: "var(--accent)", fontSize: 13, textAlign: "left", fontFamily: "inherit" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,255,.06)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,255,.4)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,255,.2)"; }}>
                            <span style={{ opacity: .8, flexShrink: 0 }}>{a.icon}</span>{a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 480 }}>
                      {suggestedPrompts.map((p) => (
                        <button key={p.text} onClick={() => setInput(p.text)}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, textAlign: "left", fontFamily: "inherit" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hover)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}>
                          <span style={{ color: "var(--accent)", flexShrink: 0 }}>{p.icon}</span>{p.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSession.messages.map((m) => (
                <div key={m.id} className="msg-in"
                  style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 20 }}>
                  {m.role === "user" ? (
                    <div style={{ maxWidth: "75%", position: "relative" }} className="group">
                      {editingMessageId === m.id ? (
                        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 14, minWidth: 260 }}>
                          <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus rows={3}
                            style={{ width: "100%", background: "none", border: "none", outline: "none", resize: "none", color: "var(--text-primary)", fontSize: 14 }} />
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                            <button onClick={() => setEditingMessageId(null)} style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>Cancelar</button>
                            <button onClick={saveEdit} style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Re-enviar</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ position: "relative" }}>
                          <div style={{ background: "var(--user-bubble)", border: "1px solid var(--border)", borderRadius: "18px 18px 4px 18px", padding: "11px 16px", fontSize: 14, lineHeight: 1.65, color: "var(--text-primary)" }}>
                            {m.content}
                          </div>
                          <button onClick={() => handleEdit(m)}
                            style={{ position: "absolute", left: -32, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", opacity: 0, transition: "opacity .15s", padding: 4 }}
                            className="edit-btn">
                            <Edit2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 12, maxWidth: "100%", width: "100%" }}>
                      {m.content && <div style={{ marginTop: 3, flexShrink: 0 }}><DocuIAIcon size={26} /></div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {m.content ? (
                          <div style={{ position: "relative", paddingBottom: 8 }}>
                            <div style={{ fontSize: 14, lineHeight: 1.7 }}><MarkdownRenderer content={m.content} /></div>
                            <button onClick={() => copyToClipboard(m.content, m.id)}
                              style={{ marginTop: 8, padding: "4px 8px", background: "none", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-muted)", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hover)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}>
                              {copiedId === m.id ? <><Check size={12} color="var(--success)" />Copiado</> : <><Copy size={12} />Copiar</>}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0 40px", width: "100%", animation: "fadeSlideUp .3s ease" }}>
                            <div style={{ position: "relative", marginBottom: 28 }}><DocuIAIcon size={72} isThinking={true} /></div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                              <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-secondary)" }}>Pensando</span>
                              <span style={{ display: "flex", gap: 4 }}>
                                {[0, .2, .4].map((delay, i) => (
                                  <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#00e5ff", display: "inline-block", animation: "thinking-dot 1.4s ease-in-out infinite", animationDelay: `${delay}s` }} />
                                ))}
                              </span>
                            </div>
                            <div style={{ width: 200, height: 2, background: "rgba(0,229,255,.08)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: "45%", background: "linear-gradient(90deg,transparent,#00e5ff,transparent)", borderRadius: 2, animation: "thinking-bar 1.6s ease-in-out infinite" }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top,var(--bg-base) 70%,transparent)", padding: "20px 16px 24px" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              {hasDocs && (
                <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2, msOverflowStyle: "none", scrollbarWidth: "none" } as React.CSSProperties}>
                  {quickActions.map((a) => (
                    <button key={a.id} disabled={isLoading} onClick={() => sendMessage(undefined, a.prompt)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", flexShrink: 0, background: isLoading ? "transparent" : "var(--bg-surface)", border: `1px solid ${isLoading ? "var(--border)" : "rgba(0,229,255,.2)"}`, borderRadius: 20, cursor: isLoading ? "not-allowed" : "pointer", color: isLoading ? "var(--text-muted)" : "var(--accent)", fontSize: 12, fontWeight: 500, opacity: isLoading ? .4 : 1, fontFamily: "inherit", whiteSpace: "nowrap" }}
                      onMouseEnter={(e) => { if (!isLoading) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,255,.08)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,255,.45)"; } }}
                      onMouseLeave={(e) => { if (!isLoading) { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,255,.2)"; } }}>
                      <span style={{ opacity: .8 }}>{a.icon}</span>{a.label}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,.3)" }}
                onFocusCapture={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,229,255,.4)"}
                onBlurCapture={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}>
                <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={hasDocs ? `Pregunta sobre ${activeSession.documents.length === 1 ? `"${activeSession.documents[0].fileName}"` : ` ${activeSession.documents.length} documentos`}…` : "Escribe tu pregunta o sube un documento…"}
                  style={{ width: "100%", background: "none", border: "none", outline: "none", resize: "none", padding: "14px 16px 0", color: "var(--text-primary)", fontSize: 14, lineHeight: 1.6, minHeight: 52, maxHeight: 200, fontFamily: "inherit" }}
                  rows={1} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px 10px" }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    <label htmlFor="input-upload" className="btn-ghost" style={{ padding: "6px 8px", borderRadius: 8, cursor: "pointer", display: "flex" }}>
                      {isUploading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : hasDocs ? <CheckCircle2 size={16} color="var(--accent)" /> : <Paperclip size={16} />}
                    </label>
                    <input id="input-upload" type="file" style={{ display: "none" }} onChange={handleUpload} accept=".pdf,.docx,.txt,image/png,image/jpeg,image/webp" disabled={isUploading} />
                    <button className="btn-ghost" style={{ padding: "6px 8px", color: showUrlInput ? "var(--accent)" : undefined }} onClick={() => setShowUrlInput((v) => !v)} title="Analizar URL">
                      <Globe size={16} />
                    </button>
                    <button className="btn-ghost" style={{ padding: "6px 8px" }} disabled><Mic size={16} /></button>
                    <button className="btn-ghost" style={{ padding: "6px 8px" }} disabled><ImageIcon size={16} /></button>
                  </div>
                  <button onClick={() => sendMessage()} disabled={!input.trim() || isLoading}
                    style={{ width: 32, height: 32, borderRadius: 8, background: input.trim() && !isLoading ? "var(--accent)" : "var(--bg-hover)", border: "none", cursor: input.trim() && !isLoading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isLoading ? <Loader2 size={15} color="#fff" style={{ animation: "spin 1s linear infinite" }} /> : <Send size={15} color={input.trim() ? "#fff" : "var(--text-muted)"} />}
                  </button>
                </div>
                {showUrlInput && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px", display: "flex", gap: 8, alignItems: "center", animation: "fadeSlideUp .2s ease" }}>
                    <Link2 size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                    <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleUploadUrl(); }}
                      placeholder="https://ejemplo.com/articulo..." autoFocus
                      style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit" }} />
                    <button onClick={handleUploadUrl} disabled={!urlInput.trim() || isUploading}
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: urlInput.trim() ? "rgba(0,229,255,.1)" : "none", border: `1px solid ${urlInput.trim() ? "rgba(0,229,255,.3)" : "var(--border)"}`, color: urlInput.trim() ? "var(--accent)" : "var(--text-muted)", cursor: urlInput.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                      {isUploading ? "Analizando..." : "Analizar"}
                    </button>
                    <button onClick={() => { setShowUrlInput(false); setUrlInput(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}>
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
              <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                DocSkan puede cometer errores. Verifica la información importante.
              </p>
            </div>
          </div>

        </main>
      </div>

      {/* Toast: link copiado */}
      {showShareToast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#111", border: "1px solid rgba(0,229,255,0.3)", borderRadius: 12, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 100, animation: "fadeSlideUp .2s ease", whiteSpace: "nowrap" }}>
          <Check size={14} color="#4ade80" />
          <span style={{ fontSize: 13, color: "#f0f0f0" }}>Link copiado al portapapeles</span>
          <a href={`/share/${activeSession?.publicId}`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#00e5ff", textDecoration: "none", marginLeft: 4, display: "flex", alignItems: "center", gap: 4 }}>
            Ver <ExternalLink size={11} />
          </a>
        </div>
      )}
    </>
  );
}