import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  turbopack: { root: process.cwd() },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};
export default config;
