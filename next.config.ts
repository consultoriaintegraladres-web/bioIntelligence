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
  
  // Configuración de imágenes para optimización
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    // Permitir todas las imágenes locales
    remotePatterns: [],
  },
};

export default nextConfig;
