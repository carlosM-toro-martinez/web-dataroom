export const contabilidadEndpoints = {
  centrosCosto: "/api/centros-costo",
  funcionesGasto: "/api/funciones-gasto",
  cuentas: "/api/cuentas",
  sectores: "/api/contabilidad/sectores",
  sectorById: (id: number | string) => `/api/contabilidad/sectores/${id}`,
  salidas: "/api/movimientos/salidas"
} as const;
