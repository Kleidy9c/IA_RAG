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
    // Auth con Supabase SSR
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

    const { messages, documentId } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response("Formato de mensajes inválido", { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    let contextText = "";
    let sourcesFound = 0;

    // ── Búsqueda RAG si hay documento activo ──
    if (documentId && lastUserMessage) {
      try {
        const embedding = await getEmbedding(lastUserMessage);

        if (embedding.length > 0) {
          const { data: searchData, error: dbError } = await supabase.rpc(
            "search_document_sections",
            {
              query_embedding: embedding,
              match_threshold: 0.1,
              match_count: 15,
              filter_document_id: documentId,
            },
          );

          if (dbError) {
            console.error("Error RPC Supabase:", dbError.message);
          } else if (searchData && searchData.length > 0) {
            // Reranking + top 5
            const reranked = await rerankChunks(lastUserMessage, searchData);
            const topChunks = reranked.slice(0, 5);
            sourcesFound = topChunks.length;

            contextText = topChunks
              .map(
                (c: any, i: number) =>
                  `[Fragmento ${i + 1} — ID: ${c.id}]\n${c.content}`,
              )
              .join("\n\n---\n\n");
          }
        }
      } catch (err) {
        console.error("Error buscando contexto:", err);
      }
    }

    // ── System prompt ──
    const systemPrompt = `Eres DocuIA, un asistente de análisis de documentos inteligente y profesional.

MODO DE OPERACIÓN:
${
  documentId
    ? `Tienes acceso a un documento del usuario. ${
        sourcesFound > 0
          ? `Se encontraron ${sourcesFound} fragmentos relevantes para responder.`
          : "No se encontraron fragmentos específicos, pero puedes usar tu conocimiento general."
      }`
    : "No hay documento activo. Responde usando tu conocimiento general."
}

INSTRUCCIONES:
1. **Con contexto del documento**: Prioriza siempre la información del documento. Cita los fragmentos usando [Fragmento N].
2. **Expansión con conocimiento externo**: Si el usuario pide sugerencias, mejoras o preguntas generales, usa también tu conocimiento global y menciona cuándo lo haces.
3. **Transparencia**: Si aportas información que NO está en el documento, indícalo brevemente (ej: "Basado en mi conocimiento general…").
4. **Formato**: Responde en español. Usa formato Markdown: negritas, listas y encabezados para estructurar mejor las respuestas largas. Sé conciso pero completo.
5. **Tono**: Profesional, claro y directo. Evita introducciones largas.

${contextText ? `CONTEXTO DEL DOCUMENTO:\n"""\n${contextText}\n"""` : ""}`;

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
