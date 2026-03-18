🚀 DocuMind AI - Inteligencia Documental Avanzada
DocuMind AI es una plataforma Full-Stack de análisis de documentos que utiliza Inteligencia Artificial de última generación para permitir a los usuarios "chatear" con sus archivos. Inspirado en la interfaz de Google Gemini, el sistema combina procesamiento de visión (OCR), búsqueda vectorial y re-ordenamiento inteligente (Reranking) para ofrecer respuestas precisas con citas de fuentes reales.

🌟 Características Principales
👁️ Visión Multi-Modal (OCR): Capacidad para leer y entender no solo texto plano, sino también imágenes (recibos, poemas manuscritos, capturas de pantalla) utilizando modelos de la familia Qwen-VL.

🧠 Memoria Semántica (RAG): Implementación de Retrieval Augmented Generation. El sistema fragmenta los documentos y los convierte en vectores para encontrar información de forma matemática.

🎯 Reranking Inteligente: A diferencia de los bots básicos, DocuMind utiliza un modelo de re-ordenamiento (bge-reranker-v2-m3) para asegurar que los fragmentos de texto más relevantes sean los que alimentan a la IA.

📍 Citas de Fuentes: La IA no inventa; cada respuesta incluye etiquetas de referencia (ej. [Referencia: Fragmento 12]) para que el usuario sepa exactamente de dónde salió la información.

💬 Chat Multisesión: Gestión de múltiples hilos de conversación con persistencia local y soporte para diferentes documentos por chat.

🔐 Seguridad de Grado Empresarial: Autenticación robusta y gestión de usuarios mediante Clerk.

🎨 UI Estilo Gemini: Interfaz minimalista, fluida y responsiva, diseñada con Tailwind CSS y Lucide Icons.

🛠️ Stack Tecnológico
Frontend: Next.js 15+ (App Router), TypeScript, Tailwind CSS.

Autenticación: Clerk.

Base de Datos Vectorial: Supabase con la extensión pgvector.

Modelos de Lenguaje (LLM): OpenRouter (Llama 3.1, Gemini 2.0).

Inferencia de IA (Embeddings & Rerank): Hugging Face Inference API.

Procesamiento de Texto: LangChain (conceptos) / AI SDK de Vercel.

🏗️ Arquitectura del Sistema
Carga y Visión: El usuario sube una imagen/PDF. El modelo Qwen extrae el contenido visual.

Fragmentación (Chunking): El texto se divide en piezas de 800 caracteres para mantener el contexto.

Vectorización: Cada pieza se convierte en un vector de 384 dimensiones usando mxbai-embed-large-v1.

Almacenamiento: Los vectores y el texto se guardan en Supabase.

Consulta (Retrieval): Cuando el usuario pregunta, se genera un vector de la duda y se busca similitud de coseno en la DB.

Reranking: Se toman los mejores 15 resultados y un modelo de Rerank elige los 5 más vitales.

Generación: El LLM recibe la pregunta + los 5 fragmentos y genera la respuesta final.

🚀 Configuración del Proyecto
Variables de Entorno (.env.local)
Para ejecutar este proyecto, deberás configurar las siguientes llaves:

Bash

# Supabase

NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_llave_anon_publica

# Clerk (Auth)

NEXT*PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test*...
CLERK*SECRET_KEY=sk_test*...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# IA Keys

HUGGINGFACE*API_KEY=hf*...
OPENROUTER_API_KEY=sk-or-v1-...
Configuración de Base de Datos (SQL)
Es necesario habilitar la extensión de vectores y la función de búsqueda en Supabase:

SQL
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla de secciones con soporte vectorial
CREATE TABLE document_sections (
id bigint primary key generated always as identity,
document_id text references documents(id) on delete cascade,
content text,
embedding vector(384)
);

-- Función de búsqueda RPC (incluida en la documentación técnica interna)
📖 Cómo se utiliza
Registro: Crea una cuenta de forma segura.

Carga: Haz clic en el icono del clip y sube una imagen o documento.

Procesamiento: Espera unos segundos a que la IA analice y cree la memoria vectorial.

Chat: Pregunta cualquier detalle. El bot responderá utilizando únicamente la información de tu archivo.

Verificación: Revisa las citas al final de las frases para confirmar la veracidad.

📈 Próximas Mejoras (Roadmap)
[ ] Soporte para archivos de audio y video (Transcripción).

[ ] Exportación de chats a formato PDF o Markdown.

[ ] Colaboración en tiempo real en un mismo documento.

[ ] Soporte para carpetas y organización de archivos masiva.

Creado con ❤️ por José Marcos Fuentes Segarte - 2026.
