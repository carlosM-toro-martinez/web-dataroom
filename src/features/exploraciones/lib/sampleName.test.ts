import { describe, expect, it } from "vitest";
import {
  composeSampleName,
  detectNameStyle,
  extractEditableSuffix,
  fullNamePrefix,
  legacyNamePrefix,
  normalizeNameToken
} from "@/features/exploraciones/lib/sampleName";

const mosa = { name: "MOSA", abbreviation: "MS" };
const superficie = { name: "SUPERFICIE", abbreviation: "SUP" };
const banco6 = { name: "BANCO 6", abbreviation: "B6" };
const lipena = { name: "LIPEÑA", abbreviation: "LIP" };
const nivel30 = { name: "NIVEL 30 (NIV-30)", abbreviation: "NIV-30" };
const recorte1 = { name: "RECORTE 1", abbreviation: "RC1" };

describe("sample names", () => {
  it("builds the full-name format with spaces", () => {
    const prefix = fullNamePrefix(mosa, superficie, banco6);
    expect(prefix).toBe("MOSA - SUPERFICIE - BANCO 6");
    expect(composeSampleName(prefix, "1", "full")).toBe("MOSA - SUPERFICIE - BANCO 6 - 1");
  });

  it("keeps the Ñ and drops the abbreviation written inside a catalog name", () => {
    expect(fullNamePrefix(lipena, nivel30, recorte1)).toBe("LIPEÑA - NIVEL 30 - RECORTE 1");
    expect(normalizeNameToken("lipeña")).toBe("LIPEÑA");
  });

  it("keeps the legacy format with abbreviations and hyphens", () => {
    const prefix = legacyNamePrefix(mosa, superficie, banco6);
    expect(prefix).toBe("MS-SUP-B6");
    expect(composeSampleName(prefix, "1", "legacy")).toBe("MS-SUP-B6-1");
  });

  it("tells old names from new ones", () => {
    expect(detectNameStyle("MS-SUP-B6-1")).toBe("legacy");
    expect(detectNameStyle("MOSA - SUPERFICIE - BANCO 6 - 1")).toBe("full");
    expect(detectNameStyle(null)).toBe("full");
  });

  it("recovers the editable suffix in both formats", () => {
    expect(extractEditableSuffix("MOSA - SUPERFICIE - BANCO 6 - CONO-A", "MOSA - SUPERFICIE - BANCO 6")).toBe("CONO-A");
    expect(extractEditableSuffix("MS-SUP-B6-1", "MS-SUP-B6")).toBe("1");
    expect(extractEditableSuffix("MOSA - SUPERFICIE - BANCO 6", "MOSA - SUPERFICIE - BANCO 6")).toBe("");
  });
});
