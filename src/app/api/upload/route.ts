import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr"; // Cambiado para Auth de Supabase
import { cookies } from "next/headers";
import { InferenceClient } from "@huggingface/inference";

// Inicializamos el cliente de Hugging Face
const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

/**
 * Función para obtener embeddings usando Hugging Face
 */
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
    console.error("Error obteniendo embedding:", error);
    throw new Error("Error en el servicio de embeddings.");
  }
}

export async function POST(req: Request) {
  try {
    // PROTECCIÓN DE SEGURIDAD CON SUPABASE SSR
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión en Supabase." },
        { status: 401 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No hay archivo" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText = "";

    // --- PROCESAMIENTO SEGÚN TIPO DE ARCHIVO (Lógica original mantenida) ---
    if (file.type.startsWith("image/")) {
      console.log("--- INICIANDO PROCESO DE VISIÓN (QWEN) ---");
      const base64Image = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64Image}`;

      try {
        const chatCompletion = await client.chatCompletion({
          model: "Qwen/Qwen3.5-9B",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Transcribe exactamente el texto de esta imagen. Si no hay texto claro, describe brevemente qué ves. No dejes la respuesta vacía.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: dataUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        });

        rawText = chatCompletion.choices[0]?.message?.content || "";
        console.log("Texto extraído por la IA:", rawText);
      } catch (error: any) {
        console.error("Error con Qwen:", error.message);
        throw new Error(
          "La IA está saturada o cargando. Por favor, reintenta en 10 segundos.",
        );
      }
    } else if (file.name.endsWith(".pdf")) {
      const pdfModule = (await import("pdf-parse")) as any;
      const pdf = pdfModule.default || pdfModule;
      try {
        const data = await pdf(buffer);
        rawText = data.text;
      } catch (error) {
        throw new Error("El PDF no se pudo leer correctamente.");
      }
    } else if (file.name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      rawText = buffer.toString("utf-8");
    }

    const cleanText = rawText.trim();
    const finalText =
      cleanText.length > 0
        ? cleanText
        : "Archivo procesado sin contenido de texto detectable.";

    // 3. REGISTRO EN SUPABASE (user.id es el UUID del usuario autenticado)
    const { data: docData, error: docError } = await supabase
      .from("documents")
      .insert({
        name: file.name,
        storage_path: `uploads/${Date.now()}-${file.name}`,
        user_id: user.id, // UUID de Supabase Auth
      })
      .select("id")
      .single();

    if (docError) throw docError;

    // 4. CHUNKING Y EMBEDDINGS (Lógica original mantenida)
    const chunkSize = 800;
    const chunks = [];
    if (finalText.length <= chunkSize) {
      chunks.push(finalText);
    } else {
      for (let i = 0; i < finalText.length; i += chunkSize) {
        chunks.push(finalText.substring(i, i + chunkSize));
      }
    }

    console.log(`Generando embeddings para ${chunks.length} fragmento(s)...`);

    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk);
      const { error: sectionError } = await supabase
        .from("document_sections")
        .insert({
          document_id: docData.id,
          content: chunk,
          embedding: embedding,
        });

      if (sectionError) {
        console.error("Error guardando sección:", sectionError.message);
      }
    }

    return NextResponse.json({
      success: true,
      documentId: docData.id,
      extractedTextSnippet:
        finalText.substring(0, 100) + (finalText.length > 100 ? "..." : ""),
    });
  } catch (error: any) {
    console.error("ERROR CRÍTICO EN API UPLOAD:", error.message);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 },
    );
  }
}
