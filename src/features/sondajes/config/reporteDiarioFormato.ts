// ─────────────────────────────────────────────────────────────────────────────
//  FORMATO DEL PARTE DIARIO ("Reporte diario de perforación diamantina")
//
//  Este es el ÚNICO archivo que hay que editar para cambiar nombres y textos del
//  parte diario: encabezado de la empresa, títulos, etiquetas de los campos,
//  ítems de combustible / aditivos / horas, firmas y categorías de incidencias.
//  Lo que se cambie aquí se refleja en el formulario y en el PDF impreso.
//
//  Ojo: las "key" (diesel, bentonite, casing...) son los nombres internos con los
//  que se guardan los datos; NO cambiarlas. Sí se puede cambiar el texto "label".
// ─────────────────────────────────────────────────────────────────────────────

import type { DrillingCampaign } from "@/features/sondajes/model/sondajes.schema";

export const REPORTE_DIARIO = {
  // Encabezado de la hoja.
  empresa: "SONDAJES MINEROS S.R.L.",
  serviciosTitulo: "BRINDAMOS SERVICIOS DE:",
  servicios: ["PERFORACIÓN A DIAMANTINA, PERFORACIÓN DE POZOS DE AGUA", "ESTUDIOS DE GEOTERMIA Y GEOTÉCNICA"],
  titulo: "REPORTE DIARIO DE PERFORACIÓN DIAMANTINA",
  pie: "AV. JULIO CESAR VALDEZ Nro. 4574 · CORREO: sondamin_s_r_l_@outlook.com · Web: www.sondamin.com · Movil: 591-70121303",

  // Qué se muestra en "PROYECTO" (se llena solo a partir del programa del pozo).
  proyecto: (campaign?: DrillingCampaign) => campaign?.area || campaign?.name || "",

  // Turnos: en el sistema se guardan como DAY / NIGHT; en la hoja se ven como A / B.
  turnos: { DAY: "A", NIGHT: "B" } as const,

  // Unidad de las profundidades.
  unidad: "ml.",

  perforacion: {
    DIAMOND: "DIAMANTINA",
    REVERSE_AIR: "AIRE REVERSA"
  } as const,

  diametros: ["PQ-WL", "NQ-WL", "HQ-WL", "BQ-WL"] as const,

  // Combustible (litros).
  combustibles: [
    { key: "diesel", label: "Diesel" },
    { key: "gasoline", label: "Gasolina" },
    { key: "hydraulicOil", label: "Aceite Hidráulico" },
    { key: "engineOil", label: "Aceite Motor" },
    { key: "gearOil", label: "Aceite Engranaje" }
  ] as const,
  combustibleOtros: "Otros",

  // Aditivos (kg).
  aditivos: [
    { key: "bentonite", label: "Bentonita" },
    { key: "polymerPac", label: "Polimeros Pac" },
    { key: "polymerPhpa", label: "Polimeros PHPA" },
    { key: "surfactants", label: "Surfactantes" },
    { key: "lubricants", label: "Lubricantes" },
    { key: "cement", label: "Cemento" }
  ] as const,

  // Detalle de horas. "drilling" y "standby" son las horas de perforación y de espera del turno.
  horas: [
    { key: "drilling", label: "Hrs. de perf." },
    { key: "casing", label: "Hrs. Encamisado" },
    { key: "maintenance", label: "Hrs. de mantto" },
    { key: "standby", label: "Hrs. De Stand by" },
    { key: "transfer", label: "Hrs. Traslado" },
    { key: "unloading", label: "Hrs. Descargue" }
  ] as const,

  // Filas de la tabla "Tiempo / Profundidad / Descripción / Litología" en la hoja impresa.
  filasActividades: 14,

  // Firmas al pie de la hoja.
  firmas: ["SUPERVISOR", "JEFE DE PERFORACIÓN", "PERFORISTA"] as const,

  // Incidencias (no salen en la hoja impresa; se revisan en el sistema).
  incidencias: {
    categorias: [
      "Falla mecánica",
      "Pérdida de circulación",
      "Derrumbe / cavidad",
      "Atasco de herramienta",
      "Falta de agua",
      "Falta de combustible o insumos",
      "Seguridad",
      "Clima",
      "Otra"
    ],
    severidades: { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta" } as const
  }
} as const;

export type ConsumableKey = (typeof REPORTE_DIARIO.combustibles)[number]["key"];
export type AdditiveKey = (typeof REPORTE_DIARIO.aditivos)[number]["key"];
export type HourKey = (typeof REPORTE_DIARIO.horas)[number]["key"];
