"use client";
import { useState, ChangeEvent, useEffect, useRef, FormEvent } from "react";
import {
  Send,
  Upload,
  Loader2,
  Sparkles,
  Menu,
  X,
  CheckCircle2,
  MessageSquare,
  Trash2,
  Plus,
  Paperclip,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("documind_v3");
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

    if (window.innerWidth >= 1024) setIsSidebarOpen(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && sessions.length > 0)
      localStorage.setItem("documind_v3", JSON.stringify(sessions));
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
        title: "Nuevo Chat",
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
                      content: `Documento **${file.name}** cargado y analizado en mi memoria. ¿Qué te gustaría saber sobre él?`,
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
    <div className="flex h-[100dvh] bg-white text-[#1f1f1f] overflow-hidden relative font-sans">
      {/* OVERLAY PARA MÓVILES */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR GEMINI STYLE */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-30 w-[280px] bg-[#f0f4f9] flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-black/5 rounded-full text-gray-600"
          >
            <Menu size={24} />
          </button>
        </div>

        <div className="px-4 mb-4">
          <button
            onClick={createNewChat}
            className="flex items-center gap-3 bg-white hover:bg-gray-50 text-[#1f1f1f] px-4 py-3 rounded-full shadow-sm border border-gray-100 transition-all font-medium text-sm w-max"
          >
            <Plus size={20} className="text-gray-600" />
            Nuevo Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-0.5 custom-scrollbar pb-6 mt-4">
          <p className="px-3 text-xs font-semibold text-gray-500 mb-2">
            Recientes
          </p>
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                setActiveSessionId(s.id);
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={`group flex items-center justify-between p-3 rounded-full cursor-pointer transition-colors ${activeSessionId === s.id ? "bg-[#d3e3fd] text-[#041e49]" : "hover:bg-black/5 text-[#444746]"}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className="shrink-0" />
                <span className="text-sm truncate font-medium">{s.title}</span>
              </div>
              <button
                onClick={(e) => deleteChat(s.id, e)}
                className="opacity-0 lg:group-hover:opacity-100 opacity-100 lg:opacity-0 hover:text-red-500 transition-all p-1.5"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative w-full h-[100dvh]">
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
              >
                <Menu size={24} />
              </button>
            )}
            <span className="font-medium text-xl text-gray-700 tracking-tight flex items-center gap-2">
              DocuIA <Sparkles size={18} className="text-blue-500" />
            </span>
          </div>

          <div className="flex items-center gap-3">
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
              accept=".pdf,.docx,.txt,image/png,image/jpeg,image/webp"
              disabled={isUploading}
            />
            <div className="border-l pl-3 ml-1 h-6 flex items-center border-gray-200">
              <UserButton />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-36 lg:p-10">
          <div className="max-w-3xl mx-auto space-y-8">
            {activeSession.messages.length === 0 && (
              <div className="py-12 sm:py-24 animate-in fade-in">
                <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                  Hola, ¿en qué te puedo ayudar hoy?
                </h1>
                <p className="text-gray-500 text-lg mb-10">
                  Sube un documento y pregúntame lo que necesites saber.
                </p>
              </div>
            )}

            {activeSession.messages.map((m) => (
              <div
                key={m.id}
                className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* MENSAJE USUARIO - Estilo burbuja limpia derecha */}
                {m.role === "user" ? (
                  <div className="max-w-[85%] bg-[#f0f4f9] text-[#1f1f1f] px-5 py-3.5 rounded-[24px] rounded-tr-sm text-[15px] leading-relaxed">
                    {m.content}
                  </div>
                ) : (
                  /* MENSAJE IA - Estilo texto plano izquierda con icono Sparkle */
                  <div className="flex gap-4 max-w-[95%] sm:max-w-[85%] animate-in fade-in slide-in-from-bottom-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={24} className="text-blue-600" />
                    </div>
                    <div className="text-[15px] leading-relaxed text-[#1f1f1f] pt-1">
                      <div className="whitespace-pre-wrap">
                        {m.content || (
                          <div className="flex gap-1.5 pt-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* INPUT FIJO ESTILO GEMINI */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-white via-white to-transparent pt-10 pb-[env(safe-area-inset-bottom,24px)] px-4">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={sendMessage}
              className="flex items-end gap-2 bg-[#f0f4f9] rounded-[28px] pl-4 pr-2 py-2 focus-within:ring-1 ring-gray-200 transition-all shadow-sm"
            >
              {/* Botón de Upload integrado en el input */}
              <label
                htmlFor="file-upload"
                className={`p-2.5 rounded-full cursor-pointer transition-colors shrink-0 mb-0.5 flex items-center justify-center ${activeSession.documentId ? "text-blue-600 hover:bg-blue-50" : "text-gray-500 hover:bg-gray-200"}`}
                title="Adjuntar archivo"
              >
                {isUploading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : activeSession.documentId ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <Paperclip size={20} />
                )}
              </label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept=".pdf,.docx,.txt,image/png,image/jpeg,image/webp"
                disabled={isUploading}
              />

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
                    ? "Pregunta sobre el documento..."
                    : "Escribe tu pregunta aquí..."
                }
                className="flex-1 bg-transparent border-none outline-none py-3 px-2 resize-none max-h-48 min-h-[48px] text-[15px] text-[#1f1f1f] placeholder:text-gray-500 custom-scrollbar"
                rows={1}
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-transparent transition-all mb-0.5 shrink-0"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin text-blue-600" />
                ) : (
                  <Send
                    size={20}
                    className={input.trim() ? "text-blue-600" : ""}
                  />
                )}
              </button>
            </form>
            <p className="text-center text-xs text-gray-400 mt-3 font-medium">
              DocuMind AI puede cometer errores. Verifica la información
              importante.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
