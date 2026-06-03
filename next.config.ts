import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@vercel/blob", "undici"],
};

export default nextConfig;
