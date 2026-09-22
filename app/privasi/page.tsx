import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — notedwork",
  description:
    "Kebijakan privasi notedwork: data tersimpan lokal, token OAuth terenkripsi, tanpa iklan dan pelacakan.",
};

const doc = LEGAL.id.privacy;

export default function PrivasiPage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "32px 20px 64px",
        fontSize: 15,
        lineHeight: 1.8,
      }}
    >
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>notedwork</p>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>{doc.title}</h1>
      <p style={{ fontSize: 13, opacity: 0.7, marginTop: 0 }}>{doc.updated}</p>
      {doc.body.map((p, i) => (
        <p key={i} style={{ margin: "12px 0" }}>
          {p}
        </p>
      ))}
      <p style={{ marginTop: 24 }}>
        <Link href="/" style={{ textDecoration: "underline" }}>
          ← Kembali ke notedwork
        </Link>
      </p>
    </main>
  );
}
