// Las fotos del celular pesan 4–10 MB: se reducen en el dispositivo antes de guardarlas en la cola,
// así ocupan poco en IndexedDB y suben rápido desde el campamento.
const FULL_MAX = 2400;
const THUMB_MAX = 480;

export type ProcessedImage = { full: Blob; thumb: Blob; width: number; height: number };

async function loadBitmap(source: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(source, { imageOrientation: "from-image" });
    } catch {
      // Algunos navegadores no aceptan opciones: se cae al <img>.
    }
  }
  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function render(bitmap: ImageBitmap | HTMLImageElement, maxSide: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const sourceWidth = "naturalWidth" in bitmap ? bitmap.naturalWidth : bitmap.width;
  const sourceHeight = "naturalHeight" in bitmap ? bitmap.naturalHeight : bitmap.height;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("El navegador no puede procesar imágenes.");
  // Fondo blanco: los PNG con transparencia (secciones) no quedan negros al pasar a JPG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve({ blob, width, height }) : reject(new Error("No se pudo comprimir la imagen."))), "image/jpeg", quality);
  });
}

export async function processImage(source: Blob): Promise<ProcessedImage> {
  if (!source.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  const bitmap = await loadBitmap(source);
  try {
    const full = await render(bitmap, FULL_MAX, 0.85);
    const thumb = await render(bitmap, THUMB_MAX, 0.75);
    return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
  } finally {
    if ("close" in bitmap) bitmap.close();
  }
}

export function formatBytes(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
