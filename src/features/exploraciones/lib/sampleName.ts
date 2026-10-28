// Sample names: new samples use the full area, level and labor names ("MOSA - SUPERFICIE - BANCO 6 - 1");
// samples saved before that keep the abbreviations ("MS-SUP-B6-1"). Mirrors api-exploracion
// src/modules/sampleCodes/sampleName.ts; keep both in sync.

export type NameNode = { name?: string | null; abbreviation?: string | null } | null | undefined;
export type SampleNameStyle = "full" | "legacy";

export function normalizeNameToken(value?: string | null) {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[ÁÀÂÄ]/g, "A")
    .replace(/[ÉÈÊË]/g, "E")
    .replace(/[ÍÌÎÏ]/g, "I")
    .replace(/[ÓÒÔÖ]/g, "O")
    .replace(/[ÚÙÛÜ]/g, "U")
    .replace(/[/\s]+/g, "-")
    .replace(/[^A-ZÑ0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Display form of a catalog name: upper case, no accents (the Ñ stays), no "(abbreviation)" tail, single spaces.
function fullNamePart(node: NameNode) {
  const base = (node?.name ?? "").replace(/\s*\([^)]*\)/g, "") || node?.abbreviation || "";
  return base
    .trim()
    .toUpperCase()
    .replace(/[ÁÀÂÄ]/g, "A")
    .replace(/[ÉÈÊË]/g, "E")
    .replace(/[ÍÌÎÏ]/g, "I")
    .replace(/[ÓÒÔÖ]/g, "O")
    .replace(/[ÚÙÛÜ]/g, "U")
    .replace(/[/]+/g, " ")
    .replace(/[^A-ZÑ0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function legacyNamePrefix(area: NameNode, level: NameNode, labor: NameNode) {
  return [area, level, labor]
    .map((node) => normalizeNameToken(node?.abbreviation ?? node?.name))
    .filter(Boolean)
    .join("-");
}

export function fullNamePrefix(area: NameNode, level: NameNode, labor: NameNode) {
  return [area, level, labor].map(fullNamePart).filter(Boolean).join(" - ");
}

export function namePrefix(style: SampleNameStyle, area: NameNode, level: NameNode, labor: NameNode) {
  return style === "legacy" ? legacyNamePrefix(area, level, labor) : fullNamePrefix(area, level, labor);
}

export function composeSampleName(prefix: string, suffix: string, style: SampleNameStyle) {
  return [prefix, suffix].filter(Boolean).join(style === "legacy" ? "-" : " - ");
}

// Names saved before the change never contain spaces; the new ones always do. Unnamed samples take the new format.
export function detectNameStyle(name?: string | null): SampleNameStyle {
  const text = (name ?? "").trim();
  return !text || /\s/.test(text) ? "full" : "legacy";
}

export function extractEditableSuffix(fullName: string | null | undefined, prefix: string | undefined) {
  const normalizedName = normalizeNameToken(fullName);
  const normalizedPrefix = normalizeNameToken(prefix);
  if (!normalizedName) return "";
  if (!normalizedPrefix) return normalizedName;
  if (normalizedName === normalizedPrefix) return "";
  if (normalizedName.startsWith(`${normalizedPrefix}-`)) {
    return normalizedName.slice(normalizedPrefix.length + 1);
  }
  return normalizedName;
}
