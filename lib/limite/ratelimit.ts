import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 20 mensajes por usuario cada 60 segundos
export const chatRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  analytics: true,
  prefix: "ratelimit:chat",
});

// 10 uploads por usuario cada hora
export const uploadRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 m"),
  analytics: true,
  prefix: "ratelimit:upload",
});

// Respuesta estandarizada 429
export function rateLimitResponse(reset: number, type: "chat" | "upload") {
  const waitSeconds = Math.ceil((reset - Date.now()) / 1000);
  const waitText =
    waitSeconds < 60
      ? `${waitSeconds} segundos`
      : `${Math.ceil(waitSeconds / 60)} minutos`;

  const messages: Record<typeof type, string> = {
    chat: `Demasiados mensajes seguidos. Espera ${waitText} antes de continuar.`,
    upload: `Límite de subidas alcanzado. Espera ${waitText} para subir más archivos.`,
  };

  return new Response(
    JSON.stringify({ error: messages[type], retryAfter: waitSeconds }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(waitSeconds),
      },
    },
  );
}
