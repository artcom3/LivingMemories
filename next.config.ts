import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        // Wraps @tailwindcss/turbopack; see the file for why.
        loaders: ["./scripts/tailwind-turbopack-loader.mjs"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
