export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#0d0d0d",
        color: "#f5f5f5",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "#00cfff",
            color: "#0d0d0d",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: 20,
            margin: "0 auto 12px",
          }}
        >
          R
        </div>
        <p style={{ fontSize: 14, color: "#888" }}>Memuat Rocha…</p>
      </div>
    </main>
  );
}
