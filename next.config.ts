import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    /* Notifikasi upgrade keamanan otomatis saat `next dev` / `next build`. */
    agentUpgrade: "security",
  },
  /* Cache Components & Partial Prefetching dimatikan: app ini CRUD berbasis
     client components, dan fitur tsb menuntut pembungkus <Suspense> di mana-mana. */
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
