import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Microscope, Save, X } from "lucide-react";
import type { DrillingHole } from "@/features/sondajes/model/sondajes.schema";
import type { GeologyReportPayload, PhotoKind } from "@/features/sondajes/model/geology.schema";
import { PHOTO_KINDS, type GeologyReportView, type PhotoView } from "@/features/sondajes/lib/geology";
import { isoToReportDate, reportDateToIso, todayInputDate } from "@/features/sondajes/lib/shiftReports";
import { Field, Modal, SectionTitle, fieldClass, primaryButton, secondaryButton, toInputNumber, toNumberOrNull } from "@/features/sondajes/components/ui";
import { PhotoStrip } from "@/features/sondajes/components/geology/Photos";

export type AttachedPhoto = { key: string; file: File; preview: string; kind: PhotoKind };

// Los mismos campos de la hoja 01_RESUMEN del Excel de geología.
type Text = {
  date: string;
  fromDepth: string;
  toDepth: string;
  plannedEast: string;
  plannedNorth: string;
  plannedElevation: string;
  executedEast: string;
  executedNorth: string;
  executedElevation: string;
  rigName: string;
  diameter: string;
  casing: string;
  azimuth: string;
  dip: string;
  programmedDepth: string;
  startDate: string;
  endStatus: string;
  geologists: string;
  geologySummary: string;
  operationalNotes: string;
};

const NUMERIC: Array<keyof Text> = ["plannedEast", "plannedNorth", "plannedElevation", "executedEast", "executedNorth", "executedElevation"];

function fromReport(report: GeologyReportView): Omit<Text, "date" | "fromDepth" | "toDepth" | "geologySummary" | "operationalNotes"> {
  return {
    plannedEast: toInputNumber(report.plannedEast),
    plannedNorth: toInputNumber(report.plannedNorth),
    plannedElevation: toInputNumber(report.plannedElevation),
    executedEast: toInputNumber(report.executedEast),
    executedNorth: toInputNumber(report.executedNorth),
    executedElevation: toInputNumber(report.executedElevation),
    rigName: report.rigName ?? "",
    diameter: report.diameter ?? "",
    casing: report.casing ?? "",
    azimuth: report.azimuth ?? "",
    dip: report.dip ?? "",
    programmedDepth: report.programmedDepth ?? "",
    startDate: report.startDate ? isoToReportDate(report.startDate) : "",
    endStatus: report.endStatus ?? "",
    geologists: report.geologists ?? ""
  };
}

// Primer reporte del pozo: se sugiere lo que ya se conoce del pozo (el geólogo lo puede corregir).
function fromHole(hole: DrillingHole): ReturnType<typeof fromReport> {
  return {
    plannedEast: toInputNumber(hole.plannedEast),
    plannedNorth: toInputNumber(hole.plannedNorth),
    plannedElevation: toInputNumber(hole.plannedElevation),
    executedEast: toInputNumber(hole.east),
    executedNorth: toInputNumber(hole.north),
    executedElevation: toInputNumber(hole.elevation),
    rigName: "",
    diameter: "",
    casing: "",
    azimuth: hole.plannedAzimuth != null ? `${String(Math.round(hole.plannedAzimuth)).padStart(3, "0")}°` : "",
    dip: hole.plannedDip != null ? `${hole.plannedDip}°` : "",
    programmedDepth: hole.plannedDepth != null ? `${hole.plannedDepth} m` : "",
    startDate: hole.startedAt ? isoToReportDate(hole.startedAt) : "",
    endStatus: hole.status === "DRILLING" ? "En Progreso" : "",
    geologists: ""
  };
}

function initialText(report: GeologyReportView | null, last: GeologyReportView | undefined, hole: DrillingHole, suggestedFrom: number): Text {
  if (report) {
    return {
      ...fromReport(report),
      date: isoToReportDate(report.date),
      fromDepth: toInputNumber(report.fromDepth),
      toDepth: toInputNumber(report.toDepth),
      geologySummary: report.geologySummary ?? "",
      operationalNotes: report.operationalNotes ?? ""
    };
  }
  // Nuevo: la información del sondaje no cambia de un día a otro, se copia del último reporte.
  return {
    ...(last ? fromReport(last) : fromHole(hole)),
    date: todayInputDate(),
    fromDepth: suggestedFrom > 0 ? String(suggestedFrom) : "",
    toDepth: "",
    geologySummary: "",
    operationalNotes: ""
  };
}

const nullable = (value: string) => value.trim() || null;
const numberOrNull = (value: string) => {
  const parsed = toNumberOrNull(value);
  return parsed === null || Number.isNaN(parsed) ? null : parsed;
};

export function GeologyReportFormModal({
  open,
  report,
  hole,
  reports,
  photos,
  suggestedFrom,
  saving,
  onClose,
  onSubmit
}: {
  open: boolean;
  report: GeologyReportView | null;
  hole: DrillingHole;
  reports: GeologyReportView[];
  photos: PhotoView[];
  suggestedFrom: number;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: GeologyReportPayload, attached: AttachedPhoto[]) => Promise<void>;
}) {
  const last = reports.find((item) => item.sync !== "error" && item.id !== report?.id);
  const [form, setForm] = useState<Text>(() => initialText(report, last, hole, suggestedFrom));
  const [attached, setAttached] = useState<AttachedPhoto[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof Text, string>>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initialText(report, last, hole, suggestedFrom));
    setErrors({});
    setAttached((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.preview));
      return [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, report?.id]);

  const set = (key: keyof Text) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const from = toNumberOrNull(form.fromDepth);
  const to = toNumberOrNull(form.toDepth);
  const advance = from !== null && to !== null && !Number.isNaN(from) && !Number.isNaN(to) ? to - from : null;
  const reportPhotos = report ? photos.filter((photo) => photo.reportId === report.id) : [];

  function validate() {
    const next: Partial<Record<keyof Text, string>> = {};
    if (!form.date) next.date = "Elige la fecha";
    else if (reports.some((item) => item.id !== report?.id && isoToReportDate(item.date) === form.date)) next.date = "Ya hay un reporte geológico en esa fecha";
    if (from === null || Number.isNaN(from) || from < 0) next.fromDepth = "Escribe la profundidad anterior";
    if (to === null || Number.isNaN(to)) next.toDepth = "Escribe la profundidad actual";
    else if (from !== null && !Number.isNaN(from) && to < from) next.toDepth = "No puede ser menor que la anterior";
    for (const key of NUMERIC) if (Number.isNaN(toNumberOrNull(form[key]))) next[key] = "Número no válido";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    await onSubmit(
      {
        date: reportDateToIso(form.date),
        fromDepth: from as number,
        toDepth: to as number,
        plannedEast: numberOrNull(form.plannedEast),
        plannedNorth: numberOrNull(form.plannedNorth),
        plannedElevation: numberOrNull(form.plannedElevation),
        executedEast: numberOrNull(form.executedEast),
        executedNorth: numberOrNull(form.executedNorth),
        executedElevation: numberOrNull(form.executedElevation),
        rigName: nullable(form.rigName),
        diameter: nullable(form.diameter),
        casing: nullable(form.casing),
        azimuth: nullable(form.azimuth),
        dip: nullable(form.dip),
        programmedDepth: nullable(form.programmedDepth),
        startDate: form.startDate ? reportDateToIso(form.startDate) : null,
        endStatus: nullable(form.endStatus),
        geologists: nullable(form.geologists),
        geologySummary: nullable(form.geologySummary),
        operationalNotes: nullable(form.operationalNotes)
      },
      attached
    );
  }

  function attach(list: FileList | null) {
    if (!list) return;
    // Se copia ya: la FileList se vacía al limpiar el input.
    const added = Array.from(list)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({ key: `${file.name}-${file.lastModified}-${Math.random()}`, file, preview: URL.createObjectURL(file), kind: "DETAIL" as PhotoKind }));
    setAttached((current) => [...current, ...added]);
  }

  const hasErrors = Object.keys(errors).length > 0;
  const coordinate = (key: keyof Text, placeholder: string) => (
    <Field label={placeholder} error={errors[key]}>
      <input className={`${fieldClass} font-mono`} inputMode="decimal" value={form[key]} onChange={set(key)} />
    </Field>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      icon={<Microscope size={20} />}
      title={report ? "Editar reporte geológico" : "Nuevo reporte geológico"}
      subtitle={`Pozo ${hole.code} · Reporte diario de perforación diamantina`}
      footer={
        <>
          {hasErrors ? <p className="mr-auto self-center text-xs font-semibold text-rose-500">Revisa los campos marcados.</p> : null}
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="geology-report-form" className={primaryButton} disabled={saving}>
            <Save size={15} />
            {saving ? "Guardando..." : "Guardar reporte"}
          </button>
        </>
      }
    >
      <form id="geology-report-form" onSubmit={submit} className="space-y-6" noValidate>
        <section>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Fecha de reporte" error={errors.date} required>
              <input type="date" className={fieldClass} value={form.date} onChange={set("date")} />
            </Field>
            <Field label="Profundidad anterior" error={errors.fromDepth} required>
              <input className={`${fieldClass} font-mono`} inputMode="decimal" value={form.fromDepth} onChange={set("fromDepth")} placeholder="177" />
            </Field>
            <Field label="Profundidad actual" error={errors.toDepth} required>
              <input className={`${fieldClass} font-mono`} inputMode="decimal" value={form.toDepth} onChange={set("toDepth")} placeholder="200" />
            </Field>
            <div className="rounded-xl bg-[var(--color-primary)] px-3 py-2 text-[var(--color-on-primary)]">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Avance en 24 horas</p>
              <p className="font-mono text-2xl font-extrabold tabular-nums">{advance !== null && advance >= 0 ? `${Math.round(advance * 100) / 100}` : "—"}</p>
            </div>
          </div>
        </section>

        <section>
          <SectionTitle>1. Información del sondaje</SectionTitle>
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--color-border-soft)] p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Coordenadas UTM WGS84, zona 19S; Cota</p>
              <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-bold text-[var(--color-primary)]">Programado</p>
                  <div className="grid grid-cols-3 gap-2">
                    {coordinate("plannedEast", "Este (m)")}
                    {coordinate("plannedNorth", "Norte (m)")}
                    {coordinate("plannedElevation", "Elev (m)")}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold text-[var(--color-primary)]">Ejecutado</p>
                  <div className="grid grid-cols-3 gap-2">
                    {coordinate("executedEast", "Este (m)")}
                    {coordinate("executedNorth", "Norte (m)")}
                    {coordinate("executedElevation", "Elev (m)")}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Equipo">
                <input className={fieldClass} value={form.rigName} onChange={set("rigName")} placeholder="Hengwang" />
              </Field>
              <Field label="Diámetro">
                <input className={fieldClass} value={form.diameter} onChange={set("diameter")} placeholder="HQ" />
              </Field>
              <Field label="Encamizado">
                <input className={fieldClass} value={form.casing} onChange={set("casing")} placeholder="6 m" />
              </Field>
              <Field label="Azimut">
                <input className={fieldClass} value={form.azimuth} onChange={set("azimuth")} placeholder="020°" />
              </Field>
              <Field label="Inclinación">
                <input className={fieldClass} value={form.dip} onChange={set("dip")} placeholder="-52°" />
              </Field>
              <Field label="Profundidad programada">
                <input className={fieldClass} value={form.programmedDepth} onChange={set("programmedDepth")} placeholder="200 m" />
              </Field>
              <Field label="Fecha de inicio">
                <input type="date" className={fieldClass} value={form.startDate} onChange={set("startDate")} />
              </Field>
              <Field label="Fecha de finalización" hint="Escribe la fecha o «En Progreso».">
                <input className={fieldClass} value={form.endStatus} onChange={set("endStatus")} placeholder="En Progreso" />
              </Field>
              <Field label="Geólogos responsables">
                <input className={fieldClass} value={form.geologists} onChange={set("geologists")} placeholder="E. Apaza / J. L. Quelali" />
              </Field>
            </div>
          </div>
        </section>

        <section>
          <SectionTitle aside={<span className="font-mono text-xs text-[var(--color-on-surface-variant)]">Intervalo reportado: {form.fromDepth || "?"} a {form.toDepth || "?"} metros</span>}>
            2. Resumen geológico del avance
          </SectionTitle>
          <textarea
            className={`${fieldClass} min-h-[180px] resize-y leading-relaxed`}
            value={form.geologySummary}
            onChange={set("geologySummary")}
            placeholder="165.00–172.00 m: Toba cristalina gris verdosa, de grano medio, con vetillas ocasionales de pirita..."
          />
        </section>

        <section>
          <SectionTitle>3. Observaciones operativas</SectionTitle>
          <textarea
            className={`${fieldClass} min-h-[110px] resize-y`}
            value={form.operationalNotes}
            onChange={set("operationalNotes")}
            placeholder="Perforación regular sobre roca semi compacta. Lectura survey a los 200 m..."
          />
        </section>

        <section>
          <SectionTitle
            aside={
              <button type="button" className={secondaryButton} onClick={() => fileRef.current?.click()}>
                <Camera size={15} />
                Adjuntar fotos
              </button>
            }
          >
            4. Evidencia geológica y fotográfica
          </SectionTitle>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { attach(event.target.files); event.target.value = ""; }} />
          {reportPhotos.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1.5 text-xs text-[var(--color-on-surface-variant)]">Ya asociadas a este reporte ({reportPhotos.length}). Se editan desde la pestaña Fotos.</p>
              <PhotoStrip photos={reportPhotos} onOpen={() => undefined} />
            </div>
          ) : null}
          {attached.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {attached.map((item) => (
                <li key={item.key} className="overflow-hidden rounded-xl border border-[var(--color-border-soft)]">
                  <div className="relative">
                    <img src={item.preview} alt="" className="aspect-[4/3] w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Quitar"
                      className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                      onClick={() =>
                        setAttached((current) => {
                          URL.revokeObjectURL(item.preview);
                          return current.filter((entry) => entry.key !== item.key);
                        })
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <select
                    className="w-full border-t border-[var(--color-border-soft)] bg-transparent px-2 py-1.5 text-xs font-semibold"
                    value={item.kind}
                    onChange={(event) =>
                      setAttached((current) => current.map((entry) => (entry.key === item.key ? { ...entry, kind: event.target.value as PhotoKind } : entry)))
                    }
                  >
                    {(Object.keys(PHOTO_KINDS) as PhotoKind[]).map((kind) => (
                      <option key={kind} value={kind}>
                        {PHOTO_KINDS[kind].label}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          ) : reportPhotos.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border-soft)] px-4 py-6 text-center text-xs text-[var(--color-on-surface-variant)]">
              Adjunta la fotografía representativa del testigo (resumen), la memoria fotográfica o la sección geológica.
            </p>
          ) : null}
        </section>
      </form>
    </Modal>
  );
}
