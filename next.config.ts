import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  outputFileTracingIncludes: {
    '/api/courses/*/export': ['./src/lib/pdf/fonts/**/*'],
  },
};

export default nextConfig;
