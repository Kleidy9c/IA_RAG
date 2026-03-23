/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Search, Trash2, FileText, FileImage, File,
    MessageSquare, ArrowLeft, Loader2, Plus,
    AlertCircle, X, RefreshCw, ExternalLink,
} from "lucide-react";

interface Document {
    id: number;
    name: string;
    storage_path: string;
    size_bytes: number;
    file_type: string;
    created_at: string;
    chat_count: number;
}

function formatSize(bytes: number): string {
    if (!bytes || bytes === 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "Hace un momento";
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
    return d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

function getFileIcon(fileType: string, name: string) {
    const type = (fileType || "").toLowerCase();
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext))
        return <FileImage size={18} />;
    if (type === "application/pdf" || ext === "pdf") return <FileText size={18} />;
    return <File size={18} />;
}

function getFileColor(fileType: string, name: string): string {
    const type = (fileType || "").toLowerCase();
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (type.startsWith("image/")) return "#a78bfa";
    if (type === "application/pdf" || ext === "pdf") return "#f87171";
    if (ext === "docx") return "#60a5fa";
    return "#00e5ff";
}

export default function BibliotecaPage() {
    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [documents, setDocuments] = useState<Document[]>([]);
    const [filtered, setFiltered] = useState<Document[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Document | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<"date" | "name" | "size" | "chats">("date");

    const loadDocuments = useCallback(async (uid: string) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc("get_user_documents", { p_user_id: uid });
            if (rpcError) throw rpcError;
            setDocuments(data || []);
            setFiltered(data || []);
        } catch (err: any) {
            setError(err.message || "Error cargando documentos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            setUserId(user.id);
            await loadDocuments(user.id);
        };
        init();
    }, []);

    useEffect(() => {
        let result = documents.filter((d) =>
            d.name.toLowerCase().includes(search.toLowerCase())
        );
        result = [...result].sort((a, b) => {
            if (sortBy === "name") return a.name.localeCompare(b.name);
            if (sortBy === "size") return b.size_bytes - a.size_bytes;
            if (sortBy === "chats") return Number(b.chat_count) - Number(a.chat_count);
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setFiltered(result);
    }, [search, documents, sortBy]);

    const deleteDocument = async (doc: Document) => {
        setDeletingId(doc.id);
        try {
            await supabase.from("document_sections").delete().eq("document_id", doc.id);
            await supabase.from("chat_documents").delete().eq("document_id", doc.id);
            const { error } = await supabase.from("documents").delete().eq("id", doc.id);
            if (error) throw error;
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        } catch (err: any) {
            setError(err.message || "Error al eliminar");
        } finally {
            setDeletingId(null);
            setConfirmDelete(null);
        }
    };

    const useInNewChat = (doc: Document) => {
        sessionStorage.setItem("pending_doc", JSON.stringify({
            documentId: doc.id,
            fileName: doc.name,
        }));
        router.push("/");
    };

    const totalDocs = documents.length;
    const totalSize = documents.reduce((acc, d) => acc + (d.size_bytes || 0), 0);
    const totalChats = documents.reduce((acc, d) => acc + Number(d.chat_count || 0), 0);

    return (
        <>
            <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d0d; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .doc-card { transition: border-color .15s, background .15s; }
        .doc-card:hover { border-color: rgba(0,229,255,0.3) !important; background: #121220 !important; }
        .sort-btn { background:none; border:none; cursor:pointer; transition:color .15s; font-family:inherit; }
        .sort-btn:hover { color: #f0f0f0 !important; }
        .btn-danger:hover { background:rgba(248,113,113,0.12) !important; color:#f87171 !important; border-color:rgba(248,113,113,0.25) !important; }
        .btn-action:hover { background:rgba(0,229,255,0.08) !important; color:#00e5ff !important; border-color:rgba(0,229,255,0.25) !important; }
        input::placeholder { color:#444; }
        input:focus { outline:none; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }
        @media(max-width:600px){ .hide-mobile{display:none!important} }
      `}</style>

            <div style={{
                minHeight: "100dvh", background: "#0d0d0d", color: "#f0f0f0",
                fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif"
            }}>

                {/* Header */}
                <header style={{
                    height: 56, display: "flex", alignItems: "center",
                    justifyContent: "space-between", padding: "0 24px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    background: "#0d0d0d", position: "sticky", top: 0, zIndex: 10
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Link href="/" style={{
                            display: "flex", alignItems: "center", gap: 6,
                            color: "#555", textDecoration: "none", fontSize: 13, transition: "color .15s"
                        }}
                            onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.color = "#f0f0f0"}
                            onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.color = "#555"}>
                            <ArrowLeft size={15} /> Volver al chat
                        </Link>
                        <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
                        <h1 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px" }}>
                            Biblioteca de documentos
                        </h1>
                    </div>
                    <button onClick={() => router.push("/")} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", background: "rgba(0,229,255,0.08)",
                        border: "1px solid rgba(0,229,255,0.2)", borderRadius: 20,
                        color: "#00e5ff", fontSize: 12, fontWeight: 500,
                        cursor: "pointer", fontFamily: "inherit", transition: "all .15s"
                    }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,255,0.14)"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,229,255,0.08)"}>
                        <Plus size={13} /> Nuevo chat
                    </button>
                </header>

                <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>

                    {/* Stats */}
                    {!loading && (
                        <div style={{
                            display: "grid", gridTemplateColumns: "repeat(3,1fr)",
                            gap: 10, marginBottom: 24, animation: "fadeUp 0.3s ease"
                        }}>
                            {[
                                { label: "Documentos", value: String(totalDocs), color: "#00e5ff" },
                                { label: "Tamaño total", value: formatSize(totalSize), color: "#a78bfa" },
                                { label: "Usos en chats", value: String(totalChats), color: "#4ade80" },
                            ].map((stat) => (
                                <div key={stat.label} style={{
                                    background: "#111",
                                    border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px"
                                }}>
                                    <div style={{
                                        fontSize: 11, color: "#555", marginBottom: 4,
                                        textTransform: "uppercase", letterSpacing: ".05em"
                                    }}>{stat.label}</div>
                                    <div style={{
                                        fontSize: 22, fontWeight: 700, color: stat.color,
                                        letterSpacing: "-0.5px"
                                    }}>{stat.value}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Search + Sort */}
                    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{
                            flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8,
                            background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 10, padding: "9px 12px"
                        }}>
                            <Search size={14} color="#444" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nombre..."
                                style={{
                                    background: "none", border: "none", color: "#f0f0f0",
                                    fontSize: 13, width: "100%", fontFamily: "inherit"
                                }} />
                            {search && (
                                <button onClick={() => setSearch("")} style={{
                                    background: "none",
                                    border: "none", cursor: "pointer", color: "#444", padding: 0
                                }}>
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        <div style={{
                            display: "flex", alignItems: "center", gap: 4,
                            background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 10, padding: "7px 10px"
                        }}>
                            <span style={{ fontSize: 11, color: "#444", marginRight: 4 }}>Ordenar:</span>
                            {[
                                { key: "date", label: "Fecha" },
                                { key: "name", label: "Nombre" },
                                { key: "size", label: "Tamaño" },
                                { key: "chats", label: "Usos" },
                            ].map((opt) => (
                                <button key={opt.key} onClick={() => setSortBy(opt.key as any)}
                                    className="sort-btn"
                                    style={{
                                        fontSize: 12, padding: "3px 8px", borderRadius: 6,
                                        color: sortBy === opt.key ? "#00e5ff" : "#555",
                                        background: sortBy === opt.key ? "rgba(0,229,255,0.08)" : "none"
                                    }}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => userId && loadDocuments(userId)}
                            style={{
                                background: "none", border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: 10, padding: "9px 10px", cursor: "pointer",
                                color: "#555", display: "flex", alignItems: "center", transition: "color .15s"
                            }}
                            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = "#f0f0f0"}
                            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = "#555"}>
                            <RefreshCw size={14} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 8,
                            background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
                            borderRadius: 10, padding: "10px 14px", marginBottom: 16,
                            fontSize: 13, color: "#f87171"
                        }}>
                            <AlertCircle size={14} /> {error}
                            <button onClick={() => setError(null)} style={{
                                marginLeft: "auto",
                                background: "none", border: "none", cursor: "pointer", color: "#f87171"
                            }}>
                                <X size={13} />
                            </button>
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", padding: "60px 0", gap: 12, color: "#444"
                        }}>
                            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#00e5ff" }} />
                            <span style={{ fontSize: 13 }}>Cargando tu biblioteca…</span>
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && filtered.length === 0 && (
                        <div style={{ textAlign: "center", padding: "60px 0", animation: "fadeUp 0.3s ease" }}>
                            <FileText size={40} color="#222" style={{ margin: "0 auto 16px" }} />
                            <p style={{ fontSize: 15, color: "#555", marginBottom: 8 }}>
                                {search ? `Sin resultados para "${search}"` : "Aún no tienes documentos"}
                            </p>
                            <p style={{ fontSize: 13, color: "#333" }}>
                                {search ? "Prueba con otro término" : "Sube tu primer documento desde el chat"}
                            </p>
                        </div>
                    )}

                    {/* Document list */}
                    {!loading && filtered.length > 0 && (
                        <div style={{
                            display: "flex", flexDirection: "column", gap: 8,
                            animation: "fadeUp 0.3s ease"
                        }}>
                            {filtered.map((doc) => {
                                const color = getFileColor(doc.file_type, doc.name);
                                const isDeleting = deletingId === doc.id;
                                return (
                                    <div key={doc.id} className="doc-card" style={{
                                        display: "flex", alignItems: "center", gap: 14,
                                        background: "#111", border: "1px solid rgba(255,255,255,0.07)",
                                        borderRadius: 12, padding: "14px 16px",
                                        opacity: isDeleting ? 0.5 : 1, transition: "opacity .2s"
                                    }}>

                                        {/* File icon */}
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                            background: `${color}14`, border: `1px solid ${color}30`,
                                            display: "flex", alignItems: "center", justifyContent: "center", color
                                        }}>
                                            {getFileIcon(doc.file_type, doc.name)}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 14, fontWeight: 500, color: "#f0f0f0",
                                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4
                                            }}>
                                                {doc.name}
                                            </div>
                                            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                                <span style={{ fontSize: 11, color: "#444" }}>{formatDate(doc.created_at)}</span>
                                                <span style={{ fontSize: 11, color: "#2a2a2a" }}>·</span>
                                                <span style={{ fontSize: 11, color: "#444" }}>{formatSize(doc.size_bytes)}</span>
                                                <span style={{ fontSize: 11, color: "#2a2a2a" }}>·</span>
                                                <span style={{
                                                    fontSize: 11,
                                                    color: Number(doc.chat_count) > 0 ? "#4ade80" : "#444",
                                                    display: "flex", alignItems: "center", gap: 3
                                                }}>
                                                    <MessageSquare size={10} />
                                                    {Number(doc.chat_count)} chat{Number(doc.chat_count) !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                                            <button onClick={() => useInNewChat(doc)} className="btn-action"
                                                title="Usar en nuevo chat"
                                                style={{
                                                    display: "flex", alignItems: "center", gap: 5,
                                                    padding: "6px 10px", background: "none",
                                                    border: "1px solid rgba(255,255,255,0.08)",
                                                    borderRadius: 8, cursor: "pointer", color: "#555",
                                                    fontSize: 12, transition: "all .15s", fontFamily: "inherit",
                                                    whiteSpace: "nowrap"
                                                }}>
                                                <ExternalLink size={12} />
                                                <span className="hide-mobile">Usar en chat</span>
                                            </button>
                                            <button onClick={() => setConfirmDelete(doc)}
                                                disabled={isDeleting} className="btn-danger"
                                                style={{
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    width: 32, height: 32, background: "none",
                                                    border: "1px solid rgba(255,255,255,0.08)",
                                                    borderRadius: 8, cursor: "pointer", color: "#555", transition: "all .15s"
                                                }}>
                                                {isDeleting
                                                    ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                                                    : <Trash2 size={13} />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Counter */}
                    {!loading && filtered.length > 0 && (
                        <p style={{ fontSize: 12, color: "#333", textAlign: "center", marginTop: 16 }}>
                            {filtered.length} de {documents.length} documento{documents.length !== 1 ? "s" : ""}
                        </p>
                    )}
                </main>
            </div>

            {/* Modal confirmación eliminar */}
            {confirmDelete && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 50, padding: 16
                }}>
                    <div style={{
                        background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 16, padding: "24px", maxWidth: 380, width: "100%",
                        animation: "fadeUp 0.2s ease"
                    }}>
                        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                            Eliminar documento
                        </h2>
                        <p style={{ fontSize: 13, color: "#888", marginBottom: 6, lineHeight: 1.6 }}>
                            ¿Eliminar <strong style={{ color: "#f0f0f0" }}>{confirmDelete.name}</strong>?
                        </p>
                        {Number(confirmDelete.chat_count) > 0 && (
                            <div style={{
                                display: "flex", alignItems: "flex-start", gap: 7,
                                background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)",
                                borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 12,
                                color: "#fb923c", lineHeight: 1.5
                            }}>
                                <AlertCircle size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                                Este documento está en {Number(confirmDelete.chat_count)} chat{Number(confirmDelete.chat_count) !== 1 ? "s" : ""}.
                                Se eliminará de todos ellos y no se podrá recuperar.
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                            <button onClick={() => setConfirmDelete(null)}
                                style={{
                                    padding: "8px 16px", background: "none",
                                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                                    color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                                    transition: "color .15s"
                                }}
                                onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.color = "#f0f0f0"}
                                onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.color = "#888"}>
                                Cancelar
                            </button>
                            <button onClick={() => deleteDocument(confirmDelete)}
                                style={{
                                    padding: "8px 16px", background: "rgba(248,113,113,0.12)",
                                    border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8,
                                    color: "#f87171", fontSize: 13, fontWeight: 500,
                                    cursor: "pointer", fontFamily: "inherit", transition: "all .15s"
                                }}
                                onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.2)"}
                                onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.12)"}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
