import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages compatibility
  images: {
    unoptimized: true, // Cloudflare doesn't support Next.js Image Optimization
  },
};

export default nextConfig;
