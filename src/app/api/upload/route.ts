import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  uploadRatelimit,
  rateLimitResponse,
} from "../../../../lib/limite/ratelimit";

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

// ─── Visión (HF Router) ───────────────────────────────────────────────────────
async function extractTextFromImage(
  base64Image: string,
  mimeType: string,
): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${base64Image}`;
  const VISION_MODELS = [
    "Qwen/Qwen2.5-VL-7B-Instruct",
    "Qwen/Qwen2-VL-7B-Instruct",
    "meta-llama/Llama-3.2-11B-Vision-Instruct",
  ];
  let lastError = "";
  for (const model of VISION_MODELS) {
    try {
      const response = await fetch(
        "https://router.huggingface.co/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: dataUrl } },
                  {
                    type: "text",
                    text: "Transcribe exactamente todo el texto visible en esta imagen. Si no hay texto, describe brevemente el contenido. Responde solo con el contenido.",
                  },
                ],
              },
            ],
            max_tokens: 1000,
          }),
        },
      );
      if (response.status === 503 || response.status === 404) {
        lastError = `${model}: ${response.status}`;
        continue;
      }
      if (!response.ok) {
        lastError = `${model} falló (${response.status})`;
        continue;
      }
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) {
        lastError = `${model} respuesta vacía`;
        continue;
      }
      return text;
    } catch (err: any) {
      lastError = `${model} error: ${err.message}`;
      continue;
    }
  }
  throw new Error(
    `No se pudo procesar la imagen. Último error: ${lastError}. Reintenta en unos segundos.`,
  );
}

// ─── Chunking ─────────────────────────────────────────────────────────────────
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
      i = Math.max(i - Math.max(Math.floor(overlap / 6), 3), 0);
    }
  }
  return chunks;
}

// ─── Scraping de URLs ─────────────────────────────────────────────────────────
async function scrapeUrl(
  url: string,
): Promise<{ text: string; title: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DocuIA/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo acceder a la URL (${response.status}). Verifica que sea pública.`,
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error("La URL no apunta a una página web HTML.");
  }

  const html = await response.text();
  const cheerio = await import("cheerio");
  const $ = cheerio.load(html);

  $("script, style, nav, footer, header, aside").remove();

  const title =
    $("title").text().trim() || $("h1").first().text().trim() || "Página web";

  const mainContent = $(
    "article, main, [role='main'], .content, .post-content",
  ).first();
  let text = mainContent.length > 0 ? mainContent.text() : $("body").text();

  // Limpiar espacios múltiples y saltos de línea excesivos
  text = text
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length < 100) {
    throw new Error("La página no tiene suficiente contenido extraíble.");
  }

  return { text, title };
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
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Rate limiting
    const { success, reset } = await uploadRatelimit.limit(user.id);
    if (!success) return rateLimitResponse(reset, "upload");

    const formData = await req.formData();
    const urlInput = formData.get("url") as string | null;

    // ── Procesar URL ─────────────────────────────────────────────────────────
    if (urlInput) {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(urlInput);
        if (!["http:", "https:"].includes(parsedUrl.protocol))
          throw new Error("URL inválida");
      } catch {
        return NextResponse.json(
          { error: "URL inválida. Debe empezar con http:// o https://" },
          { status: 400 },
        );
      }

      try {
        const { text, title } = await scrapeUrl(urlInput);
        const pageName = `${title} (${parsedUrl.hostname})`;

        const { data: docData, error: docError } = await supabase
          .from("documents")
          .insert({
            name: pageName,
            storage_path: urlInput,
            user_id: user.id,
            size_bytes: text.length,
            file_type: "text/html",
          })
          .select("id")
          .single();

        if (docError) throw new Error(`Error guardando: ${docError.message}`);

        const chunks = splitIntoChunks(text, 800, 100);
        const BATCH_SIZE = 3;
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          const batch = chunks.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async (chunk) => {
              const embedding = await getEmbedding(chunk);
              await supabase
                .from("document_sections")
                .insert({ document_id: docData.id, content: chunk, embedding });
            }),
          );
        }

        return NextResponse.json({
          success: true,
          documentId: docData.id,
          fileName: pageName,
          extractedTextSnippet: text.substring(0, 150) + "…",
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Error al procesar la URL" },
          { status: 500 },
        );
      }
    }

    // ── Procesar archivo ─────────────────────────────────────────────────────
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo ni URL." },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo supera los 10MB permitidos." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText = "";

    if (file.type.startsWith("image/")) {
      rawText = await extractTextFromImage(
        buffer.toString("base64"),
        file.type,
      );
    } else if (file.name.toLowerCase().endsWith(".pdf")) {
      const pdfModule = (await import("pdf-parse")) as any;
      const pdf = pdfModule.default || pdfModule;
      const data = await pdf(buffer);
      rawText = data.text;
      if (!rawText?.trim())
        throw new Error(
          "El PDF no contiene texto extraíble. Puede ser un PDF escaneado.",
        );
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
        { error: `Tipo no soportado: ${file.type || file.name}` },
        { status: 400 },
      );
    }

    const finalText = rawText.trim();
    if (!finalText)
      throw new Error("No se pudo extraer contenido del archivo.");

    const { data: docData, error: docError } = await supabase
      .from("documents")
      .insert({
        name: file.name,
        storage_path: `uploads/${user.id}/${Date.now()}-${file.name}`,
        user_id: user.id,
        size_bytes: file.size,
        file_type: file.type,
      })
      .select("id")
      .single();

    if (docError)
      throw new Error(`Error al guardar documento: ${docError.message}`);

    const chunks = splitIntoChunks(finalText, 800, 100);
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
