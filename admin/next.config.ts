import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/hls/:path*",
        destination: "http://127.0.0.1:8888/:path*",
      },
    ];
  },
};

export default nextConfig;
