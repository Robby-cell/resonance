import type { NextConfig } from "next";

/**
 * Next.js config for Resonance.
 *
 * This app is designed to be deployed as a static site (e.g. GitHub Pages).
 * The `output: "export"` setting generates a fully static `out/` directory
 * that can be served by any static host.
 *
 * For GitHub Pages project sites (username.github.io/repo-name), set the
 * NEXT_PUBLIC_BASE_PATH env variable to "/repo-name" at build time.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  trailingSlash: true,
};

export default nextConfig;
