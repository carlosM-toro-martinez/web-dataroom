// Huella SHA-256 de una imagen: identifica la misma foto aunque venga en otro Excel o se suba dos veces.
// crypto.subtle solo existe en contexto seguro (https o localhost); sin él no se deduplica.
export async function sha256Hex(blob: Blob): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
