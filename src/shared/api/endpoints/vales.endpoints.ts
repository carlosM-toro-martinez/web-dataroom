export const valesEndpoints = {
  base: "/api/vales",
  byId: (id: string) => `/api/vales/${id}`,
  aprobar: (id: string) => `/api/vales/${id}/aprobar`,
  anular: (id: string) => `/api/vales/${id}/anular`,
  rechazar: (id: string) => `/api/vales/${id}/rechazar`,
  entregar: (id: string) => `/api/vales/${id}/entregar`,
  anulaciones: "/api/vales/anulaciones",
  historialSolicitante: (userId: number | string) => `/api/vales/solicitante/${userId}`,
  resumenSolicitantes: "/api/vales/resumen-solicitantes",
  productosPorUsuario: (userId: number | string) => `/api/vales/usuario/${userId}/productos`
} as const;
