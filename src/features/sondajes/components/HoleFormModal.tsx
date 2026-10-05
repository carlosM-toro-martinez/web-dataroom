import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Drill, Save } from "lucide-react";
import {
  DRILLING_HOLE_STATUSES,
  type DrillingCampaign,
  type DrillingHole,
  type DrillingHoleStatus,
  type DrillingHoleType
} from "@/features/sondajes/model/sondajes.schema";
import { HOLE_STATUS_META } from "@/features/sondajes/components/HoleStatus";
import {
  Field,
  Modal,
  SectionTitle,
  fieldClass,
  primaryButton,
  secondaryButton,
  toInputNumber,
  toNumberOrNull
} from "@/features/sondajes/components/ui";

type FormState = {
  campaignId: string;
  code: string;
  type: DrillingHoleType;
  status: DrillingHoleStatus;
  locationType: "SURFACE" | "UNDERGROUND";
  sector: string;
  target: string;
  plannedEast: string;
  plannedNorth: string;
  plannedElevation: string;
  plannedAzimuth: string;
  plannedDip: string;
  plannedDepth: string;
  east: string;
  north: string;
  elevation: string;
  azimuth: string;
  dip: string;
  finalDepth: string;
  startedAt: string;
  finishedAt: string;
  notes: string;
};

const NUMBER_FIELDS = [
  "plannedEast",
  "plannedNorth",
  "plannedElevation",
  "plannedAzimuth",
  "plannedDip",
  "plannedDepth",
  "east",
  "north",
  "elevation",
  "azimuth",
  "dip",
  "finalDepth"
] as const;

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function initialState(hole?: DrillingHole | null, campaignId?: string): FormState {
  return {
    campaignId: hole?.campaignId ?? campaignId ?? "",
    code: hole?.code ?? "",
    type: hole?.type ?? "DDH",
    status: hole?.status ?? "PLANNED",
    locationType: hole?.locationType ?? "SURFACE",
    sector: hole?.sector ?? "",
    target: hole?.target ?? "",
    plannedEast: toInputNumber(hole?.plannedEast),
    plannedNorth: toInputNumber(hole?.plannedNorth),
    plannedElevation: toInputNumber(hole?.plannedElevation),
    plannedAzimuth: toInputNumber(hole?.plannedAzimuth),
    plannedDip: toInputNumber(hole?.plannedDip),
    plannedDepth: toInputNumber(hole?.plannedDepth),
    east: toInputNumber(hole?.east),
    north: toInputNumber(hole?.north),
    elevation: toInputNumber(hole?.elevation),
    azimuth: toInputNumber(hole?.azimuth),
    dip: toInputNumber(hole?.dip),
    finalDepth: toInputNumber(hole?.finalDepth),
    startedAt: toDateInput(hole?.startedAt),
    finishedAt: toDateInput(hole?.finishedAt),
    notes: hole?.notes ?? ""
  };
}

function validate(form: FormState) {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.campaignId) errors.campaignId = "Elige el programa";
  if (!form.code.trim()) errors.code = "Escribe el nombre del pozo";
  for (const field of NUMBER_FIELDS) {
    const value = toNumberOrNull(form[field]);
    if (Number.isNaN(value)) errors[field] = "Número no válido";
  }
  const range = (field: keyof FormState, min: number, max: number, message: string) => {
    const value = toNumberOrNull(form[field]);
    if (value !== null && !Number.isNaN(value) && (value < min || value > max)) errors[field] = message;
  };
  range("plannedAzimuth", 0, 360, "Entre 0 y 360");
  range("azimuth", 0, 360, "Entre 0 y 360");
  range("plannedDip", -90, 90, "Entre -90 y 90");
  range("dip", -90, 90, "Entre -90 y 90");
  range("plannedDepth", 0, 100000, "No puede ser negativa");
  range("finalDepth", 0, 100000, "No puede ser negativa");
  if (form.startedAt && form.finishedAt && form.finishedAt < form.startedAt) {
    errors.finishedAt = "Debe ser posterior al inicio";
  }
  return errors;
}

function toPayload(form: FormState, isEdit: boolean) {
  const dateToIso = (value: string) => (value ? new Date(`${value}T12:00:00`).toISOString() : null);
  const text = (value: string) => value.trim() || null;
  const payload: Record<string, unknown> = {
    code: form.code.trim(),
    type: form.type,
    status: form.status,
    locationType: form.locationType,
    sector: text(form.sector),
    target: text(form.target),
    notes: text(form.notes),
    startedAt: dateToIso(form.startedAt),
    finishedAt: dateToIso(form.finishedAt)
  };
  for (const field of NUMBER_FIELDS) payload[field] = toNumberOrNull(form[field]);
  if (!isEdit) {
    payload.campaignId = form.campaignId;
    // Al crear no se envían campos vacíos.
    Object.keys(payload).forEach((key) => payload[key] === null && delete payload[key]);
  }
  return payload;
}

export function HoleFormModal({
  open,
  hole,
  defaultCampaignId,
  campaigns,
  saving,
  onClose,
  onSubmit
}: {
  open: boolean;
  hole?: DrillingHole | null;
  defaultCampaignId?: string;
  campaigns: DrillingCampaign[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const isEdit = Boolean(hole);
  const [form, setForm] = useState<FormState>(() => initialState(hole, defaultCampaignId));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [showExecution, setShowExecution] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialState(hole, defaultCampaignId));
    setErrors({});
    setShowExecution(Boolean(hole && (hole.finalDepth != null || hole.east != null || hole.startedAt)));
  }, [open, hole, defaultCampaignId]);

  const set = (field: keyof FormState) => (value: string) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const executionFields = ["east", "north", "elevation", "azimuth", "dip", "finalDepth", "startedAt", "finishedAt"];
      if (Object.keys(nextErrors).some((key) => executionFields.includes(key))) setShowExecution(true);
      return;
    }
    await onSubmit(toPayload(form, isEdit));
  }

  const numberInput = (field: (typeof NUMBER_FIELDS)[number], placeholder: string) => (
    <input
      className={`${fieldClass} font-mono tabular-nums`}
      inputMode="decimal"
      value={form[field]}
      onChange={(event) => set(field)(event.target.value)}
      placeholder={placeholder}
    />
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<Drill size={20} />}
      title={isEdit ? `Editar pozo ${hole?.code}` : "Nuevo pozo"}
      subtitle="Datos del programa de perforación"
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="hole-form" className={primaryButton} disabled={saving}>
            <Save size={16} />
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear pozo"}
          </button>
        </>
      }
    >
      <form id="hole-form" onSubmit={submit} className="space-y-6" noValidate>
        <section>
          <SectionTitle>Identificación</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Drillhole" required error={errors.code}>
              <input
                className={`${fieldClass} font-semibold`}
                value={form.code}
                onChange={(event) => set("code")(event.target.value)}
                placeholder="Ej. 26DLP080 o DDH M010"
                autoFocus
              />
            </Field>
            <Field label="Programa" required error={errors.campaignId}>
              <select className={fieldClass} value={form.campaignId} onChange={(event) => set("campaignId")(event.target.value)} disabled={isEdit}>
                <option value="">Selecciona un programa</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo">
              <select className={fieldClass} value={form.type} onChange={(event) => set("type")(event.target.value)}>
                <option value="DDH">DDH · Diamantina</option>
                <option value="RC">RC · Aire reverso</option>
                <option value="AC">AC · Air core</option>
                <option value="OTHER">Otro</option>
              </select>
            </Field>
            <Field label="Ubicación">
              <select className={fieldClass} value={form.locationType} onChange={(event) => set("locationType")(event.target.value)}>
                <option value="SURFACE">Superficie</option>
                <option value="UNDERGROUND">Interior mina</option>
              </select>
            </Field>
          </div>
        </section>

        <section>
          <SectionTitle>Estado</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {DRILLING_HOLE_STATUSES.map((status) => {
              const meta = HOLE_STATUS_META[status];
              const Icon = meta.icon;
              const active = form.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => set("status")(status)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? `${meta.badge} border-transparent ring-2`
                      : "border-[var(--color-border-soft)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]"
                  }`}
                >
                  <Icon size={15} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle>Collar y orientación programados</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="X (Este)" error={errors.plannedEast}>{numberInput("plannedEast", "Ej. 762368.84")}</Field>
            <Field label="Y (Norte)" error={errors.plannedNorth}>{numberInput("plannedNorth", "Ej. 7593831.70")}</Field>
            <Field label="Z (Cota)" error={errors.plannedElevation}>{numberInput("plannedElevation", "Ej. 4958.56")}</Field>
            <Field label="Azimuth (°)" error={errors.plannedAzimuth}>{numberInput("plannedAzimuth", "Ej. 150")}</Field>
            <Field label="Dip (°)" error={errors.plannedDip}>{numberInput("plannedDip", "Ej. 50")}</Field>
            <Field label="Target depth (m)" error={errors.plannedDepth}>{numberInput("plannedDepth", "Ej. 200")}</Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Sector">
              <input className={fieldClass} value={form.sector} onChange={(event) => set("sector")(event.target.value)} placeholder="Ej. Veta Esperanza" />
            </Field>
            <Field label="Objetivo">
              <input className={fieldClass} value={form.target} onChange={(event) => set("target")(event.target.value)} placeholder="Ej. Cortar estructura a 150 m" />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-border-soft)]">
          <button
            type="button"
            onClick={() => setShowExecution((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-bold">Datos de ejecución</span>
              <span className="block text-xs text-[var(--color-on-surface-variant)]">
                Collar real, profundidad final y fechas (opcional)
              </span>
            </span>
            <ChevronDown size={18} className={`transition ${showExecution ? "rotate-180" : ""}`} />
          </button>
          {showExecution ? (
            <div className="grid gap-4 border-t border-[var(--color-border-soft)] p-4 sm:grid-cols-3">
              <Field label="X real" error={errors.east}>{numberInput("east", "—")}</Field>
              <Field label="Y real" error={errors.north}>{numberInput("north", "—")}</Field>
              <Field label="Z real" error={errors.elevation}>{numberInput("elevation", "—")}</Field>
              <Field label="Azimuth real (°)" error={errors.azimuth}>{numberInput("azimuth", "—")}</Field>
              <Field label="Dip real (°)" error={errors.dip}>{numberInput("dip", "—")}</Field>
              <Field label="Profundidad final (m)" error={errors.finalDepth}>{numberInput("finalDepth", "—")}</Field>
              <Field label="Inicio" hint="Se llena solo al pasar a En proceso">
                <input type="date" className={fieldClass} value={form.startedAt} onChange={(event) => set("startedAt")(event.target.value)} />
              </Field>
              <Field label="Fin" error={errors.finishedAt} hint="Se llena solo al pasar a Terminado">
                <input type="date" className={fieldClass} value={form.finishedAt} onChange={(event) => set("finishedAt")(event.target.value)} />
              </Field>
            </div>
          ) : null}
        </section>

        <Field label="Notas">
          <textarea
            className={`${fieldClass} min-h-[84px] resize-y`}
            value={form.notes}
            onChange={(event) => set("notes")(event.target.value)}
            placeholder="Observaciones del pozo"
          />
        </Field>
      </form>
    </Modal>
  );
}
