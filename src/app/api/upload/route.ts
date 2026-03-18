import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { InferenceClient } from "@huggingface/inference";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

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
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file)
      return NextResponse.json({ error: "No hay archivo" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText = "";

    // --- EXTRACCIÓN DE TEXTO ---
    if (file.type.startsWith("image/")) {
      const base64Image = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64Image}`;

      // Usamos el modelo de visión con wait_for_model para evitar el error de "busy"
      const response = await client.chatCompletion({
        model: "Qwen/Qwen3.5-9B",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transcribe exactamente el texto de esta imagen. Si no hay texto, describe la imagen brevemente.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 1000,
      });
      rawText = response.choices[0]?.message?.content || "";
    } else if (file.name.endsWith(".pdf")) {
      const pdfModule = (await import("pdf-parse")) as any;
      const pdf = pdfModule.default || pdfModule;
      const data = await pdf(buffer);
      rawText = data.text;
    } else {
      rawText = buffer.toString("utf-8");
    }

    const finalText =
      rawText.trim() || "No se pudo extraer texto claro de este archivo.";

    // 1. Insertar Documento Principal
    const { data: docData, error: docError } = await supabase
      .from("documents")
      .insert({
        name: file.name,
        storage_path: `uploads/${Date.now()}-${file.name}`,
        user_id: userId,
      })
      .select("id")
      .single();

    if (docError) throw docError;

    // 2. Fragmentación y Almacenamiento en 'content'
    const chunkSize = 800;
    const chunks = [];
    for (let i = 0; i < finalText.length; i += chunkSize) {
      chunks.push(finalText.substring(i, i + chunkSize));
    }

    // Guardar fragmentos con sus embeddings
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk);
      const { error: insertError } = await supabase
        .from("document_sections")
        .insert({
          document_id: docData.id,
          content: chunk, // AQUÍ SE ASEGURA EL GUARDADO EN LA COLUMNA CONTENT
          embedding: embedding,
        });
      if (insertError) console.error("Error al guardar sección:", insertError);
    }

    return NextResponse.json({ success: true, documentId: docData.id });
  } catch (error: any) {
    console.error("Error en upload:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
