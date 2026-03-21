# Instrucciones de integración — Iconos DocuIA

## Archivos incluidos

| Archivo              | Uso                                      |
|----------------------|------------------------------------------|
| favicon.ico          | Pestaña del navegador (16+32+48px)       |
| icon.svg             | Favicon SVG moderno                      |
| apple-touch-icon.png | iOS homescreen (180×180)                 |
| icon-192.png         | Android PWA / manifest                  |
| icon-512.png         | Splash screen PWA / Open Graph           |
| icon-32.png          | Favicon PNG de respaldo                  |

---

## 1. Coloca los archivos

Mueve todos los archivos a la carpeta `/public` de tu proyecto Next.js:

```
/public
  favicon.ico
  icon.svg
  apple-touch-icon.png
  icon-192.png
  icon-512.png
  icon-32.png
```

---

## 2. Configura los metadatos en layout.tsx

Abre `app/layout.tsx` y reemplaza (o agrega) el bloque `metadata`:

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DocuIA — Análisis inteligente de documentos",
  description: "Sube tus documentos y conversa con ellos usando inteligencia artificial.",
  icons: {
    icon: [
      { url: "/favicon.ico",  sizes: "48x48",  type: "image/x-icon" },
      { url: "/icon.svg",     type: "image/svg+xml" },
      { url: "/icon-32.png",  sizes: "32x32",  type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",  // opcional, si usas PWA
};
```

---

## 3. (Opcional) manifest.json para PWA

Si quieres que DocuIA se pueda instalar como app, crea `/public/manifest.json`:

```json
{
  "name": "DocuIA",
  "short_name": "DocuIA",
  "description": "Análisis inteligente de documentos con IA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0d0d0d",
  "theme_color": "#00e5ff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "maskable"
    }
  ]
}
```

---

## 4. Open Graph (redes sociales)

Para que el icono aparezca cuando compartes el link en WhatsApp, Twitter, etc.:

```ts
export const metadata: Metadata = {
  // ... (lo de arriba) +
  openGraph: {
    title: "DocuIA",
    description: "Análisis inteligente de documentos con IA",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
};
```
