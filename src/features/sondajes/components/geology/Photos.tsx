import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, ChevronLeft, ChevronRight, Download, ImagePlus, Images, Save, Trash2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPhotosIntegrity } from "@/features/sondajes/api/geologyApi";
import { RestorePhotosModal } from "@/features/sondajes/components/geology/RestorePhotosModal";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useAddPhotosMutation,
  useDeletePhotoMutation,
  usePhotoBlob,
  useUpdatePhotoMutation,
  type NewPhoto
} from "@/features/sondajes/hooks/useGeology";
import { PHOTO_KINDS, type GeologyReportView, type PhotoView } from "@/features/sondajes/lib/geology";
import { formatBytes } from "@/features/sondajes/lib/imageProcessing";
import type { PhotoKind, PhotoMeta } from "@/features/sondajes/model/geology.schema";
import { formatReportDate } from "@/features/sondajes/lib/shiftReports";
import { Field, Modal, dangerButton, fieldClass, panelClass, primaryButton, secondaryButton, toInputNumber, toNumberOrNull } from "@/features/sondajes/components/ui";
import { Chip, PhotoImage, SyncPill } from "@/features/sondajes/components/geology/GeologyShared";

const KIND_ORDER: PhotoKind[] = ["DETAIL", "CORE_BOX", "SECTION", "OTHER"];

function photoTitle(photo: PhotoView) {
  const parts: string[] = [];
  if (photo.boxFrom != null) parts.push(`Cajas ${photo.boxFrom}${photo.boxTo != null && photo.boxTo !== photo.boxFrom ? `–${photo.boxTo}` : ""}`);
  if (photo.fromDepth != null) parts.push(`${photo.fromDepth.toFixed(2)}–${photo.toDepth?.toFixed(2) ?? "?"} m`);
  return parts.join(" · ") || PHOTO_KINDS[photo.kind].label;
}

function reportLabel(report: GeologyReportView) {
  return `${formatReportDate(report.date, "short")} · ${report.fromDepth.toFixed(2)}–${report.toDepth.toFixed(2)} m`;
}

// Código de la foto (26DLP079-F0001). Mientras la foto solo está en el dispositivo aún no tiene.
function PhotoCode({ photo, large = false }: { photo: PhotoView; large?: boolean }) {
  return photo.code ? (
    <p className={`truncate font-mono font-extrabold tracking-tight text-[var(--color-primary)] ${large ? "text-base" : "text-[13px]"}`} title="Código de la foto">
      {photo.code}
    </p>
  ) : (
    <p className="truncate text-[11px] font-semibold italic text-[var(--color-on-surface-variant)]" title="El servidor asigna el código al sincronizar">
      Código al sincronizar
    </p>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Galería ─────────────────────────────────────────────────────────────────
export function PhotoGallery({
  photos,
  reports,
  onOpen,
  onAdd,
  canAdd
}: {
  photos: PhotoView[];
  reports: GeologyReportView[];
  onOpen: (photo: PhotoView) => void;
  onAdd: () => void;
  canAdd: boolean;
}) {
  const [kind, setKind] = useState<PhotoKind | "ALL">("ALL");
  const visible = photos.filter((photo) => kind === "ALL" || photo.kind === kind);
  const groups = useMemo(() => {
    const byReport = new Map<string, PhotoView[]>();
    visible.forEach((photo) => {
      const key = photo.reportId && reports.some((report) => report.id === photo.reportId) ? photo.reportId : "none";
      byReport.set(key, [...(byReport.get(key) ?? []), photo]);
    });
    const ordered = reports.filter((report) => byReport.has(report.id)).map((report) => ({ key: report.id, title: reportLabel(report), photos: byReport.get(report.id)! }));
    if (byReport.has("none")) ordered.push({ key: "none", title: "Sin reporte asociado", photos: byReport.get("none")! });
    return ordered;
  }, [visible, reports]);

  if (photos.length === 0) {
    return (
      <div className={`${panelClass} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
          <Images size={26} />
        </span>
        <p className="text-sm font-bold">Aún no hay fotografías de este pozo</p>
        <p className="max-w-sm text-xs text-[var(--color-on-surface-variant)]">
          Toma fotos de las cajas de testigo con el celular. Se guardan en el dispositivo y se suben solas cuando hay conexión.
        </p>
        {canAdd ? (
          <button type="button" className={primaryButton} onClick={onAdd}>
            <Camera size={16} />
            Agregar fotos
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto">
          <Chip active={kind === "ALL"} onClick={() => setKind("ALL")}>
            Todas <span className="opacity-70">{photos.length}</span>
          </Chip>
          {KIND_ORDER.filter((value) => photos.some((photo) => photo.kind === value)).map((value) => (
            <Chip key={value} active={kind === value} onClick={() => setKind(value)}>
              {PHOTO_KINDS[value].label} <span className="opacity-70">{photos.filter((photo) => photo.kind === value).length}</span>
            </Chip>
          ))}
        </div>
        {canAdd ? (
          <button type="button" className={secondaryButton} onClick={onAdd}>
            <ImagePlus size={16} />
            Agregar fotos
          </button>
        ) : null}
      </div>
      {groups.map((group) => (
        <div key={group.key}>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">{group.title}</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onOpen(photo)}
                className={`group overflow-hidden rounded-xl border bg-[var(--color-surface-container-low)] text-left transition hover:border-[var(--color-primary)] hover:shadow-md ${
                  photo.sync === "error" ? "border-rose-500/60" : photo.sync === "pending" ? "border-sky-500/50" : "border-[var(--color-border-soft)]"
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <PhotoImage photo={photo} className="h-full w-full transition duration-300 group-hover:scale-[1.03]" />
                  <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                    {PHOTO_KINDS[photo.kind].label}
                  </span>
                  <span className="absolute right-2 top-2">
                    <SyncPill sync={photo.sync} compact />
                  </span>
                </div>
                <div className="px-2.5 py-2">
                  <PhotoCode photo={photo} />
                  <p className="mt-0.5 truncate text-xs font-semibold">{photoTitle(photo)}</p>
                  {photo.caption ? <p className="truncate text-[11px] text-[var(--color-on-surface-variant)]">{photo.caption}</p> : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

// ─── Formulario de metadatos (compartido por subida y visor) ─────────────────
type MetaDraft = { kind: PhotoKind; reportId: string; caption: string; boxFrom: string; boxTo: string; fromDepth: string; toDepth: string };

const toDraft = (meta: Partial<PhotoMeta>): MetaDraft => ({
  kind: meta.kind ?? "CORE_BOX",
  reportId: meta.reportId ?? "",
  caption: meta.caption ?? "",
  boxFrom: toInputNumber(meta.boxFrom),
  boxTo: toInputNumber(meta.boxTo),
  fromDepth: toInputNumber(meta.fromDepth),
  toDepth: toInputNumber(meta.toDepth)
});

function draftErrors(draft: MetaDraft) {
  const errors: Partial<Record<keyof MetaDraft, string>> = {};
  for (const key of ["boxFrom", "boxTo", "fromDepth", "toDepth"] as const) {
    if (Number.isNaN(toNumberOrNull(draft[key]))) errors[key] = "Número no válido";
  }
  const from = toNumberOrNull(draft.fromDepth);
  const to = toNumberOrNull(draft.toDepth);
  if (from !== null && to !== null && !Number.isNaN(from) && !Number.isNaN(to) && to <= from) errors.toDepth = "Debe ser mayor que «desde»";
  return errors;
}

function fromDraft(draft: MetaDraft): PhotoMeta {
  const int = (value: string) => {
    const parsed = toNumberOrNull(value);
    return parsed === null || Number.isNaN(parsed) ? null : Math.round(parsed);
  };
  const decimal = (value: string) => {
    const parsed = toNumberOrNull(value);
    return parsed === null || Number.isNaN(parsed) ? null : parsed;
  };
  return {
    kind: draft.kind,
    reportId: draft.reportId || null,
    caption: draft.caption.trim() || null,
    boxFrom: int(draft.boxFrom),
    boxTo: int(draft.boxTo),
    fromDepth: decimal(draft.fromDepth),
    toDepth: decimal(draft.toDepth)
  };
}

function MetaFields({
  draft,
  onChange,
  reports,
  disabled,
  compact = false
}: {
  draft: MetaDraft;
  onChange: (draft: MetaDraft) => void;
  reports: GeologyReportView[];
  disabled?: boolean;
  compact?: boolean;
}) {
  const errors = draftErrors(draft);
  const set = (patch: Partial<MetaDraft>) => onChange({ ...draft, ...patch });
  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
      <Field label="Tipo" className="col-span-2">
        <select className={fieldClass} value={draft.kind} disabled={disabled} onChange={(event) => set({ kind: event.target.value as PhotoKind })}>
          {KIND_ORDER.map((value) => (
            <option key={value} value={value}>
              {PHOTO_KINDS[value].label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Reporte del día" className="col-span-2">
        <select className={fieldClass} value={draft.reportId} disabled={disabled} onChange={(event) => set({ reportId: event.target.value })}>
          <option value="">Sin reporte</option>
          {reports.map((report) => (
            <option key={report.id} value={report.id}>
              {reportLabel(report)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Caja desde" error={errors.boxFrom}>
        <input className={`${fieldClass} font-mono`} inputMode="numeric" value={draft.boxFrom} disabled={disabled} placeholder="45" onChange={(event) => set({ boxFrom: event.target.value })} />
      </Field>
      <Field label="Caja hasta" error={errors.boxTo}>
        <input className={`${fieldClass} font-mono`} inputMode="numeric" value={draft.boxTo} disabled={disabled} placeholder="46" onChange={(event) => set({ boxTo: event.target.value })} />
      </Field>
      <Field label="Desde (m)" error={errors.fromDepth}>
        <input className={`${fieldClass} font-mono`} inputMode="decimal" value={draft.fromDepth} disabled={disabled} placeholder="168.00" onChange={(event) => set({ fromDepth: event.target.value })} />
      </Field>
      <Field label="Hasta (m)" error={errors.toDepth}>
        <input className={`${fieldClass} font-mono`} inputMode="decimal" value={draft.toDepth} disabled={disabled} placeholder="175.35" onChange={(event) => set({ toDepth: event.target.value })} />
      </Field>
      <Field label="Comentario" className={compact ? "col-span-2" : "col-span-2 sm:col-span-4"}>
        <input className={fieldClass} value={draft.caption} disabled={disabled} maxLength={300} placeholder="Ej. Brecha con especularita a 175 m" onChange={(event) => set({ caption: event.target.value })} />
      </Field>
    </div>
  );
}

// ─── Visor ───────────────────────────────────────────────────────────────────
export function PhotoLightbox({
  photos,
  photoId,
  reports,
  onNavigate,
  onClose,
  afterSave
}: {
  photos: PhotoView[];
  photoId: string;
  reports: GeologyReportView[];
  onNavigate: (photoId: string) => void;
  onClose: () => void;
  afterSave: (message: { ok: string; offline: string }) => Promise<void>;
}) {
  const { can } = useAuth();
  const { showError, showSuccess } = useToast();
  const updatePhoto = useUpdatePhotoMutation();
  const deletePhoto = useDeletePhotoMutation();
  const index = photos.findIndex((photo) => photo.id === photoId);
  const photo = photos[index];
  const fullImage = usePhotoBlob(photo ?? null, "full");
  const [draft, setDraft] = useState<MetaDraft>(() => toDraft(photo ?? {}));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canEdit = can("geologiaSondajes", "update");

  useEffect(() => {
    if (photo) setDraft(toDraft(photo));
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === "INPUT" || (event.target as HTMLElement)?.tagName === "SELECT") return;
      if (event.key === "ArrowRight" && index < photos.length - 1) onNavigate(photos[index + 1].id);
      if (event.key === "ArrowLeft" && index > 0) onNavigate(photos[index - 1].id);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, photos, onNavigate]);

  if (!photo) return null;
  const dirty = JSON.stringify(fromDraft(draft)) !== JSON.stringify(fromDraft(toDraft(photo)));
  const invalid = Object.keys(draftErrors(draft)).length > 0;

  async function save() {
    try {
      await updatePhoto.mutateAsync({ photo, patch: fromDraft(draft) });
      await afterSave({ ok: "Foto actualizada.", offline: "Cambios de la foto guardados en este dispositivo." });
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo guardar la foto.");
    }
  }

  async function remove() {
    try {
      await deletePhoto.mutateAsync({ id: photo.id, pendingCreate: photo.pendingCreate });
      showSuccess(photo.pendingCreate ? "Foto descartada." : "Foto eliminada.");
      const next = photos[index + 1] ?? photos[index - 1];
      if (next) onNavigate(next.id);
      else onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo eliminar la foto.");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      icon={<Images size={20} />}
      title={photo.code ?? "Foto sin sincronizar"}
      subtitle={`${PHOTO_KINDS[photo.kind].label} · ${index + 1} de ${photos.length}${photo.sizeBytes ? ` · ${formatBytes(photo.sizeBytes)}` : ""}`}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative overflow-hidden rounded-2xl bg-slate-950">
          <PhotoImage photo={photo} variant="full" fit="contain" className="h-[52vh] w-full lg:h-[66vh]" alt={photoTitle(photo)} />
          {index > 0 ? (
            <button type="button" aria-label="Foto anterior" className="absolute left-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75" onClick={() => onNavigate(photos[index - 1].id)}>
              <ChevronLeft size={20} />
            </button>
          ) : null}
          {index < photos.length - 1 ? (
            <button type="button" aria-label="Foto siguiente" className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75" onClick={() => onNavigate(photos[index + 1].id)}>
              <ChevronRight size={20} />
            </button>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-[var(--color-surface-container-high)] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Código de la foto</p>
            <PhotoCode photo={photo} large />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <SyncPill sync={photo.sync} />
            {photo.width && photo.height ? (
              <span className="rounded-full bg-[var(--color-surface-container-high)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--color-on-surface-variant)]">
                {photo.width}×{photo.height}
              </span>
            ) : null}
          </div>
          {photo.syncError ? <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600">{photo.syncError}</p> : null}
          <button
            type="button"
            className={`${secondaryButton} w-full`}
            disabled={!fullImage.data}
            title={fullImage.data ? undefined : "La imagen aún no está disponible en este dispositivo"}
            onClick={() => fullImage.data && downloadBlob(fullImage.data, `${photo.code ?? photo.id}.${fullImage.data.type === "image/png" ? "png" : "jpg"}`)}
          >
            <Download size={15} />
            Descargar {photo.code ? `${photo.code}.jpg` : "imagen"}
          </button>
          <MetaFields draft={draft} onChange={setDraft} reports={reports} disabled={!canEdit} compact />
          <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--color-border-soft)] pt-3">
            {can("geologiaSondajes", "delete") ? (
              confirmDelete ? (
                <div className="flex gap-2">
                  <button type="button" className={dangerButton} onClick={remove} disabled={deletePhoto.isPending}>
                    <Trash2 size={15} />
                    {photo.pendingCreate ? "Descartar" : "Eliminar"}
                  </button>
                  <button type="button" className={secondaryButton} onClick={() => setConfirmDelete(false)}>
                    No
                  </button>
                </div>
              ) : (
                <button type="button" className={`${secondaryButton} hover:text-rose-600`} onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={15} />
                  Eliminar
                </button>
              )
            ) : (
              <span />
            )}
            {canEdit ? (
              <button type="button" className={primaryButton} onClick={save} disabled={!dirty || invalid || updatePhoto.isPending}>
                <Save size={15} />
                Guardar
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Subida ──────────────────────────────────────────────────────────────────
type Pending = { key: string; file: File; preview: string; draft: MetaDraft };

export function PhotoUploadModal({
  open,
  holeId,
  reports,
  defaults,
  knownHashes,
  onClose,
  afterSave
}: {
  open: boolean;
  holeId: string;
  reports: GeologyReportView[];
  defaults?: Partial<PhotoMeta>;
  knownHashes: string[];
  onClose: () => void;
  afterSave: (message: { ok: string; offline: string }) => Promise<void>;
}) {
  const { showError } = useToast();
  const addPhotos = useAddPhotosMutation();
  const [items, setItems] = useState<Pending[]>([]);
  const [progress, setProgress] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setItems((current) => {
        current.forEach((item) => URL.revokeObjectURL(item.preview));
        return [];
      });
      setProgress(0);
    }
  }, [open]);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const images = Array.from(list).filter((file) => file.type.startsWith("image/"));
    if (images.length < list.length) showError("Se ignoraron archivos que no son imágenes.");
    setItems((current) => [
      ...current,
      ...images.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        draft: toDraft({ kind: "CORE_BOX", ...defaults })
      }))
    ]);
  }

  function remove(key: string) {
    setItems((current) => {
      const item = current.find((entry) => entry.key === key);
      if (item) URL.revokeObjectURL(item.preview);
      return current.filter((entry) => entry.key !== key);
    });
  }

  const invalid = items.some((item) => Object.keys(draftErrors(item.draft)).length > 0);

  async function save() {
    try {
      const photos: NewPhoto[] = items.map((item) => ({ source: item.file, meta: fromDraft(item.draft) }));
      const { added, skipped } = await addPhotos.mutateAsync({ holeId, photos, knownHashes: new Set(knownHashes), onProgress: setProgress });
      onClose();
      const repeated = skipped ? ` ${skipped} ya estaba(n) en el pozo y se omitió(eron).` : "";
      await afterSave({
        ok: `${added} foto(s) subida(s).${repeated}`,
        offline: `${added} foto(s) guardada(s) en este dispositivo. Se subirán cuando haya conexión.${repeated}`
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudieron guardar las fotos.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !addPhotos.isPending && onClose()}
      size="xl"
      icon={<Camera size={20} />}
      title="Agregar fotografías"
      subtitle="Se comprimen en este dispositivo y se suben solas cuando hay conexión."
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose} disabled={addPhotos.isPending}>
            Cancelar
          </button>
          <button type="button" className={primaryButton} onClick={save} disabled={items.length === 0 || invalid || addPhotos.isPending}>
            <Save size={15} />
            {addPhotos.isPending ? `Procesando ${progress}/${items.length}...` : `Guardar ${items.length || ""} foto${items.length === 1 ? "" : "s"}`}
          </button>
        </>
      }
    >
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => cameraRef.current?.click()} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-border-soft)] p-4 text-left transition hover:border-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)]">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)]">
            <Camera size={20} />
          </span>
          <span>
            <span className="block text-sm font-bold">Tomar foto</span>
            <span className="block text-xs text-[var(--color-on-surface-variant)]">Abre la cámara del celular</span>
          </span>
        </button>
        <button type="button" onClick={() => galleryRef.current?.click()} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-border-soft)] p-4 text-left transition hover:border-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)]">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-container-highest)] text-[var(--color-primary)]">
            <ImagePlus size={20} />
          </span>
          <span>
            <span className="block text-sm font-bold">Elegir imágenes</span>
            <span className="block text-xs text-[var(--color-on-surface-variant)]">Varias a la vez, JPG o PNG</span>
          </span>
        </button>
      </div>

      {items.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {items.map((item, position) => (
            <li key={item.key} className="grid gap-3 rounded-2xl border border-[var(--color-border-soft)] p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
              <div className="relative overflow-hidden rounded-xl bg-slate-950">
                <img src={item.preview} alt="" className="aspect-[4/3] w-full object-cover" />
                <button type="button" className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Quitar" onClick={() => remove(item.key)}>
                  <X size={14} />
                </button>
                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {position + 1} · {formatBytes(item.file.size)}
                </span>
              </div>
              <MetaFields
                draft={item.draft}
                reports={reports}
                onChange={(draft) => setItems((current) => current.map((entry) => (entry.key === item.key ? { ...entry, draft } : entry)))}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-center text-xs text-[var(--color-on-surface-variant)]">
          Anota en cada foto las cajas y el tramo (como en el rótulo de la foto) para encontrarlas después.
        </p>
      )}
    </Modal>
  );
}

export function PhotoStrip({ photos, onOpen }: { photos: PhotoView[]; onOpen: (photo: PhotoView) => void }) {
  if (photos.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {photos.map((photo) => (
        <button key={photo.id} type="button" onClick={() => onOpen(photo)} className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border-soft)] transition hover:border-[var(--color-primary)]">
          <PhotoImage photo={photo} className="h-full w-full" />
          {photo.sync !== "synced" ? <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white" /> : null}
        </button>
      ))}
    </div>
  );
}


// Avisa si hay fotos con registro pero sin archivo en el servidor (por ejemplo, si se perdió el volumen de imágenes).
export function PhotoIntegrityBanner({ holeId }: { holeId: string }) {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const { can } = useAuth();
  const query = useQuery({ queryKey: ["sondajes", "photos-integrity", holeId], queryFn: () => getPhotosIntegrity(holeId), enabled: online, staleTime: 60_000, retry: false });
  const data = query.data;
  // Solo lo ve quien puede restaurar: al resto no se le muestra una alarma que no puede resolver.
  if (!can("geologiaSondajes", "update") || !data || data.missingCount === 0) return null;
  return (
    <div className="mb-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm" role="alert">
      <p className="flex items-center gap-2 font-bold text-rose-700">
        <AlertTriangle size={16} />
        {data.missingCount} de {data.total} foto(s) de este pozo no tienen su archivo en el servidor
      </p>
      <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
        Los registros y sus códigos están a salvo, pero la imagen no se encuentra en el almacenamiento del servidor. No es un problema de tu conexión.
        Avisa al administrador y conserva los Excel o las fotos originales para volver a cargarlas: {data.missing.slice(0, 6).map((item) => item.code).join(", ")}
        {data.missing.length > 6 ? "…" : ""}
      </p>
      <button type="button" className={`${primaryButton} mt-3`} onClick={() => setRestoreOpen(true)}>
        Restaurar imágenes con los Excel o fotos originales
      </button>
      <RestorePhotosModal
        open={restoreOpen}
        holeId={holeId}
        onClose={() => {
          setRestoreOpen(false);
          void query.refetch();
        }}
      />
    </div>
  );
}
