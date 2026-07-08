import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Módulos nativos não devem ser empacotados pelo bundler do servidor.
  serverExternalPackages: ['@resvg/resvg-js', 'satori', 'sharp'],
  // Garante que os arquivos de fonte cheguem ao ambiente serverless (Vercel).
  outputFileTracingIncludes: {
    '/api/**': ['./assets/fonts/**'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**', // cobre /public/ e /sign/ (signed URLs)
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.suno.ai',
      },
    ],
  },
};

export default nextConfig;
