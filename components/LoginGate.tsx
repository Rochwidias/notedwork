"use client";

interface Props {
  title: string;
  hint: string;
}

/** Ajakan login — primer ke Google, sekunder cicipi preview tanpa login. */
export default function LoginGate({ title, hint }: Props) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "28px 18px" }}>
      <div style={{ fontSize: 40 }}>🔒</div>
      <div style={{ fontWeight: 800, fontSize: 16, marginTop: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, lineHeight: 1.6 }}>{hint}</div>
      <a
        className="btn primary block"
        href="/api/auth/login"
        style={{ marginTop: 14, textDecoration: "none", textAlign: "center", display: "block" }}
      >
        Login dengan Google
      </a>
    </div>
  );
}
