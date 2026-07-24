import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Needed for the Docker runner stage (Dockerfile copies .next/standalone).
  output: "standalone",
};

export default nextConfig;
