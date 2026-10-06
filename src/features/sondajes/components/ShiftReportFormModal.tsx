import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, ClipboardList, Info, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import type { DrillingCampaign, DrillingHole } from "@/features/sondajes/model/sondajes.schema";
import { newLocalId, type DrillingPersonnelLocal, type PersonnelRole, type ShiftActivity, type ShiftIncident, type ShiftReportPayload } from "@/features/sondajes/db/sondajesDb";
import { REPORTE_DIARIO } from "@/features/sondajes/config/reporteDiarioFormato";
import {
  isoToReportDate,
  lastReport,
  nextReportNumber,
  reportDateToIso,
  todayInputDate,
  type ShiftReportView
} from "@/features/sondajes/lib/shiftReports";
import { Field, Modal, fieldClass, primaryButton, secondaryButton, toNumberOrNull } from "@/features/sondajes/components/ui";

const F = REPORTE_DIARIO;

// Campos de texto/número del formulario (todos como texto mientras se editan).
const TEXT_KEYS = [
  "date",
  "reportNumber",
  "fromDepth",
  "toDepth",
  "coreRecovery",
  "waterReturn",
  "rockType",
  "rigName",
  "coreBoxNumber",
  "diameter",
  "rcDiameter",
  "casing",
  "crownNumber",
  "reamerNumber",
  "shoeNumber",
  "operator",
  "firstHelper",
  "secondHelper",
  "driver",
  "supervisor",
  "drillingChief",
  "observations",
  "fuelOther"
] as const;
type TextKey = (typeof TEXT_KEYS)[number];

type ActivityRow = { from: string; to: string; depthFrom: string; depthTo: string; description: string; lithology: string };

type FormState = {
  text: Record<TextKey, string>;
  shift: "DAY" | "NIGHT";
  drillingMethod: "DIAMOND" | "REVERSE_AIR" | "";
  fuel: Record<string, string>;
  additives: Record<string, string>;
  hours: Record<string, string>;
  activities: ActivityRow[];
  incidents: ShiftIncident[];
};

const emptyActivity = (): ActivityRow => ({ from: "", to: "", depthFrom: "", depthTo: "", description: "", lithology: "" });
const str = (value: unknown) => (value === null || value === undefined ? "" : String(value));

// Campos que se copian del último parte del pozo (lo que normalmente no cambia de un turno a otro).
const CARRY_OVER: TextKey[] = [
  "rigName",
  "diameter",
  "rcDiameter",
  "casing",
  "crownNumber",
  "reamerNumber",
  "shoeNumber",
  "operator",
  "firstHelper",
  "secondHelper",
  "driver",
  "supervisor",
  "drillingChief"
];

function buildInitial(
  report: ShiftReportView | null | undefined,
  context: { hole: DrillingHole; reports: ShiftReportView[]; suggestedFrom: number }
): { state: FormState; auto: Set<string> } {
  const auto = new Set<string>();
  const source = report ?? undefined;
  const text = Object.fromEntries(TEXT_KEYS.map((key) => [key, ""])) as Record<TextKey, string>;

  if (source) {
    for (const key of TEXT_KEYS) text[key] = str((source as Record<string, unknown>)[key]);
    text.date = isoToReportDate(source.date);
    text.fuelOther = str(source.consumables?.other);
  } else {
    const previous = lastReport(context.reports);
    text.date = todayInputDate();
    text.reportNumber = nextReportNumber(context.reports);
    text.fromDepth = String(context.suggestedFrom);
    auto.add("date").add("reportNumber").add("fromDepth");
    for (const key of CARRY_OVER) {
      const value = str((previous as Record<string, unknown> | undefined)?.[key]);
      if (value) {
        text[key] = value;
        auto.add(key);
      }
    }
    if (!text.rigName) {
      const rigCode = (context.hole as { rig?: { code?: string } | null }).rig?.code;
      if (rigCode) {
        text.rigName = rigCode;
        auto.add("rigName");
      }
    }
  }

  const previous = source ? undefined : lastReport(context.reports);
  const drillingMethod =
    source?.drillingMethod ?? previous?.drillingMethod ?? (context.hole.type === "RC" ? "REVERSE_AIR" : "DIAMOND");
  if (!source) auto.add("drillingMethod");

  const hours: Record<string, string> = {
    drilling: str(source?.drillingHours),
    standby: str(source?.standbyHours),
    ...Object.fromEntries(Object.entries(source?.timeDetail ?? {}).map(([key, value]) => [key, str(value)]))
  };

  const activities = (source?.activities ?? []).map((row) => ({
    from: str(row.from),
    to: str(row.to),
    depthFrom: str(row.depthFrom),
    depthTo: str(row.depthTo),
    description: str(row.description),
    lithology: str(row.lithology)
  }));

  return {
    auto,
    state: {
      text,
      shift: source?.shift ?? (new Date().getHours() >= 19 || new Date().getHours() < 7 ? "NIGHT" : "DAY"),
      drillingMethod: drillingMethod ?? "",
      fuel: Object.fromEntries(F.combustibles.map((item) => [item.key, str(source?.consumables?.[item.key])])),
      additives: Object.fromEntries(F.aditivos.map((item) => [item.key, str(source?.additives?.[item.key])])),
      hours,
      activities: activities.length ? activities : [emptyActivity(), emptyActivity(), emptyActivity()],
      incidents: source?.incidents ?? []
    }
  };
}

const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

// Mapa de rol → campo del formulario
const ROLE_TO_FIELD: Record<PersonnelRole, TextKey> = {
  operator: "operator",
  firstHelper: "firstHelper",
  secondHelper: "secondHelper",
  driver: "driver",
  supervisor: "supervisor",
  drillingChief: "drillingChief"
};

const PERSONNEL_TEXT_KEYS: TextKey[] = ["operator", "firstHelper", "secondHelper", "driver", "supervisor", "drillingChief"];

// Rellena los campos de personal vacíos (o marcados como auto) con los datos de la BD local.
function applyPersonnel(
  text: Record<TextKey, string>,
  autoSet: Set<string>,
  shift: "DAY" | "NIGHT",
  personnel: DrillingPersonnelLocal[],
  forceOverwrite = false
): { text: Record<TextKey, string>; newAuto: Set<string> } {
  const newText = { ...text };
  const newAuto = new Set(autoSet);
  for (const role of Object.keys(ROLE_TO_FIELD) as PersonnelRole[]) {
    const field = ROLE_TO_FIELD[role];
    const isEmpty = !newText[field]?.trim();
    const wasAuto = newAuto.has(field);
    if (!isEmpty && !wasAuto && !forceOverwrite) continue;
    const matches = personnel.filter((p) => p.active && p.role === role && (p.shift === shift || p.shift === "BOTH"));
    if (matches.length === 1) {
      newText[field] = matches[0].name;
      newAuto.add(field);
    }
  }
  return { text: newText, newAuto };
}

export function ShiftReportFormModal({
  open,
  report,
  hole,
  campaign,
  reports,
  suggestedFrom,
  personnel = [],
  saving,
  onClose,
  onSubmit
}: {
  open: boolean;
  report?: ShiftReportView | null;
  hole: DrillingHole;
  campaign?: DrillingCampaign;
  reports: ShiftReportView[];
  suggestedFrom: number;
  personnel?: DrillingPersonnelLocal[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: ShiftReportPayload) => Promise<void>;
}) {
  const isEdit = Boolean(report);
  const [form, setForm] = useState<FormState>(() => buildInitial(report, { hole, reports, suggestedFrom }).state);
  const [auto, setAuto] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newIncident, setNewIncident] = useState({ category: F.incidencias.categorias[0] as string, severity: "MEDIUM" as ShiftIncident["severity"], description: "" });

  useEffect(() => {
    if (!open) return;
    const initial = buildInitial(report, { hole, reports, suggestedFrom });
    // Si es un parte nuevo, rellena personal vacío desde la BD local.
    if (!report && personnel.length > 0) {
      const applied = applyPersonnel(initial.state.text, initial.auto, initial.state.shift, personnel);
      initial.state.text = applied.text;
      initial.auto = applied.newAuto;
    }
    setForm(initial.state);
    setAuto(initial.auto);
    setErrors({});
    setNewIncident({ category: F.incidencias.categorias[0], severity: "MEDIUM", description: "" });
    // Solo al abrir: no se reinicia mientras el usuario escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, report]);

  const setText = (key: TextKey) => (value: string) => {
    setForm((current) => ({ ...current, text: { ...current.text, [key]: value } }));
    setAuto((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  };

  // Al cambiar de turno, rellena personal vacío (o auto) desde la BD local.
  function setShift(shift: "DAY" | "NIGHT") {
    setForm((current) => {
      if (personnel.length === 0) return { ...current, shift };
      const applied = applyPersonnel(current.text, auto, shift, personnel);
      setAuto(applied.newAuto);
      return { ...current, shift, text: applied.text };
    });
    setAuto((current) => {
      const next = new Set(current);
      next.delete("drillingMethod");
      return next;
    });
  }

  const from = toNumberOrNull(form.text.fromDepth);
  const to = toNumberOrNull(form.text.toDepth);
  const advance = from !== null && to !== null && !Number.isNaN(from) && !Number.isNaN(to) ? to - from : null;
  const dip = hole.dip ?? hole.plannedDip;

  const duplicate = useMemo(
    () => reports.find((item) => item.key !== report?.key && isoToReportDate(item.date) === form.text.date && item.shift === form.shift),
    [reports, form.text.date, form.shift, report?.key]
  );

  function validate() {
    const next: Record<string, string> = {};
    if (!form.text.date) next.date = "Elige la fecha";
    if (duplicate) next.date = `Ya hay un parte del turno ${F.turnos[form.shift]} en esta fecha`;
    if (from === null || Number.isNaN(from) || from < 0) next.fromDepth = "Escribe la profundidad anterior";
    if (to === null || Number.isNaN(to)) next.toDepth = "Escribe la profundidad actual";
    else if (from !== null && !Number.isNaN(from) && to <= from) next.toDepth = "Debe ser mayor que la anterior";
    const recovery = toNumberOrNull(form.text.coreRecovery);
    if (Number.isNaN(recovery) || (recovery !== null && recovery < 0)) next.coreRecovery = "Número no válido";
    const checkQty = (group: string, values: Record<string, string>, max: number) => {
      for (const [key, value] of Object.entries(values)) {
        const parsed = toNumberOrNull(value);
        if (Number.isNaN(parsed) || (parsed !== null && (parsed < 0 || parsed > max))) next[`${group}.${key}`] = max === 24 ? "0 a 24" : "No válido";
      }
    };
    checkQty("fuel", form.fuel, 100000);
    checkQty("additives", form.additives, 100000);
    checkQty("hours", form.hours, 24);
    form.activities.forEach((row, index) => {
      if (row.from && !TIME_PATTERN.test(row.from)) next[`act.${index}.from`] = "HH:MM";
      if (row.to && !TIME_PATTERN.test(row.to)) next[`act.${index}.to`] = "HH:MM";
      const depthFrom = toNumberOrNull(row.depthFrom);
      const depthTo = toNumberOrNull(row.depthTo);
      if (Number.isNaN(depthFrom)) next[`act.${index}.depthFrom`] = "No válido";
      if (Number.isNaN(depthTo)) next[`act.${index}.depthTo`] = "No válido";
      if (depthFrom !== null && depthTo !== null && !Number.isNaN(depthFrom) && !Number.isNaN(depthTo) && depthTo < depthFrom) {
        next[`act.${index}.depthTo`] = "Menor que «De»";
      }
    });
    return next;
  }

  function buildPayload(): ShiftReportPayload {
    const text = (value: string) => value.trim() || null;
    const numberOrNull = (value: string) => {
      const parsed = toNumberOrNull(value);
      return parsed === null || Number.isNaN(parsed) ? null : parsed;
    };
    const quantities = (values: Record<string, string>) => {
      const entries = Object.entries(values)
        .map(([key, value]) => [key, numberOrNull(value)] as const)
        .filter(([, value]) => value !== null);
      return entries.length ? Object.fromEntries(entries) : null;
    };
    const { drilling, standby, ...otherHours } = form.hours;
    const consumables = quantities(form.fuel);
    const activities: ShiftActivity[] = form.activities
      .filter((row) => Object.values(row).some((value) => value.trim()))
      .map((row) => ({
        from: row.from.trim() || null,
        to: row.to.trim() || null,
        depthFrom: numberOrNull(row.depthFrom),
        depthTo: numberOrNull(row.depthTo),
        description: text(row.description),
        lithology: text(row.lithology)
      }));

    return {
      ...(report ? { reviewStatus: report.reviewStatus, reviewedBy: report.reviewedBy, reviewedAt: report.reviewedAt, reviewNotes: report.reviewNotes } : {}),
      date: reportDateToIso(form.text.date),
      shift: form.shift,
      fromDepth: from as number,
      toDepth: to as number,
      reportNumber: text(form.text.reportNumber),
      coreRecovery: numberOrNull(form.text.coreRecovery),
      waterReturn: text(form.text.waterReturn),
      rockType: text(form.text.rockType),
      rigName: text(form.text.rigName),
      coreBoxNumber: text(form.text.coreBoxNumber),
      drillingMethod: form.drillingMethod || null,
      diameter: text(form.text.diameter),
      rcDiameter: text(form.text.rcDiameter),
      casing: text(form.text.casing),
      crownNumber: text(form.text.crownNumber),
      reamerNumber: text(form.text.reamerNumber),
      shoeNumber: text(form.text.shoeNumber),
      operator: text(form.text.operator),
      firstHelper: text(form.text.firstHelper),
      secondHelper: text(form.text.secondHelper),
      driver: text(form.text.driver),
      supervisor: text(form.text.supervisor),
      drillingChief: text(form.text.drillingChief),
      observations: text(form.text.observations),
      drillingHours: numberOrNull(drilling ?? ""),
      standbyHours: numberOrNull(standby ?? ""),
      timeDetail: quantities(otherHours),
      consumables: consumables || form.text.fuelOther.trim() ? { ...(consumables ?? {}), other: text(form.text.fuelOther) } : null,
      additives: quantities(form.additives),
      activities: activities.length ? activities : null,
      incidents: form.incidents.length ? form.incidents : null
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      document.getElementById("shift-report-form")?.querySelector("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    await onSubmit(buildPayload());
  }

  function updateActivity(index: number, key: keyof ActivityRow, value: string) {
    setForm((current) => ({
      ...current,
      activities: current.activities.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row))
    }));
  }

  // Al agregar una fila, continúa donde terminó la anterior (hora y profundidad).
  function addActivity() {
    setForm((current) => {
      const previous = current.activities[current.activities.length - 1];
      return { ...current, activities: [...current.activities, { ...emptyActivity(), from: previous?.to ?? "", depthFrom: previous?.depthTo ?? "" }] };
    });
  }

  function addIncident() {
    if (!newIncident.description.trim()) return;
    setForm((current) => ({
      ...current,
      incidents: [
        ...current.incidents,
        {
          id: newLocalId(),
          category: newIncident.category,
          severity: newIncident.severity,
          description: newIncident.description.trim(),
          status: "OPEN",
          createdAt: new Date().toISOString()
        }
      ]
    }));
    setNewIncident((current) => ({ ...current, description: "" }));
  }

  const textInput = (key: TextKey, options: { placeholder?: string; mono?: boolean; numeric?: boolean } = {}) => (
    <input
      className={`${fieldClass} ${options.mono ? "font-mono tabular-nums" : ""}`}
      inputMode={options.numeric ? "decimal" : undefined}
      value={form.text[key]}
      placeholder={options.placeholder}
      onChange={(event) => setText(key)(event.target.value)}
      data-error={errors[key] ? "true" : undefined}
    />
  );

  const label = (text: string, key?: string) => (
    <span className="inline-flex items-center gap-1.5">
      {text}
      {key && auto.has(key) ? <AutoTag /> : null}
    </span>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      icon={<ClipboardList size={20} />}
      title={isEdit ? `Editar parte No. ${report?.reportNumber ?? ""}` : "Nuevo parte diario"}
      subtitle={F.titulo}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="shift-report-form" className={primaryButton} disabled={saving}>
            <Save size={16} />
            {saving ? "Guardando..." : "Guardar parte"}
          </button>
        </>
      }
    >
      <form id="shift-report-form" onSubmit={submit} className="space-y-4" noValidate>
        {Object.keys(errors).length > 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm font-semibold text-rose-600">
            <AlertTriangle size={16} />
            Revisa los campos marcados en rojo.
          </p>
        ) : null}

        {/* Encabezado de la hoja */}
        <Sheet>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-soft)] px-4 py-3">
            <div>
              <p className="text-sm font-black tracking-wide text-[var(--color-primary)]">{F.empresa}</p>
              <p className="text-[10px] font-bold uppercase text-[var(--color-on-surface-variant)]">{F.titulo}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-on-surface-variant)]">
              <Sparkles size={13} className="text-[var(--color-primary)]" />
              Lo marcado «auto» se llenó solo; puedes cambiarlo.
            </span>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
            <ReadOnly label="Proyecto" value={F.proyecto(campaign)} />
            <ReadOnly label="Pozo" value={hole.code} />
            <ReadOnly label="Buzamiento" value={dip === null || dip === undefined ? "—" : `${dip}°`} />
            <Field label={label("Fecha", "date")} error={errors.date} required>
              <input type="date" className={fieldClass} value={form.text.date} onChange={(event) => setText("date")(event.target.value)} data-error={errors.date ? "true" : undefined} />
            </Field>
            <Field label="Turno" required group>
              <div className="grid grid-cols-2 gap-2">
                {(["DAY", "NIGHT"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setShift(value)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                      form.shift === value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                        : "border-[var(--color-border-soft)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    {F.turnos[value]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={label("No.", "reportNumber")}>{textInput("reportNumber", { mono: true })}</Field>
          </div>
        </Sheet>

        {/* Profundidades */}
        <Sheet>
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={label(`Profundidad anterior (${F.unidad})`, "fromDepth")} error={errors.fromDepth} required>
                {textInput("fromDepth", { mono: true, numeric: true })}
              </Field>
              <Field label={`Profundidad actual (${F.unidad})`} error={errors.toDepth} required>
                {textInput("toDepth", { mono: true, numeric: true, placeholder: "Ej. 138.20" })}
              </Field>
              <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-container-high)] px-4 py-2.5 sm:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Avance del turno</span>
                <span className={`font-mono text-2xl font-extrabold tabular-nums ${advance !== null && advance > 0 ? "text-[var(--color-primary)]" : "text-[var(--color-on-surface-variant)]"}`}>
                  {advance !== null && advance > 0 ? advance.toFixed(2) : "—"} {F.unidad}
                </span>
              </div>
              <Field label={`Recuperación de core (${F.unidad})`} error={errors.coreRecovery}>
                {textInput("coreRecovery", { mono: true, numeric: true })}
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Retorno de agua">{textInput("waterReturn", { placeholder: "Ej. 100%" })}</Field>
              <Field label="Roca atravesada">{textInput("rockType", { placeholder: "Ej. Andesita" })}</Field>
              <Field label={label("Máquina de perforación", "rigName")}>{textInput("rigName", { placeholder: "Ej. LF-90 #2" })}</Field>
              <Field label="Nº caja de core">{textInput("coreBoxNumber", { placeholder: "Ej. 31 - 34" })}</Field>
            </div>
          </div>
          {advance !== null && advance > 0 && (toNumberOrNull(form.text.coreRecovery) ?? 0) > advance + 0.001 ? (
            <p className="mx-4 mb-4 flex items-center gap-2 text-xs text-amber-600">
              <Info size={14} />
              La recuperación de core es mayor que el avance del turno.
            </p>
          ) : null}
        </Sheet>

        {/* Perforación y diámetro */}
        <Sheet>
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Perforación {auto.has("drillingMethod") ? <AutoTag /> : null}
                </p>
                {/* Solo se muestra DIAMANTINA; REVERSE_AIR queda en el modelo para pozos RC ya guardados. */}
                <Choice
                  active={form.drillingMethod === "DIAMOND"}
                  onClick={() => {
                    setForm((current) => ({ ...current, drillingMethod: current.drillingMethod === "DIAMOND" ? "" : "DIAMOND" }));
                    setAuto((current) => { const next = new Set(current); next.delete("drillingMethod"); return next; });
                  }}
                >
                  {F.perforacion["DIAMOND"]}
                </Choice>
              </div>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Diámetro de la perforación {auto.has("diameter") ? <AutoTag /> : null}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {F.diametros.map((diameter) => (
                    <Choice key={diameter} active={form.text.diameter === diameter} onClick={() => setText("diameter")(form.text.diameter === diameter ? "" : diameter)}>
                      {diameter}
                    </Choice>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={label("RC", "rcDiameter")}>{textInput("rcDiameter", { placeholder: "Ej. 4½\"" })}</Field>
                <Field label={label("Casing", "casing")}>{textInput("casing", { placeholder: "Ej. HW 6 m" })}</Field>
              </div>
            </div>
            <div className="grid content-start gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <Field label={label("Corona Nro.", "crownNumber")}>{textInput("crownNumber", { placeholder: "Ej. C-4471" })}</Field>
              <Field label={label("Escareador Nro.", "reamerNumber")}>{textInput("reamerNumber", { placeholder: "Ej. R-102" })}</Field>
              <Field label={label("Zapata Nro.", "shoeNumber")}>{textInput("shoeNumber", { placeholder: "Ej. Z-203" })}</Field>
            </div>
          </div>
        </Sheet>

        {/* Datalists para autocomplete de personal — filtrados por turno activo */}
        {PERSONNEL_TEXT_KEYS.map((field) => {
          const role = (Object.keys(ROLE_TO_FIELD) as PersonnelRole[]).find((r) => ROLE_TO_FIELD[r] === field);
          if (!role) return null;
          const names = personnel
            .filter((p) => p.active && p.role === role && (p.shift === form.shift || p.shift === "BOTH"))
            .map((p) => p.name);
          if (!names.length) return null;
          return (
            <datalist key={`${field}-${form.shift}`} id={`dl-${field}`}>
              {names.map((name) => <option key={name} value={name} />)}
            </datalist>
          );
        })}

        {/* Personal */}
        <Sheet>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={label("Perforista", "operator")}>
              <input className={fieldClass} list="dl-operator" placeholder="Nombre del perforista" value={form.text.operator} onChange={(e) => setText("operator")(e.target.value)} />
            </Field>
            <Field label={label("Ayte. primera", "firstHelper")}>
              <input className={fieldClass} list="dl-firstHelper" placeholder="Nombre del ayudante" value={form.text.firstHelper} onChange={(e) => setText("firstHelper")(e.target.value)} />
            </Field>
            <Field label={label("Ayte. segunda", "secondHelper")}>
              <input className={fieldClass} list="dl-secondHelper" placeholder="Nombre del ayudante" value={form.text.secondHelper} onChange={(e) => setText("secondHelper")(e.target.value)} />
            </Field>
            <Field label={label("Chofer", "driver")}>
              <input className={fieldClass} list="dl-driver" placeholder="Nombre del chofer" value={form.text.driver} onChange={(e) => setText("driver")(e.target.value)} />
            </Field>
          </div>
        </Sheet>

        {/* Tiempo / Profundidad / Descripción / Litología */}
        <Sheet>
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-soft)] px-4 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Actividades del turno</p>
            <button type="button" className={`${secondaryButton} px-3 py-1.5 text-xs`} onClick={addActivity}>
              <Plus size={14} />
              Agregar fila
            </button>
          </div>
          <div className="hidden grid-cols-[86px_86px_96px_96px_1fr_0.6fr_36px] gap-2 px-4 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)] md:grid">
            <span>Desde (hr)</span>
            <span>Hasta (hr)</span>
            <span>De ({F.unidad})</span>
            <span>A ({F.unidad})</span>
            <span>Descripción</span>
            <span>Litología</span>
            <span />
          </div>
          <div className="space-y-3 p-4 md:space-y-2">
            {form.activities.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-4 gap-2 rounded-xl border border-[var(--color-border-soft)] p-2 md:grid-cols-[86px_86px_96px_96px_1fr_0.6fr_36px] md:border-0 md:p-0"
              >
                {(["from", "to"] as const).map((key) => (
                  <input
                    key={key}
                    type="time"
                    className={`${fieldClass} px-2 font-mono text-xs tabular-nums ${errors[`act.${index}.${key}`] ? "border-rose-500" : ""}`}
                    value={row[key]}
                    title={errors[`act.${index}.${key}`]}
                    data-error={errors[`act.${index}.${key}`] ? "true" : undefined}
                    onChange={(event) => updateActivity(index, key, event.target.value)}
                  />
                ))}
                {(["depthFrom", "depthTo"] as const).map((key) => (
                  <input
                    key={key}
                    className={`${fieldClass} px-2 font-mono text-xs tabular-nums ${errors[`act.${index}.${key}`] ? "border-rose-500" : ""}`}
                    inputMode="decimal"
                    value={row[key]}
                    placeholder={key === "depthFrom" ? "De" : "A"}
                    title={errors[`act.${index}.${key}`]}
                    data-error={errors[`act.${index}.${key}`] ? "true" : undefined}
                    onChange={(event) => updateActivity(index, key, event.target.value)}
                  />
                ))}
                <input
                  className={`${fieldClass} col-span-4 px-2 text-xs md:col-span-1`}
                  value={row.description}
                  placeholder="Descripción"
                  onChange={(event) => updateActivity(index, "description", event.target.value)}
                />
                <input
                  className={`${fieldClass} col-span-3 px-2 text-xs md:col-span-1`}
                  value={row.lithology}
                  placeholder="Litología"
                  onChange={(event) => updateActivity(index, "lithology", event.target.value)}
                />
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] hover:text-rose-600"
                  title="Quitar fila"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      activities: current.activities.length > 1 ? current.activities.filter((_, rowIndex) => rowIndex !== index) : [emptyActivity()]
                    }))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </Sheet>

        {/* Combustible / Aditivos / Detalle */}
        <Sheet>
          <div className="grid gap-5 p-4 lg:grid-cols-3">
            <QuantityGroup
              title="Combustible"
              unit="Litros"
              items={F.combustibles}
              values={form.fuel}
              errors={errors}
              errorPrefix="fuel"
              onChange={(key, value) => setForm((current) => ({ ...current, fuel: { ...current.fuel, [key]: value } }))}
            >
              <Field label={F.combustibleOtros}>{textInput("fuelOther")}</Field>
            </QuantityGroup>
            <QuantityGroup
              title="Aditivos"
              unit="Kg"
              items={F.aditivos}
              values={form.additives}
              errors={errors}
              errorPrefix="additives"
              onChange={(key, value) => setForm((current) => ({ ...current, additives: { ...current.additives, [key]: value } }))}
            />
            <QuantityGroup
              title="Detalle"
              unit="Hrs"
              items={F.horas}
              values={form.hours}
              errors={errors}
              errorPrefix="hours"
              onChange={(key, value) => setForm((current) => ({ ...current, hours: { ...current.hours, [key]: value } }))}
            />
          </div>
        </Sheet>

        {/* Observaciones y firmas */}
        <Sheet>
          <div className="space-y-3 p-4">
            <Field label="Observaciones">
              <textarea
                className={`${fieldClass} min-h-[96px] resize-y`}
                placeholder="Ej. Inicio del pozo sin novedad. Buen retorno de agua."
                value={form.text.observations}
                onChange={(event) => setText("observations")(event.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={label(F.firmas[0], "supervisor")}>
                <input className={fieldClass} list="dl-supervisor" placeholder="Nombre del supervisor" value={form.text.supervisor} onChange={(e) => setText("supervisor")(e.target.value)} />
              </Field>
              <Field label={label(F.firmas[1], "drillingChief")}>
                <input className={fieldClass} list="dl-drillingChief" placeholder="Nombre del jefe" value={form.text.drillingChief} onChange={(e) => setText("drillingChief")(e.target.value)} />
              </Field>
              <ReadOnly label={F.firmas[2]} value={form.text.operator || "— (el perforista)"} />
            </div>
          </div>
        </Sheet>

        {/* Incidencias (solo sistema) */}
        <Sheet>
          <div className="border-b border-[var(--color-border-soft)] px-4 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Incidencias <span className="font-medium normal-case tracking-normal">(se revisan en el sistema; no salen en la hoja impresa)</span>
            </p>
          </div>
          <div className="space-y-3 p-4">
            {form.incidents.map((incident) => (
              <div key={incident.id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--color-border-soft)] p-3 text-sm">
                <div>
                  <p className="font-semibold">
                    {incident.category} · <SeverityText severity={incident.severity} />
                    {incident.status === "RESOLVED" ? <span className="ml-2 text-xs font-bold text-emerald-600">Resuelta</span> : null}
                  </p>
                  <p className="mt-0.5 text-[var(--color-on-surface-variant)]">{incident.description}</p>
                </div>
                <button
                  type="button"
                  className="text-[var(--color-on-surface-variant)] hover:text-rose-600"
                  title="Quitar incidencia"
                  onClick={() => setForm((current) => ({ ...current, incidents: current.incidents.filter((item) => item.id !== incident.id) }))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select className={fieldClass} value={newIncident.category} onChange={(event) => setNewIncident((current) => ({ ...current, category: event.target.value }))}>
                {F.incidencias.categorias.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-1.5">
                {(["LOW", "MEDIUM", "HIGH"] as const).map((severity) => (
                  <Choice key={severity} active={newIncident.severity === severity} onClick={() => setNewIncident((current) => ({ ...current, severity }))}>
                    {F.incidencias.severidades[severity]}
                  </Choice>
                ))}
              </div>
              <input
                className={`${fieldClass} sm:col-span-1`}
                value={newIncident.description}
                placeholder="Describe la incidencia (p. ej. pérdida de circulación a 133 m)"
                onChange={(event) => setNewIncident((current) => ({ ...current, description: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addIncident();
                  }
                }}
              />
              <button type="button" className={secondaryButton} onClick={addIncident} disabled={!newIncident.description.trim()}>
                <Plus size={15} />
                Agregar incidencia
              </button>
            </div>
          </div>
        </Sheet>
      </form>
    </Modal>
  );
}

function Sheet({ children }: { children: ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">{children}</section>;
}

function AutoTag() {
  return (
    <span className="rounded-md bg-[var(--color-primary)] px-1.5 py-px text-[9px] font-bold normal-case tracking-normal text-[var(--color-on-primary)]">
      auto
    </span>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
        {label} <AutoTag />
      </span>
      <div className="truncate rounded-xl border border-dashed border-[var(--color-border-soft)] px-3 py-2.5 text-sm font-semibold" title={value}>
        {value || "—"}
      </div>
    </div>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
          : "border-[var(--color-border-soft)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

function QuantityGroup({
  title,
  unit,
  items,
  values,
  errors,
  errorPrefix,
  onChange,
  children
}: {
  title: string;
  unit: string;
  items: ReadonlyArray<{ key: string; label: string }>;
  values: Record<string, string>;
  errors: Record<string, string>;
  errorPrefix: string;
  onChange: (key: string, value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
        {title} <span className="font-medium normal-case">({unit})</span>
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item.key} className="grid grid-cols-[1fr_96px] items-center gap-2 text-sm">
            <span>{item.label}</span>
            <input
              className={`${fieldClass} px-2 py-2 text-right font-mono tabular-nums ${errors[`${errorPrefix}.${item.key}`] ? "border-rose-500" : ""}`}
              inputMode="decimal"
              value={values[item.key] ?? ""}
              title={errors[`${errorPrefix}.${item.key}`]}
              data-error={errors[`${errorPrefix}.${item.key}`] ? "true" : undefined}
              onChange={(event) => onChange(item.key, event.target.value)}
            />
          </label>
        ))}
        {children}
      </div>
    </div>
  );
}

function SeverityText({ severity }: { severity: ShiftIncident["severity"] }) {
  const tone = severity === "HIGH" ? "text-rose-600" : severity === "MEDIUM" ? "text-amber-600" : "text-sky-600";
  return <span className={`font-bold ${tone}`}>{F.incidencias.severidades[severity]}</span>;
}
