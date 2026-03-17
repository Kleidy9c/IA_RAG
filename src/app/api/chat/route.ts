import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/mixedbread-ai/mxbai-embed-large-v1/pipeline/feature-extraction",
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    },
  );
  const result = await response.json();
  return Array.isArray(result[0]) ? result[0] : result;
}

export async function POST(req: Request) {
  try {
    const { messages, documentId } = await req.json();

    // MEMORIA DE CONTEXTO: Tomamos los últimos 3 mensajes para la búsqueda vectorial
    // Así la IA no se pierde si le dices "y qué más dice sobre eso?"
    const recentMessages = messages.slice(-3);
    const contextQuery = recentMessages.map((m: any) => m.content).join("\n");

    let contextText = "";
    const cleanId = documentId ? Number(documentId) : null;

    if (cleanId) {
      try {
        // Buscamos usando el contexto de la conversación, no solo el último mensaje
        const embedding = await getEmbedding(contextQuery);

        const { data: searchData, error: dbError } = await supabase.rpc(
          "search_document_sections",
          {
            query_embedding: embedding,
            match_threshold: 0.15,
            match_count: 15,
            filter_document_id: cleanId,
          },
        );

        if (!dbError && searchData && searchData.length > 0) {
          contextText = searchData
            .map((c: any) => c.content)
            .join("\n\n---\n\n");
        }
      } catch (err) {
        console.error("Error DB:", err);
      }
    }

    const systemPrompt = `Eres DocuMind AI, un asistente experto en análisis de documentos. 
    Tu memoria está anclada al documento proporcionado.
    
    INSTRUCCIONES:
    1. Responde basándote ÚNICAMENTE en el CONTEXTO DEL DOCUMENTO.
    2. Si te hacen una pregunta de seguimiento, usa el historial de la conversación y el contexto para dar una respuesta coherente.
    3. Si la respuesta no está en el contexto, di amablemente que no encuentras esa información en el documento actual.
    
    CONTEXTO DEL DOCUMENTO:
    ${contextText || "No hay información relevante en la base de datos para esta consulta."}`;

    const result = await streamText({
      model: openrouter.chat("meta-llama/llama-3.1-8b-instruct"),
      system: systemPrompt,
      messages: messages, // Pasamos todo el historial al LLM
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
