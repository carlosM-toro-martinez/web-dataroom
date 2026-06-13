import * as XLSX from "xlsx";

type TemplateRow = Record<string, string | number | boolean | null | undefined>;

interface SheetTemplate {
  name: string;
  rows: TemplateRow[];
}

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(rows: TemplateRow[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];

  for (const row of rows) {
    const line = headers.map((header) => escapeCsvValue(row[header])).join(",");
    lines.push(line);
  }

  return lines.join("\n");
}

function triggerBlobDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsvTemplate(filename: string, rows: TemplateRow[]) {
  const csv = rowsToCsv(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  triggerBlobDownload(filename, blob);
}

export function downloadWorkbookTemplate(filename: string, sheets: SheetTemplate[]) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  XLSX.writeFile(workbook, filename);
}

export function downloadCategoriasCsvTemplate() {
  downloadCsvTemplate("plantilla-categorias-inventario.csv", [
    {
      tipo: "grupo",
      codigo: "HERR",
      nombre: "Herramientas",
      codigo_grupo_padre: ""
    },
    {
      tipo: "subgrupo",
      codigo: "EPP",
      nombre: "Equipo de proteccion personal",
      codigo_grupo_padre: "HERR"
    },
    {
      tipo: "subgrupo",
      codigo: "MAN",
      nombre: "Herramienta manual",
      codigo_grupo_padre: "HERR"
    }
  ]);
}

export function downloadCategoriasExcelTemplate() {
  downloadWorkbookTemplate("plantilla-categorias-inventario.xlsx", [
    {
      name: "categorias",
      rows: [
        {
          tipo: "grupo",
          codigo: "HERR",
          nombre: "Herramientas",
          codigo_grupo_padre: ""
        },
        {
          tipo: "subgrupo",
          codigo: "EPP",
          nombre: "Equipo de proteccion personal",
          codigo_grupo_padre: "HERR"
        },
        {
          tipo: "subgrupo",
          codigo: "MAN",
          nombre: "Herramienta manual",
          codigo_grupo_padre: "HERR"
        }
      ]
    }
  ]);
}

export function downloadProductosCsvTemplate() {
  downloadCsvTemplate("plantilla-productos-inventario.csv", [
    {
      codigo: "CAS001",
      nombre: "Casco de seguridad",
      unidad: "UND",
      codigo_grupo: "HERR",
      codigo_subgrupo: "EPP",
      codigo_centro_costo: "CC001",
      codigo_funcion_gasto: "FG001",
      es_epp: "SI"
    },
    {
      codigo: "MAR001",
      nombre: "Martillo de una libra",
      unidad: "UND",
      codigo_grupo: "HERR",
      codigo_subgrupo: "MAN",
      codigo_centro_costo: "CC001",
      codigo_funcion_gasto: "FG002",
      es_epp: "NO"
    }
  ]);
}

export function downloadProductosExcelTemplate() {
  downloadWorkbookTemplate("plantilla-productos-inventario.xlsx", [
    {
      name: "productos",
      rows: [
        {
          codigo: "CAS001",
          nombre: "Casco de seguridad",
          unidad: "UND",
          codigo_grupo: "HERR",
          codigo_subgrupo: "EPP",
          codigo_centro_costo: "CC001",
          codigo_funcion_gasto: "FG001",
          es_epp: "SI"
        },
        {
          codigo: "MAR001",
          nombre: "Martillo de una libra",
          unidad: "UND",
          codigo_grupo: "HERR",
          codigo_subgrupo: "MAN",
          codigo_centro_costo: "CC001",
          codigo_funcion_gasto: "FG002",
          es_epp: "NO"
        }
      ]
    }
  ]);
}

export function downloadContabilidadCsvTemplate() {
  downloadCsvTemplate("plantilla-contabilidad-cuentas.csv", [
    {
      codigo_centro_costo: "CC001",
      nombre_centro_costo: "Operaciones Mina",
      codigo_funcion_gasto: "FG001",
      nombre_funcion_gasto: "Mantenimiento",
      codigo_sector: "SEC001",
      nombre_sector: "Planta",
      codigo_cuenta_completo: "CC001-FG001"
    },
    {
      codigo_centro_costo: "CC002",
      nombre_centro_costo: "Logistica",
      codigo_funcion_gasto: "FG002",
      nombre_funcion_gasto: "Servicios generales",
      codigo_sector: "",
      nombre_sector: "",
      codigo_cuenta_completo: "CC002-FG002"
    }
  ]);
}

export function downloadContabilidadExcelTemplate() {
  downloadWorkbookTemplate("plantilla-contabilidad-inventario.xlsx", [
    {
      name: "centros_costo",
      rows: [
        { codigo: "CC001", nombre: "Operaciones Mina" },
        { codigo: "CC002", nombre: "Logistica" }
      ]
    },
    {
      name: "funciones_gasto",
      rows: [
        { codigo: "FG001", nombre: "Mantenimiento" },
        { codigo: "FG002", nombre: "Servicios generales" }
      ]
    },
    {
      name: "sectores",
      rows: [
        { codigo: "SEC001", nombre: "Planta" },
        { codigo: "SEC002", nombre: "Campamento" }
      ]
    },
    {
      name: "cuentas_contables",
      rows: [
        {
          codigo_centro_costo: "CC001",
          codigo_funcion_gasto: "FG001",
          codigo_sector: "SEC001",
          codigo_cuenta_completo: "CC001-FG001"
        },
        {
          codigo_centro_costo: "CC002",
          codigo_funcion_gasto: "FG002",
          codigo_sector: "",
          codigo_cuenta_completo: "CC002-FG002"
        }
      ]
    }
  ]);
}

export function downloadComprasCsvTemplate() {
  downloadCsvTemplate("plantilla-compras-masivas.csv", [
    {
      referencia_compra: "OC-2026-0001",
      proveedor_nit: "1234567011",
      proveedor_nombre: "Proveedor Minero SRL",
      observacion: "Pedido abril",
      producto_codigo: "CAS001",
      cantidad_pedida: 150,
      precio_unit: 42.5
    },
    {
      referencia_compra: "OC-2026-0001",
      proveedor_nit: "1234567011",
      proveedor_nombre: "Proveedor Minero SRL",
      observacion: "Pedido abril",
      producto_codigo: "MAR001",
      cantidad_pedida: 80,
      precio_unit: 65
    },
    {
      referencia_compra: "OC-2026-0002",
      proveedor_nit: "",
      proveedor_nombre: "Industrial Andes",
      observacion: "Reposicion semanal",
      producto_codigo: "GUA001",
      cantidad_pedida: 300,
      precio_unit: 7.25
    }
  ]);
}

export function downloadComprasExcelTemplate() {
  downloadWorkbookTemplate("plantilla-compras-masivas.xlsx", [
    {
      name: "compras",
      rows: [
        {
          referencia_compra: "OC-2026-0001",
          proveedor_nit: "1234567011",
          proveedor_nombre: "Proveedor Minero SRL",
          observacion: "Pedido abril",
          producto_codigo: "CAS001",
          cantidad_pedida: 150,
          precio_unit: 42.5
        },
        {
          referencia_compra: "OC-2026-0001",
          proveedor_nit: "1234567011",
          proveedor_nombre: "Proveedor Minero SRL",
          observacion: "Pedido abril",
          producto_codigo: "MAR001",
          cantidad_pedida: 80,
          precio_unit: 65
        },
        {
          referencia_compra: "OC-2026-0002",
          proveedor_nit: "",
          proveedor_nombre: "Industrial Andes",
          observacion: "Reposicion semanal",
          producto_codigo: "GUA001",
          cantidad_pedida: 300,
          precio_unit: 7.25
        }
      ]
    }
  ]);
}
