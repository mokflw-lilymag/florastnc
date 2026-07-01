import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Electron dev loads http://127.0.0.1 — without this, dev assets / server actions may fail
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ecimg.cafe24img.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'mheqfhiyfsgnsglvxdrn.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ubroyskoxaixstgaralk.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  // 🚀 성능 최적화: tree-shaking 강제 및 번들 크기 최소화
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@imgly/background-removal/**/*',
      'node_modules/onnxruntime-web/**/*',
      'node_modules/@swc/core/**/*',
      'node_modules/@next/swc*/**/*',
    ],
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      'lodash',
      '@supabase/supabase-js',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
};

export default nextConfig;
