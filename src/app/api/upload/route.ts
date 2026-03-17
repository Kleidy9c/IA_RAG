import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file)
      return NextResponse.json({ error: "No hay archivo" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText = "";

    // PROCESAMIENTO MULTIFORMATO SEGURO
    if (file.name.endsWith(".pdf")) {
      // 1. Importamos y casteamos el resultado de la promesa a 'any' inmediatamente
      const pdfModule = (await import("pdf-parse")) as any;

      // 2. Ahora podemos acceder a .default o al módulo directamente sin errores
      const pdf = pdfModule.default || pdfModule;

      try {
        const data = await pdf(buffer);
        rawText = data.text;
      } catch (error) {
        console.error("Error al procesar el PDF:", error);
        throw new Error("No se pudo leer el PDF");
      }
    } else if (file.name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      rawText = buffer.toString("utf-8");
    }

    const cleanText = rawText.replace(/\s+/g, " ").trim();

    // INSERTAR EN SUPABASE
    const { data: docData, error: docError } = await supabase
      .from("documents")
      .insert({
        name: file.name,
        storage_path: `uploads/${Date.now()}-${file.name}`, // <--- Esto ya funcionará tras el SQL del Paso A
      })
      .select("id")
      .single();

    if (docError) throw docError;

    // Chunking y Embeddings (1024 dimensiones)
    const chunkSize = 800;
    const chunks = [];
    for (let i = 0; i < cleanText.length; i += chunkSize) {
      chunks.push(cleanText.substring(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk);
      await supabase.from("document_sections").insert({
        document_id: docData.id,
        content: chunk,
        embedding: embedding,
      });
    }

    return NextResponse.json({ success: true, documentId: docData.id });
  } catch (error: any) {
    console.error("Error crítico:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
