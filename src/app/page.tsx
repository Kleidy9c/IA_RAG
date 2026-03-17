"use client";
import { useState, ChangeEvent, useEffect, useRef, FormEvent } from "react";
import {
  Send,
  Upload,
  Loader2,
  Bot,
  User,
  Plus,
  Menu,
  X,
  CheckCircle2,
  MessageSquare,
  Trash2,
  File,
} from "lucide-react";

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
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Por defecto cerrado en móvil
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("documind_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
        } else initialSession();
      } catch (e) {
        initialSession();
      }
    } else initialSession();

    // Si estamos en PC, abrimos el sidebar al cargar
    if (window.innerWidth >= 1024) setIsSidebarOpen(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && sessions.length > 0)
      localStorage.setItem("documind_v2", JSON.stringify(sessions));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, mounted]);

  const initialSession = () => {
    const newId = Date.now().toString();
    setSessions([
      {
        id: newId,
        title: "Nuevo Chat",
        documentId: null,
        fileName: null,
        messages: [],
      },
    ]);
    setActiveSessionId(newId);
  };

  const createNewChat = () => {
    const newId = Date.now().toString();
    setSessions((prev) => [
      {
        id: newId,
        title: "Nueva consulta",
        documentId: null,
        fileName: null,
        messages: [],
      },
      ...prev,
    ]);
    setActiveSessionId(newId);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id && filtered.length > 0)
      setActiveSessionId(filtered[0].id);
    else if (filtered.length === 0) initialSession();
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;
    setIsUploading(true);
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
                  title: file.name.substring(0, 20),
                  messages: [
                    ...s.messages,
                    {
                      id: Date.now().toString(),
                      role: "assistant",
                      content: `✅ He analizado **${file.name}**. ¿Qué información necesitas buscar en él?`,
                    },
                  ],
                }
              : s,
          ),
        );
      } else alert("Error: " + (data.error || "No valid ID"));
    } catch (err) {
      alert("Error de conexión");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const currentSession = sessions.find((s) => s.id === activeSessionId);
    if (!input.trim() || isLoading || !currentSession) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
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
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || !activeSession) return null;

  return (
    <div className="flex h-[100dvh] bg-[#f9fafb] text-gray-800 overflow-hidden relative">
      {/* OVERLAY PARA MÓVILES CUANDO EL SIDEBAR ESTÁ ABIERTO */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR RESPONSIVO */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-30 w-80 bg-[#0f172a] text-gray-300 flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 shadow-2xl lg:shadow-none`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white text-xl">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <File size={20} />
            </div>
            <span>DocuMind</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white p-2"
          >
            <X size={24} />
          </button>
        </div>

        <button
          onClick={createNewChat}
          className="mx-4 mb-6 flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-all text-white font-medium border border-white/10 group"
        >
          <Plus
            size={20}
            className="text-blue-400 group-hover:scale-110 transition-transform"
          />{" "}
          Nuevo Chat
        </button>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar pb-6">
          <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
            Historial
          </p>
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                setActiveSessionId(s.id);
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={`group flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${activeSessionId === s.id ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "hover:bg-white/5 text-gray-400"}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={18} className="shrink-0" />
                <div className="flex flex-col truncate">
                  <span className="text-sm truncate font-medium">
                    {s.title}
                  </span>
                  {s.fileName && (
                    <span className="text-[10px] opacity-60 truncate">
                      📄 {s.fileName}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => deleteChat(s.id, e)}
                className="opacity-0 lg:group-hover:opacity-100 opacity-100 lg:opacity-0 hover:text-red-400 transition-all p-2"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative w-full h-[100dvh]">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b bg-white/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg text-gray-600"
            >
              <Menu size={24} />
            </button>
            <div className="font-semibold text-gray-700 truncate text-sm sm:text-base">
              {activeSession.title}
            </div>
          </div>
          <label
            htmlFor="file-upload"
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold cursor-pointer transition-all shrink-0 ${activeSession.documentId ? "bg-blue-50 border border-blue-200 text-blue-700" : "bg-blue-600 text-white"}`}
          >
            {isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : activeSession.documentId ? (
              <CheckCircle2 size={16} />
            ) : (
              <Upload size={16} />
            )}
            <span className="hidden sm:inline">
              {isUploading
                ? "Analizando..."
                : activeSession.documentId
                  ? "Doc. Activo"
                  : "Subir Archivo"}
            </span>
          </label>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.docx,.txt"
            disabled={isUploading}
          />
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:p-10">
          <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
            {activeSession.messages.length === 0 && (
              <div className="py-10 sm:py-20 text-center animate-in fade-in">
                <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-white shadow-xl rotate-3">
                  <Bot size={32} className="sm:hidden" />
                  <Bot size={48} className="hidden sm:block" />
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-800 mb-3">
                  DocuMind AI
                </h2>
                <p className="text-slate-500 text-sm sm:text-lg max-w-xs sm:max-w-sm mx-auto px-4">
                  Sube un PDF o Word para empezar a consultar tu información.
                </p>
              </div>
            )}
            {activeSession.messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex gap-3 max-w-[95%] sm:max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 mt-1 ${m.role === "user" ? "bg-slate-800 text-white" : "bg-blue-600 text-white"}`}
                  >
                    {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div
                    className={`p-3 sm:p-5 rounded-2xl leading-relaxed text-sm sm:text-[15px] ${m.role === "user" ? "bg-white border border-gray-200 shadow-sm" : "bg-blue-50/50 border border-blue-100"}`}
                  >
                    <div className="whitespace-pre-wrap">
                      {m.content || (
                        <Loader2
                          size={16}
                          className="animate-spin text-blue-400"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        </div>

        {/* INPUT FIJO ABAJO EN MÓVILES (Safe Area) */}
        <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 p-3 sm:p-6 pb-[env(safe-area-inset-bottom,16px)]">
          <form
            onSubmit={sendMessage}
            className="max-w-3xl mx-auto flex items-end gap-2 sm:gap-3 bg-gray-100 p-1.5 sm:p-2 rounded-[24px] focus-within:bg-white focus-within:ring-2 ring-blue-500/20 border border-transparent focus-within:border-blue-400 transition-all"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={
                activeSession.documentId
                  ? "Pregunta al documento..."
                  : "Escribe aquí..."
              }
              className="flex-1 bg-transparent border-none outline-none p-3 sm:p-4 resize-none max-h-32 min-h-[48px] text-sm sm:text-base text-gray-700"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 text-white p-3 sm:p-4 rounded-full disabled:bg-gray-300 transition-all mb-0.5 mr-0.5 shrink-0"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
