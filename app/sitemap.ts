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
  ];
}
