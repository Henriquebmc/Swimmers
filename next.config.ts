import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Force worker_threads so builds run in environments where child_process IPC is blocked
    workerThreads: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  turbopack: {
    // Force the workspace root to this project to avoid scanning parent directories
    root: __dirname,
  },
  output: "standalone",
};

export default nextConfig;
