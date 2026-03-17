import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
  // Sacamos estas librerías del empaquetado interno de Next.js
  serverExternalPackages: [
    "pdf-parse",
    "pdf-parse-fork",
    "pdf.js-extract",
    "@xenova/transformers",
    "canvas",
    "sharp",
  ],

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
      canvas$: false, // BLOQUEO PARA PDF-EXTRACT
    };
    return config;
  },

  experimental: {
    turbopack: {
      resolveAlias: {
        sharp: false,
        "onnxruntime-node": false,
        canvas: false, // BLOQUEO PARA PDF-EXTRACT
      },
    },
  } as any,
};

export default nextConfig;
