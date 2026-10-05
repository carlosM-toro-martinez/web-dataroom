import { useEffect, useState, type FormEvent } from "react";
import { FolderKanban, Save } from "lucide-react";
import type { DrillingCampaign } from "@/features/sondajes/model/sondajes.schema";
import { Field, Modal, fieldClass, primaryButton, secondaryButton, toInputNumber, toNumberOrNull } from "@/features/sondajes/components/ui";

type FormState = {
  name: string;
  code: string;
  area: string;
  category: "EXPLORATION" | "PRODUCTION";
  status: "PLANNED" | "ACTIVE" | "CLOSED";
  plannedMeters: string;
  startDate: string;
  endDate: string;
  objective: string;
};

function initialState(campaign?: DrillingCampaign | null): FormState {
  return {
    name: campaign?.name ?? "",
    code: campaign?.code ?? "",
    area: campaign?.area ?? "",
    category: campaign?.category ?? "EXPLORATION",
    status: campaign?.status ?? "ACTIVE",
    plannedMeters: toInputNumber(campaign?.plannedMeters),
    startDate: campaign?.startDate?.slice(0, 10) ?? "",
    endDate: campaign?.endDate?.slice(0, 10) ?? "",
    objective: campaign?.objective ?? ""
  };
}

// Código sugerido a partir del nombre: "Programa DDH 2026 MOSA (FASE 1)" → "DDH-2026-MOSA-F1".
export function suggestProgramCode(name: string) {
  const year = name.match(/\b(19|20)\d{2}\b/)?.[0];
  const phase = name.match(/fase\s*(\d+)/i)?.[1];
  const words = name
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(programa|de|perforacion|perforación|fase|\d+)\b/gi, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  return [...words.slice(0, 1), year, ...words.slice(1, 3), phase ? `F${phase}` : undefined].filter(Boolean).join("-");
}

export function ProgramFormModal({
  open,
  campaign,
  saving,
  onClose,
  onSubmit
}: {
  open: boolean;
  campaign?: DrillingCampaign | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const isEdit = Boolean(campaign);
  const [form, setForm] = useState<FormState>(() => initialState(campaign));
  const [codeTouched, setCodeTouched] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    setForm(initialState(campaign));
    setCodeTouched(Boolean(campaign));
    setErrors({});
  }, [open, campaign]);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "name" && !codeTouched) next.code = suggestProgramCode(value);
      return next;
    });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Escribe el nombre del programa";
    if (!form.code.trim()) nextErrors.code = "Escribe un código";
    const meters = toNumberOrNull(form.plannedMeters);
    if (Number.isNaN(meters) || (meters !== null && meters < 0)) nextErrors.plannedMeters = "Número no válido";
    if (form.startDate && form.endDate && form.endDate < form.startDate) nextErrors.endDate = "Debe ser posterior al inicio";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const date = (value: string) => (value ? new Date(`${value}T12:00:00`).toISOString() : null);
    await onSubmit({
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      area: form.area.trim().toUpperCase() || null,
      category: form.category,
      status: form.status,
      plannedMeters: meters,
      startDate: date(form.startDate),
      endDate: date(form.endDate),
      objective: form.objective.trim() || null
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      icon={<FolderKanban size={20} />}
      title={isEdit ? "Editar programa" : "Nuevo programa de perforación"}
      subtitle="Agrupa los pozos de un área y fase"
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="program-form" className={primaryButton} disabled={saving}>
            <Save size={16} />
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear programa"}
          </button>
        </>
      }
    >
      <form id="program-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nombre" required error={errors.name} className="sm:col-span-2">
          <input
            className={fieldClass}
            value={form.name}
            onChange={(event) => set("name")(event.target.value)}
            placeholder="Programa DDH 2026 MOSA (FASE 1)"
            autoFocus
          />
        </Field>
        <Field label="Código" required error={errors.code} hint="Único; se sugiere a partir del nombre">
          <input
            className={`${fieldClass} font-mono uppercase`}
            value={form.code}
            onChange={(event) => {
              setCodeTouched(true);
              set("code")(event.target.value);
            }}
            placeholder="DDH-2026-MOSA-F1"
          />
        </Field>
        <Field label="Área">
          <input className={`${fieldClass} uppercase`} value={form.area} onChange={(event) => set("area")(event.target.value)} placeholder="MOSA" />
        </Field>
        <Field label="Categoría">
          <select className={fieldClass} value={form.category} onChange={(event) => set("category")(event.target.value)}>
            <option value="EXPLORATION">Exploración</option>
            <option value="PRODUCTION">Producción</option>
          </select>
        </Field>
        <Field label="Estado del programa">
          <select className={fieldClass} value={form.status} onChange={(event) => set("status")(event.target.value)}>
            <option value="PLANNED">Planificado</option>
            <option value="ACTIVE">Activo</option>
            <option value="CLOSED">Cerrado</option>
          </select>
        </Field>
        <Field label="Inicio">
          <input type="date" className={fieldClass} value={form.startDate} onChange={(event) => set("startDate")(event.target.value)} />
        </Field>
        <Field label="Fin" error={errors.endDate}>
          <input type="date" className={fieldClass} value={form.endDate} onChange={(event) => set("endDate")(event.target.value)} />
        </Field>
        <Field label="Metros planificados" error={errors.plannedMeters} hint="Opcional; si no, se suma el target de los pozos">
          <input className={`${fieldClass} font-mono`} inputMode="decimal" value={form.plannedMeters} onChange={(event) => set("plannedMeters")(event.target.value)} />
        </Field>
        <Field label="Objetivo" className="sm:col-span-2">
          <textarea className={`${fieldClass} min-h-[72px] resize-y`} value={form.objective} onChange={(event) => set("objective")(event.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
