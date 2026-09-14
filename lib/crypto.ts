// Enkripsi token Google sebelum disimpan ke Supabase (AES-GCM 256-bit).
// Key dari env GOOGLE_TOKEN_KEY (base64 32 byte). Server-only.

function getKey(): Promise<CryptoKey> {
  const b64 = process.env.GOOGLE_TOKEN_KEY ?? "";
  const raw = Buffer.from(b64, "base64");
  if (raw.length !== 32) throw new Error("GOOGLE_TOKEN_KEY harus base64 32 byte");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptText(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  const out = new Uint8Array(12 + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), 12);
  return Buffer.from(out).toString("base64");
}

export async function decryptText(b64: string): Promise<string> {
  const key = await getKey();
  const raw = Buffer.from(b64, "base64");
  const iv = raw.subarray(0, 12);
  const data = raw.subarray(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}

export function randomToken(bytes = 32): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");
}
