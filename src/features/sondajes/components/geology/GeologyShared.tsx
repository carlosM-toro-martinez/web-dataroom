import { AlertTriangle, Check, CloudUpload, ImageOff } from "lucide-react";
import { ApiError } from "@/shared/api/core/apiError";
import type { SyncState } from "@/features/sondajes/lib/shiftReports";
import { useObjectUrl, usePhotoBlob } from "@/features/sondajes/hooks/useGeology";
import type { PhotoView } from "@/features/sondajes/lib/geology";

export function SyncPill({ sync, compact = false }: { sync: SyncState; compact?: boolean }) {
  if (sync === "synced") {
    return compact ? null : (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
        <Check size={11} />
        Sincronizado
      </span>
    );
  }
  if (sync === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600">
        <AlertTriangle size={11} />
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-600">
      <CloudUpload size={11} />
      Pendiente
    </span>
  );
}

// Imagen de una foto (miniatura o completa). Sin red y sin copia local muestra un aviso.
export function PhotoImage({
  photo,
  variant = "thumb",
  className = "",
  fit = "cover",
  alt = ""
}: {
  photo: PhotoView;
  variant?: "thumb" | "full";
  className?: string;
  fit?: "cover" | "contain";
  alt?: string;
}) {
  const blobQuery = usePhotoBlob(photo, variant);
  const url = useObjectUrl(blobQuery.data);
  if (url) {
    return <img src={url} alt={alt} className={`${className} ${fit === "cover" ? "object-cover" : "object-contain"}`} draggable={false} />;
  }
  if (blobQuery.isError || (!blobQuery.isLoading && !blobQuery.data)) {
    // Distingue la causa real: sin internet, archivo perdido en el servidor, permiso u otro error.
    const status = blobQuery.error instanceof ApiError ? blobQuery.error.statusCode : undefined;
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    const message = offline || (!status && !blobQuery.error) ? "Disponible con conexión" : status === 404 ? "Archivo no encontrado en el servidor" : status === 401 || status === 403 ? "Sin permiso para ver la imagen" : "No se pudo cargar · toca para reintentar";
    return (
      <button
        type="button"
        title={status ? `Error ${status}` : undefined}
        onClick={(event) => {
          event.stopPropagation();
          void blobQuery.refetch();
        }}
        className={`${className} flex flex-col items-center justify-center gap-1 bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]`}
      >
        <ImageOff size={18} />
        <span className="px-2 text-center text-[10px] font-semibold">{message}</span>
      </button>
    );
  }
  return <div className={`${className} animate-pulse bg-[var(--color-surface-container-high)]`} />;
}

export function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-container-high)] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{label}</p>
      <p className={`mt-0.5 text-lg font-extrabold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
          : "border-[var(--color-border-soft)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]"
      }`}
    >
      {children}
    </button>
  );
}
