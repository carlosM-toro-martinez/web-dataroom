// Nombres en español para mostrar la bitácora (las tablas y campos reales vienen en inglés/camelCase).

type TableInfo = { module: string; label: string };

const EXACT: Record<string, TableInfo> = {
  User: { module: "Usuarios y roles", label: "Usuario" },
  Role: { module: "Usuarios y roles", label: "Rol y permisos" },
  DataRoomAccessRequest: { module: "Solicitudes Data Room", label: "Solicitud de acceso" },
  Project: { module: "Data Room", label: "Proyecto" },
  Zone: { module: "Data Room", label: "Zona" },
  DrillHole: { module: "Data Room", label: "Sondaje" },
  DrillHoleSurvey: { module: "Data Room", label: "Survey del sondaje" },
  Interval: { module: "Data Room", label: "Intervalo" },
  Assay: { module: "Data Room", label: "Ensayo" },
  AssayValue: { module: "Data Room", label: "Valor de ensayo" },
  QAQC: { module: "Data Room", label: "QAQC" },
  Lithology: { module: "Data Room", label: "Litología" },
  Alteration: { module: "Data Room", label: "Alteración" },
  Mineralization: { module: "Data Room", label: "Mineralización" },
  GeologicalStructure: { module: "Data Room", label: "Estructura geológica" },
  Recovery: { module: "Data Room", label: "Recuperación" },
  Density: { module: "Data Room", label: "Densidad" },
  MagneticSusceptibility: { module: "Data Room", label: "Susceptibilidad magnética" },
  Resource: { module: "Data Room", label: "Archivo / recurso" },
  SignificantIntercept: { module: "Data Room", label: "Intercepto significativo" },
  DrillingContractor: { module: "Sondajes", label: "Contratista" },
  DrillingRig: { module: "Sondajes", label: "Equipo de perforación" },
  DrillingCampaign: { module: "Sondajes", label: "Programa de perforación" },
  DrillingHole: { module: "Sondajes", label: "Pozo" },
  DrillingShiftReport: { module: "Sondajes", label: "Parte diario de perforación" },
  DrillingSurvey: { module: "Sondajes", label: "Medición de desviación" },
  DrillingRun: { module: "Sondajes", label: "Corrida" },
  DrillingCoreBox: { module: "Sondajes", label: "Caja de testigo" },
  DrillingGeologyReport: { module: "Sondajes", label: "Reporte geológico" },
  DrillingPhoto: { module: "Sondajes", label: "Fotografía de testigo" },
  DrillingPhotoCounter: { module: "Sondajes", label: "Contador de fotos" },
  DrillingLogInterval: { module: "Sondajes", label: "Tramo de logueo" },
  DrillingPersonnel: { module: "Sondajes", label: "Personal de perforación" },
  DrillingLaboratory: { module: "Sondajes", label: "Laboratorio" },
  DrillingSample: { module: "Sondajes", label: "Muestra de sondaje" },
  DrillingSampleDispatch: { module: "Sondajes", label: "Lote de muestras" },
  DrillingDispatchItem: { module: "Sondajes", label: "Muestra del lote" },
  DrillingDispatchElement: { module: "Sondajes", label: "Elemento del lote" },
  DrillingSampleResult: { module: "Sondajes", label: "Resultado de laboratorio" },
  Sample: { module: "Exploración · Mina", label: "Muestra" },
  Laboratory: { module: "Exploración · Mina", label: "Laboratorio" },
  Element: { module: "Exploración", label: "Elemento químico" },
  auth: { module: "Seguridad", label: "Ingreso al sistema" },
  permisos: { module: "Seguridad", label: "Permisos" },
  auditoria: { module: "Seguridad", label: "Bitácora de auditoría" },
  audit_log: { module: "Seguridad", label: "Bitácora de auditoría" }
};

const humanize = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");

export function tableInfo(table: string): TableInfo {
  if (EXACT[table]) return EXACT[table];
  if (table.startsWith("Interior")) return { module: "Exploración · Interior mina", label: humanize(table.replace(/^Interior/, "")) };
  if (table.startsWith("Surface")) return { module: "Exploración · Superficie", label: humanize(table.replace(/^Surface/, "")) };
  if (table.startsWith("Mining")) return { module: "Exploración · Mina", label: humanize(table.replace(/^Mining/, "")) };
  if (table.startsWith("Drilling")) return { module: "Sondajes", label: humanize(table.replace(/^Drilling/, "")) };
  return { module: "Otros", label: humanize(table) };
}

export const ACTIONS: Record<string, { label: string; tone: "green" | "amber" | "red" | "sky" | "slate" | "violet" }> = {
  INSERT: { label: "Creó", tone: "green" },
  UPDATE: { label: "Modificó", tone: "amber" },
  DELETE: { label: "Eliminó", tone: "red" },
  TRUNCATE: { label: "Vació la tabla", tone: "red" },
  LOGIN: { label: "Ingresó", tone: "sky" },
  LOGIN_FAILED: { label: "Ingreso fallido", tone: "red" },
  LOGOUT: { label: "Cerró sesión", tone: "slate" },
  ACCESS_DENIED: { label: "Acceso denegado", tone: "red" },
  PASSWORD_RESET_REQUESTED: { label: "Pidió recuperar clave", tone: "violet" },
  PASSWORD_RESET_COMPLETED: { label: "Restableció su clave", tone: "violet" },
  PASSWORD_RESET_FAILED: { label: "Recuperación de clave fallida", tone: "red" },
  PASSWORD_CHANGED: { label: "Cambió su clave", tone: "violet" },
  PASSWORD_CHANGE_FAILED: { label: "Cambio de clave fallido", tone: "red" },
  AUDIT_ENABLED: { label: "Auditoría activada", tone: "slate" },
  AUDIT_EXPORT: { label: "Exportó la bitácora", tone: "violet" }
};

export const actionInfo = (action: string) => ACTIONS[action] ?? { label: action, tone: "slate" as const };

export const TONE_CLASS: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  red: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  sky: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  slate: "bg-slate-500/15 text-slate-600 dark:text-slate-300"
};

export const SOURCE_LABEL: Record<string, string> = {
  api: "Aplicación",
  system: "Sistema (tarea interna)",
  database: "Directo en la base de datos"
};

const FIELDS: Record<string, string> = {
  id: "Identificador",
  code: "Código",
  name: "Nombre",
  nombre: "Nombre",
  email: "Email",
  role: "Rol",
  activo: "Activo",
  active: "Activo",
  status: "Estado",
  date: "Fecha",
  shift: "Turno",
  fromDepth: "Desde (m)",
  toDepth: "Hasta (m)",
  depth: "Profundidad",
  metersDrilled: "Metros perforados",
  drillingHours: "Horas perforando",
  standbyHours: "Horas en espera",
  operator: "Perforista",
  firstHelper: "Ayudante 1°",
  secondHelper: "Ayudante 2°",
  driver: "Chofer",
  supervisor: "Supervisor",
  drillingChief: "Jefe de perforación",
  observations: "Observaciones",
  reportNumber: "N° de parte",
  reviewStatus: "Revisión",
  reviewedBy: "Revisado por",
  reviewedAt: "Fecha de revisión",
  reviewNotes: "Notas de revisión",
  description: "Descripción",
  permissions: "Permisos",
  password: "Contraseña",
  refreshToken: "Token de sesión",
  resetToken: "Token de recuperación",
  resetTokenExpiry: "Vencimiento del token",
  createdAt: "Creado el",
  updatedAt: "Modificado el",
  createdById: "Creado por (id)",
  updatedById: "Modificado por (id)",
  holeId: "Pozo (id)",
  campaignId: "Programa (id)",
  plannedDepth: "Profundidad programada",
  plannedEast: "Este programado",
  plannedNorth: "Norte programado",
  plannedElevation: "Cota programada",
  plannedAzimuth: "Azimut programado",
  plannedDip: "Inclinación programada",
  lithology: "Litología",
  geologySummary: "Resumen geológico",
  operationalNotes: "Observaciones operativas",
  geologists: "Geólogos",
  fileName: "Archivo",
  kind: "Tipo",
  contentHash: "Huella de la imagen",
  area: "Área",
  notes: "Notas",
  sector: "Sector",
  target: "Objetivo",
  type: "Tipo"
};

export const fieldLabel = (key: string) => FIELDS[key] ?? humanize(key);

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (value === "[REDACTADO]") return "••••• (oculto por seguridad)";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (ISO.test(value)) {
      const date = new Date(value);
      const dateOnly = value.endsWith("T00:00:00.000Z");
      return dateOnly ? date.toLocaleDateString("es-BO", { timeZone: "UTC" }) : date.toLocaleString("es-BO");
    }
    return value;
  }
  const text = JSON.stringify(value);
  return text.length > 400 ? `${text.slice(0, 400)}…` : text;
}

export const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
