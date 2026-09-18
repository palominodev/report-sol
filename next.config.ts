import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a minimal server.js for Docker deploys.
  output: "standalone",
  outputFileTracingIncludes: {
    // libsql resolves its native binding with a dynamic require that
    // output tracing cannot follow; include the platform bindings explicitly.
    "/**": ["./node_modules/.pnpm/@libsql+linux-*/node_modules/@libsql/linux-*/**"],
  },
};

export default nextConfig;
