import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "notedwork — Email & Jadwal Mahasiswa",
    short_name: "notedwork",
    description: "Dashboard email dan jadwal kuliah mahasiswa.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0A0C10",
    theme_color: "#0A0C10",
    lang: "id",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
