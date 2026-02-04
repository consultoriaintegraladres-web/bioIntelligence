import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración para archivos grandes (sin límite práctico)
  experimental: {
    // Configuración para body parser - sin límite para archivos grandes
    serverActions: {
      bodySizeLimit: '2gb', // Máximo práctico, pero se manejará con streaming
    },
  },
  // Aumentar límite de body size para API routes
  // Nota: Los límites reales se configuran en cada route.ts individualmente
};

export default nextConfig;
