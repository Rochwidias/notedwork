import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        background: "#F7F4EE",
        color: "#292524",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "#B45309",
          color: "#FFFFFF",
          display: "grid",
          placeItems: "center",
          fontWeight: 800,
          fontSize: 24,
          marginBottom: 16,
        }}
      >
        N
      </div>
      <h1 style={{ fontSize: 64, fontWeight: 800, lineHeight: 1 }}>404</h1>
      <p style={{ fontSize: 14, color: "#A8A29E", marginTop: 8 }}>Halaman tidak ditemukan.</p>
      <Link
        href="/"
        style={{
          marginTop: 20,
          padding: "12px 24px",
          borderRadius: 9999,
          background: "#B45309",
          color: "#FFFFFF",
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
        }}
      >
        Kembali ke Dashboard
      </Link>
    </main>
  );
}
