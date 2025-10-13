// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a fully static site in `out/`
  output: "export",

  images: { unoptimized: true },

  trailingSlash: true,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;