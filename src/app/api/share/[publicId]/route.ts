import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;

  if (!publicId) {
    return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
  }

  // Buscar el chat por public_id (solo funciona si is_public = true por RLS)
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, title, created_at, updated_at, is_public")
    .eq("public_id", publicId)
    .eq("is_public", true)
    .single();

  if (chatError || !chat) {
    return NextResponse.json(
      { error: "Chat no encontrado o no está compartido" },
      { status: 404 },
    );
  }

  // Obtener mensajes del chat
  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("chat_id", chat.id)
    .order("created_at", { ascending: true });

  if (msgError) {
    return NextResponse.json(
      { error: "Error al cargar mensajes" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    title: chat.title,
    createdAt: chat.created_at,
    messages: messages || [],
  });
}
