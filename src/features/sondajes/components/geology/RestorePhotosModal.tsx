import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, ImagePlus, Loader2, LifeBuoy } from "lucide-react";
import { getPhotosIntegrity, restorePhotoFile, type PhotoIntegrity } from "@/features/sondajes/api/geologyApi";
import { parseGeologyWorkbook } from "@/features/sondajes/lib/geologyExcel";
import { sha256Hex } from "@/features/sondajes/lib/contentHash";
import { getPhotoBlob } from "@/features/sondajes/db/geologyDb";
import { processImage } from "@/features/sondajes/lib/imageProcessing";
import { Modal, panelClass, primaryButton, secondaryButton } from "@/features/sondajes/components/ui";

type Report = { found: number; restored: number; failed: Array<{ code: string; reason: string }>; stillMissing: string[] };

// Restaura imágenes cuyo registro existe pero cuyo archivo se perdió en el servidor.
// Se reconocen por la huella (SHA-256) de la imagen ORIGINAL: sirven los mismos Excel de geología o las fotos originales.
export function RestorePhotosModal({ open, holeId, onClose }: { open: boolean; holeId?: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [integrity, setIntegrity] = useState<PhotoIntegrity | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReport(null);
    getPhotosIntegrity(holeId)
      .then((data) => !cancelled && setIntegrity(data))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "No se pudo consultar el servidor."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, holeId]);

  async function run(files: FileList | null) {
    if (!files?.length || !integrity) return;
    setReport(null);
    setError(null);
    const pending = integrity.missing.filter((item) => item.contentHash);
    const byHash = new Map<string, Blob>();
    try {
      let index = 0;
      for (const file of Array.from(files)) {
        index += 1;
        setProgress(`Leyendo ${file.name} (${index}/${files.length})…`);
        if (/\.xls[xm]$/i.test(file.name)) {
          const parsed = await parseGeologyWorkbook(file);
          for (const photo of parsed.photos) if (photo.hash && !byHash.has(photo.hash)) byHash.set(photo.hash, photo.blob);
        } else if (file.type.startsWith("image/")) {
          const hash = await sha256Hex(file);
          if (hash && !byHash.has(hash)) byHash.set(hash, file);
        }
      }
      const matches = pending.filter((item) => item.contentHash && byHash.has(item.contentHash));
      const failed: Report["failed"] = [];
      let restored = 0;
      for (const [position, item] of matches.entries()) {
        setProgress(`Restaurando ${item.code} (${position + 1}/${matches.length})…`);
        try {
          const processed = await processImage(byHash.get(item.contentHash as string) as Blob);
          await restorePhotoFile(item.id, processed.full, processed.thumb);
          restored += 1;
        } catch (e) {
          failed.push({ code: item.code, reason: e instanceof Error ? e.message : "Error" });
        }
      }
      const after = await getPhotosIntegrity(holeId);
      setIntegrity(after);
      setReport({ found: matches.length, restored, failed, stillMissing: after.missing.map((item) => item.code) });
      await queryClient.invalidateQueries({ queryKey: ["sondajes"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer alguno de los archivos.");
    } finally {
      setProgress(null);
    }
  }

  // Cada dispositivo conserva las miniaturas (480 px) de las fotos que subió o vio. Sirven para devolverles una imagen.
  async function runFromDevice() {
    if (!integrity) return;
    setReport(null);
    setError(null);
    try {
      const failed: Report["failed"] = [];
      let restored = 0;
      let found = 0;
      for (const [position, item] of integrity.missing.entries()) {
        setProgress(`Buscando ${item.code} en este dispositivo (${position + 1}/${integrity.missing.length})…`);
        const thumb = await getPhotoBlob(item.id, "thumb");
        if (!thumb) continue;
        found += 1;
        try {
          await restorePhotoFile(item.id, thumb, thumb);
          restored += 1;
        } catch (e) {
          failed.push({ code: item.code, reason: e instanceof Error ? e.message : "Error" });
        }
      }
      const after = await getPhotosIntegrity(holeId);
      setIntegrity(after);
      setReport({ found, restored, failed, stillMissing: after.missing.map((item) => item.code) });
      await queryClient.invalidateQueries({ queryKey: ["sondajes"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la copia de este dispositivo.");
    } finally {
      setProgress(null);
    }
  }

  const busy = loading || Boolean(progress);
  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size="lg"
      icon={<LifeBuoy size={20} />}
      title="Restaurar imágenes perdidas"
      subtitle="Devuelve su imagen a las fotos que figuran en el sistema pero cuyo archivo ya no está en el servidor."
      footer={
        <button type="button" className={primaryButton} onClick={onClose} disabled={busy}>
          Cerrar
        </button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm">
            <Loader2 size={16} className="animate-spin" /> Revisando el servidor…
          </p>
        ) : integrity ? (
          <section className={`${panelClass} p-4`}>
            <p className="text-sm font-bold">
              {integrity.missingCount === 0 ? (
                <span className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={16} /> Todas las fotos ({integrity.total}) tienen su archivo en el servidor.
                </span>
              ) : (
                <span className="flex items-center gap-2 text-rose-600">
                  <AlertTriangle size={16} /> {integrity.missingCount} de {integrity.total} fotos no tienen su archivo.
                </span>
              )}
            </p>
            {integrity.missingCount > 0 ? (
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                Se pueden reconocer {integrity.missing.filter((item) => item.contentHash).length}; las demás son registros antiguos sin huella y hay que subirlas de nuevo.
              </p>
            ) : null}
          </section>
        ) : null}

        {integrity && integrity.missingCount > 0 ? (
          <section className={`${panelClass} space-y-3 p-4`}>
            <p className="text-sm font-bold">Elige los archivos con las imágenes originales</p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--color-on-surface-variant)]">
              <li>
                Los <b>Excel de reporte diario</b> de geología (traen las fotos incrustadas). Puedes elegir todos a la vez.
              </li>
              <li>
                O las <b>fotos originales</b> del celular o de la cámara, sin editar ni recortar.
              </li>
              <li>El sistema las reconoce solas y las pone en su registro, con el mismo código y reporte. Las que no coincidan se ignoran.</li>
            </ul>
            <label className={`${secondaryButton} cursor-pointer`}>
              <input
                type="file"
                multiple
                accept=".xlsx,.xlsm,image/*"
                className="hidden"
                disabled={busy}
                onChange={(event) => {
                  void run(event.target.files);
                  event.target.value = "";
                }}
              />
              <FileSpreadsheet size={15} />
              <ImagePlus size={15} />
              Elegir Excel y/o fotos
            </label>
            <div className="border-t border-[var(--color-border-soft)] pt-3">
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                <b>¿No tienes los originales?</b> Este dispositivo (celular o computador) guarda una miniatura de las fotos que subió o vio. Úsala desde el equipo que más trabajó con las fotos: quedarán con menor resolución, pero no se pierden.
              </p>
              <button type="button" className={`${secondaryButton} mt-2`} disabled={busy} onClick={() => void runFromDevice()}>
                Recuperar miniaturas guardadas en este dispositivo
              </button>
            </div>
            {progress ? (
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Loader2 size={15} className="animate-spin" /> {progress}
              </p>
            ) : null}
          </section>
        ) : null}

        {report ? (
          <section className={`${panelClass} p-4 text-sm`}>
            <p className="font-bold text-emerald-600">
              Se restauraron {report.restored} imagen(es) de {report.found} encontradas entre los archivos que elegiste.
            </p>
            {report.failed.length ? <p className="mt-1 text-xs text-rose-600">No se pudieron subir: {report.failed.map((item) => `${item.code} (${item.reason})`).join(", ")}</p> : null}
            {report.stillMissing.length ? (
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                Siguen sin imagen {report.stillMissing.length}: {report.stillMissing.slice(0, 20).join(", ")}
                {report.stillMissing.length > 20 ? "…" : ""}. Elige más archivos (otros Excel o fotos originales) y se completarán.
              </p>
            ) : null}
          </section>
        ) : null}
        {error ? <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p> : null}
      </div>
    </Modal>
  );
}
