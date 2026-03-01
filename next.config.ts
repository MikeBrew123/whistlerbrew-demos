import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages compatibility
  images: {
    unoptimized: true, // Cloudflare doesn't support Next.js Image Optimization
  },
  async redirects() {
    return [
      { source: '/pushup', destination: '/pushup/index.html', permanent: false },
    ];
  },
};

export default nextConfig;
