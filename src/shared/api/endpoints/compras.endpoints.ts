export const comprasEndpoints = {
  base: "/api/compras",
  byId: (id: string) => `/api/compras/${id}`,
  recibir: (id: string) => `/api/compras/${id}/recibir`,
  anular: (id: string) => `/api/compras/${id}/anular`,
  anulacionesHistorial: "/api/compras/anulaciones/historial"
} as const;
