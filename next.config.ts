import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/courses/*/export': ['./src/lib/pdf/fonts/**/*'],
  },
};

export default nextConfig;
