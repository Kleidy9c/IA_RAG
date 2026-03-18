import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// 1. Obtener Embedding Inicial
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
    const result = await response.json();
    return Array.isArray(result[0]) ? result[0] : result;
  } catch (error) {
    console.error("Error al crear embedding en el chat:", error);
    return [];
  }
}

// 2. NUEVO: Reranking (Re-ordenamiento inteligente)
async function rerankChunks(query: string, chunks: any[]): Promise<any[]> {
  if (!chunks || chunks.length === 0) return [];
  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/BAAI/bge-reranker-base",
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

    if (!response.ok) return chunks; // Fallback si falla el reranker

    const scores = await response.json();

    // Si la API devuelve un array de puntuaciones, ordenamos los chunks
    if (Array.isArray(scores)) {
      const scoredChunks = chunks.map((chunk, index) => ({
        ...chunk,
        rerank_score: scores[index],
      }));
      // Ordenar de mayor a menor puntuación
      return scoredChunks.sort((a, b) => b.rerank_score - a.rerank_score);
    }
    return chunks;
  } catch (error) {
    console.error("Error en Reranking:", error);
    return chunks; // Fallback a la búsqueda original de Supabase si falla
  }
}

export async function POST(req: Request) {
  try {
    // PROTECCIÓN DE SEGURIDAD
    const { userId } = await auth();
    if (!userId) return new Response("No autorizado", { status: 401 });

    const { messages, documentId } = await req.json();

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    let contextText = "";

    if (documentId && lastUserMessage) {
      console.log("Buscando contexto para el documento ID:", documentId);

      try {
        const embedding = await getEmbedding(lastUserMessage);

        if (embedding.length > 0) {
          // 1. Buscamos más resultados iniciales en Supabase (ej: 15) para tener de dónde elegir
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
            console.error(
              "Error en búsqueda RPC de Supabase:",
              dbError.message,
            );
          } else if (searchData && searchData.length > 0) {
            // 2. RERANKING: Pasamos los 15 resultados por el modelo bge-reranker
            const rerankedData = await rerankChunks(
              lastUserMessage,
              searchData,
            );

            // 3. Tomamos solo los 5 mejores después de re-ordenar
            const topChunks = rerankedData.slice(0, 5);

            // 4. CITAS: Formateamos el texto inyectando el ID o número de página para que la IA lo vea
            contextText = topChunks
              .map((c: any) => `[Referencia: Fragmento ${c.id}]\n${c.content}`)
              .join("\n\n---\n\n");

            console.log("Contexto re-ordenado y listo para el LLM.");
          }
        }
      } catch (err) {
        console.error("Error al obtener contexto DB:", err);
      }
    }

    // PROMPT MEJORADO CON REGLAS DE CITAS
    const systemPrompt = `Eres un asistente experto en análisis de documentos, con un estilo profesional y directo. 
Tu memoria está estrictamente anclada a la información proporcionada a continuación.
    
INSTRUCCIONES CRÍTICAS:
1. Responde basándote ÚNICAMENTE en el CONTEXTO proporcionado.
2. Si la respuesta no está en el contexto, di amablemente: "Esa información no se encuentra en el documento analizado."
3. CITAS OBLIGATORIAS: Cada vez que afirmes algo basado en el contexto, debes citar la referencia exacta al final de la oración usando el formato [Referencia: Fragmento X]. Por ejemplo: "El sol ilumina el camino [Referencia: Fragmento 65]."
4. Responde siempre en español, usa un formato limpio con viñetas o negritas si ayuda a la legibilidad.

CONTEXTO DEL DOCUMENTO:
"""
${contextText || "No se encontró información en la base de datos."}
"""`;

    const result = await streamText({
      model: openrouter.chat("meta-llama/llama-3.1-8b-instruct"),
      system: systemPrompt,
      messages: messages,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Error general en el chat:", error);
    return new Response(error.message, { status: 500 });
  }
}
