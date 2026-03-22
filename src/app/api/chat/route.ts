import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ─── Embedding ────────────────────────────────────────────────────────────────
async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/mixedbread-ai/mxbai-embed-large-v1/pipeline/feature-extraction",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: text,
          options: { wait_for_model: true },
        }),
      },
    );
    if (!response.ok) return [];
    const result = await response.json();
    return Array.isArray(result[0]) ? result[0] : result;
  } catch (error) {
    console.error("Error embedding en chat:", error);
    return [];
  }
}

// ─── Reranking ────────────────────────────────────────────────────────────────
async function rerankChunks(query: string, chunks: any[]): Promise<any[]> {
  if (!chunks || chunks.length === 0) return [];
  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/BAAI/bge-reranker-v2-m3",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: {
            source_sentence: query,
            sentences: chunks.map((c) => c.content),
          },
        }),
      },
    );
    if (!response.ok) return chunks;
    const scores = await response.json();
    if (Array.isArray(scores)) {
      return chunks
        .map((chunk, i) => ({ ...chunk, rerank_score: scores[i] }))
        .sort((a, b) => b.rerank_score - a.rerank_score);
    }
    return chunks;
  } catch (error) {
    console.error("Error reranking:", error);
    return chunks;
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response("No autorizado", { status: 401 });
    }

    const { messages, chatId } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response("Formato de mensajes inválido", { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    let contextText = "";
    let sourcesFound = 0;
    let documentNames: string[] = [];

    // ── 1. Obtener todos los documentos del chat ───────────────────────────
    if (chatId && lastUserMessage) {
      try {
        const { data: chatDocs, error: docsError } = await supabase
          .from("chat_documents")
          .select("document_id, file_name")
          .eq("chat_id", chatId);

        if (docsError) {
          console.error("Error obteniendo documentos:", docsError.message);
        } else if (chatDocs && chatDocs.length > 0) {
          // document_id viene como number desde Postgres bigint
          const documentIds: number[] = chatDocs.map((d) =>
            Number(d.document_id),
          );
          documentNames = chatDocs.map((d) => d.file_name);

          // ── 2. Embedding de la pregunta ──────────────────────────────────
          const embedding = await getEmbedding(lastUserMessage);

          if (embedding.length > 0) {
            // ── 3. Buscar en todos los documentos del chat ─────────────────
            const { data: searchData, error: dbError } = await supabase.rpc(
              "search_document_sections",
              {
                query_embedding: embedding,
                match_threshold: 0.1,
                match_count: Math.min(10 * documentIds.length, 30),
                filter_document_ids: documentIds, // bigint[]
              },
            );

            if (dbError) {
              console.error("Error RPC:", dbError.message);
            } else if (searchData && searchData.length > 0) {
              // ── 4. Reranking global ────────────────────────────────────
              const reranked = await rerankChunks(lastUserMessage, searchData);
              const topChunks = reranked.slice(0, 8);
              sourcesFound = topChunks.length;

              // ── 5. Contexto con nombre del doc origen ──────────────────
              const docNameMap: Record<number, string> = {};
              chatDocs.forEach((d) => {
                docNameMap[Number(d.document_id)] = d.file_name;
              });

              contextText = topChunks
                .map((c: any, i: number) => {
                  const docName =
                    docNameMap[Number(c.document_id)] || "documento";
                  return `[Fragmento ${i + 1} — de "${docName}"]\n${c.content}`;
                })
                .join("\n\n---\n\n");
            }
          }
        }
      } catch (err) {
        console.error("Error buscando contexto:", err);
      }
    }

    // ── System prompt ─────────────────────────────────────────────────────
    const hasDocuments = documentNames.length > 0;
    const docList = documentNames.map((n) => `• ${n}`).join("\n");

    const systemPrompt = `Eres DocuIA, un asistente de análisis de documentos inteligente y profesional.

DOCUMENTOS ACTIVOS EN ESTE CHAT:
${
  hasDocuments
    ? `Tienes acceso a ${documentNames.length} documento(s):\n${docList}\n\n${
        sourcesFound > 0
          ? `Se encontraron ${sourcesFound} fragmentos relevantes para esta pregunta.`
          : "No se encontraron fragmentos específicos. Puedes usar tu conocimiento general."
      }`
    : "No hay documentos activos. Responde usando tu conocimiento general."
}

INSTRUCCIONES:
1. **Con contexto**: Prioriza la información de los documentos. Cita con [Fragmento N] e indica de qué documento viene si hay varios.
2. **Múltiples documentos**: Si la respuesta involucra más de un documento, relaciónalo explícitamente.
3. **Conocimiento externo**: Para preguntas generales usa tu conocimiento e indícalo con "Basado en mi conocimiento general…".
4. **Formato**: Responde en español con Markdown. Usa negritas, listas y encabezados.
5. **Tono**: Profesional, claro y directo.

${contextText ? `CONTEXTO:\n"""\n${contextText}\n"""` : ""}`;

    const result = await streamText({
      model: openrouter.chat("openrouter/free"),
      system: systemPrompt,
      messages,
      maxTokens: 1500,
      temperature: 0.7,
    } as any);

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Error en /api/chat:", error);
    return new Response(error.message || "Error interno", { status: 500 });
  }
}
