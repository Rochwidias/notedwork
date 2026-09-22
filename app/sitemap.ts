import type { MetadataRoute } from "next";

const BASE = "https://notedwork.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL("/", BASE).toString(),
      lastModified: "2026-09-14",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/privasi", BASE).toString(),
      lastModified: "2026-09-22",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: new URL("/syarat", BASE).toString(),
      lastModified: "2026-09-22",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
