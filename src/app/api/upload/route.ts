import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Embedding ────────────────────────────────────────────────────────────────
async function getEmbedding(text: string): Promise<number[]> {
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

  if (!response.ok) {
    throw new Error(
      `Error en embeddings: ${response.status} ${response.statusText}`,
    );
  }

  const result = await response.json();
  return Array.isArray(result[0]) ? result[0] : result;
}

// ─── Visión con HF Router (URL corregida) ────────────────────────────────────
// La URL correcta del router de HuggingFace en 2025:
// https://router.huggingface.co/v1/chat/completions
// El modelo se pasa en el body, con sufijo :provider opcional.
//
// Modelos de visión gratuitos disponibles (en orden de preferencia):
//   1. Qwen/Qwen2.5-VL-7B-Instruct        → proveedor auto (hf-inference)
//   2. Qwen/Qwen2-VL-7B-Instruct           → versión anterior, más estable
//   3. meta-llama/Llama-3.2-11B-Vision-Instruct → fallback Meta vision
//
async function extractTextFromImage(
  base64Image: string,
  mimeType: string,
): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  // Lista de modelos a intentar en orden
  const VISION_MODELS = [
    "Qwen/Qwen2.5-VL-7B-Instruct",
    "Qwen/Qwen2-VL-7B-Instruct",
    "meta-llama/Llama-3.2-11B-Vision-Instruct",
  ];

  let lastError = "";

  for (const model of VISION_MODELS) {
    try {
      console.log(`Intentando modelo de visión: ${model}`);

      const response = await fetch(
        // ✅ URL CORREGIDA — el router de HF ahora usa esta estructura
        "https://router.huggingface.co/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: dataUrl },
                  },
                  {
                    type: "text",
                    text: "Transcribe exactamente todo el texto visible en esta imagen. Si hay tablas, mantenlas organizadas. Si no hay texto, describe brevemente el contenido. Responde solo con el contenido, sin introducción ni explicaciones adicionales.",
                  },
                ],
              },
            ],
            max_tokens: 1000,
          }),
        },
      );

      // Si el modelo no está disponible (503, 404), intentamos el siguiente
      if (response.status === 503 || response.status === 404) {
        const body = await response.text();
        console.warn(
          `Modelo ${model} no disponible (${response.status}): ${body}`,
        );
        lastError = `${model}: ${response.status}`;
        continue; // Intenta el siguiente modelo
      }

      if (!response.ok) {
        const body = await response.text();
        lastError = `${model} falló (${response.status}): ${body}`;
        console.error(lastError);
        continue;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();

      if (!text) {
        lastError = `${model} devolvió respuesta vacía`;
        console.warn(lastError);
        continue;
      }

      console.log(
        `✅ Texto extraído con ${model}: ${text.substring(0, 80)}...`,
      );
      return text;
    } catch (err: any) {
      lastError = `${model} error de red: ${err.message}`;
      console.error(lastError);
      continue;
    }
  }

  // Si todos los modelos fallaron
  throw new Error(
    `No se pudo procesar la imagen. Todos los modelos de visión fallaron. Último error: ${lastError}. Reintenta en unos segundos.`,
  );
}

// ─── Chunking por palabras con overlap ───────────────────────────────────────
function splitIntoChunks(
  text: string,
  chunkSize = 800,
  overlap = 100,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const chunkWords: string[] = [];
    let charCount = 0;

    while (i < words.length && charCount + words[i].length < chunkSize) {
      chunkWords.push(words[i]);
      charCount += words[i].length + 1;
      i++;
    }

    if (chunkWords.length > 0) chunks.push(chunkWords.join(" "));

    if (overlap > 0 && i < words.length) {
      const overlapWords = Math.max(Math.floor(overlap / 6), 3);
      i = Math.max(i - overlapWords, 0);
    }
  }

  return chunks;
}

// ─── POST Handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    // Auth Supabase
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
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo." },
        { status: 400 },
      );
    }

    // Validar tamaño (10MB máx)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo supera los 10MB permitidos." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText = "";

    // ── Procesamiento según tipo ──────────────────────────────────────────────
    if (file.type.startsWith("image/")) {
      console.log("--- PROCESANDO IMAGEN ---");
      const base64Image = buffer.toString("base64");
      rawText = await extractTextFromImage(base64Image, file.type);
    } else if (file.name.toLowerCase().endsWith(".pdf")) {
      const pdfModule = (await import("pdf-parse")) as any;
      const pdf = pdfModule.default || pdfModule;
      const data = await pdf(buffer);
      rawText = data.text;
      if (!rawText?.trim()) {
        throw new Error(
          "El PDF no contiene texto extraíble. Puede ser un PDF escaneado (imagen). Sube la imagen directamente.",
        );
      }
    } else if (file.name.toLowerCase().endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else if (
      file.type.startsWith("text/") ||
      [".txt", ".md", ".csv", ".json"].some((ext) =>
        file.name.toLowerCase().endsWith(ext),
      )
    ) {
      rawText = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        {
          error: `Tipo de archivo no soportado: ${file.type || file.name}. Soportados: PDF, DOCX, TXT, imágenes.`,
        },
        { status: 400 },
      );
    }

    const finalText = rawText.trim();
    if (!finalText) {
      throw new Error("No se pudo extraer contenido del archivo.");
    }

    // ── Guardar documento en Supabase ─────────────────────────────────────────
    const { data: docData, error: docError } = await supabase
      .from("documents")
      .insert({
        name: file.name,
        storage_path: `uploads/${user.id}/${Date.now()}-${file.name}`,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (docError)
      throw new Error(`Error al guardar documento: ${docError.message}`);

    // ── Chunking + Embeddings ─────────────────────────────────────────────────
    const chunks = splitIntoChunks(finalText, 800, 100);
    console.log(`Generando embeddings para ${chunks.length} fragmento(s)...`);

    const BATCH_SIZE = 3;
    const errors: string[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (chunk, idx) => {
          try {
            const embedding = await getEmbedding(chunk);
            const { error: sectionError } = await supabase
              .from("document_sections")
              .insert({ document_id: docData.id, content: chunk, embedding });

            if (sectionError)
              errors.push(`Sección ${i + idx}: ${sectionError.message}`);
          } catch (err: any) {
            errors.push(`Embedding ${i + idx}: ${err.message}`);
          }
        }),
      );
    }

    if (errors.length > 0) console.warn("Errores parciales:", errors);

    return NextResponse.json({
      success: true,
      documentId: docData.id,
      chunksCreated: chunks.length - errors.length,
      extractedTextSnippet:
        finalText.substring(0, 150) + (finalText.length > 150 ? "…" : ""),
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("ERROR EN API UPLOAD:", error.message);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor." },
      { status: 500 },
    );
  }
}
