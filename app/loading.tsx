export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#F7F4EE",
        color: "#292524",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "#B45309",
            color: "#FFFFFF",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: 20,
            margin: "0 auto 12px",
          }}
        >
          N
        </div>
        <p style={{ fontSize: 14, color: "#A8A29E" }}>Memuat notedwork…</p>
      </div>
    </main>
  );
}
