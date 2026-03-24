import type { Metadata, Viewport } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "DocSkan — Análisis inteligente de documentos",
  description: "Analiza documentos, PDFs e imágenes con inteligencia artificial. Haz preguntas y obtén respuestas precisas.",
  applicationName: "DocSkan",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DocSkan",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/icon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/appletouch-icon.png",
        sizes: "180x180",
      },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "DocSkan — Análisis inteligente de documentos",
    description: "Analiza documentos, PDFs e imágenes con inteligencia artificial.",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary",
    title: "DocSkan",
    description: "Analiza documentos con IA",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* iOS PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DocSkan" />

        {/* iOS splash screens — fondo oscuro mientras carga */}
        <meta name="msapplication-TileColor" content="#0d0d0d" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0d0d0d" }}>
        {children}

        {/* Registrar Service Worker */}
        <Script id="register-sw" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
              navigator.serviceWorker
                .register('/sw.js')
                .then(function (reg) {
                  console.log('[SW] Registrado:', reg.scope);
                })
                .catch(function (err) {
                  console.warn('[SW] Error al registrar:', err);
                });
            });
          }
        `}</Script>

        {/* Banner de instalación PWA — aparece automáticamente en móvil */}
        <Script id="pwa-install" strategy="afterInteractive">{`
          let deferredPrompt;
          window.addEventListener('beforeinstallprompt', function (e) {
            e.preventDefault();
            deferredPrompt = e;
            // Guardar el evento para usarlo desde la app
            window.__pwaInstallPrompt = deferredPrompt;
          });
          window.addEventListener('appinstalled', function () {
            console.log('[PWA] App instalada');
            window.__pwaInstallPrompt = null;
          });
        `}</Script>
      </body>
    </html>
  );
}
