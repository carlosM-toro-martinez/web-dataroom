export const pedidosEndpoints = {
  base: "/api/pedidos",
  byId: (id: string) => `/api/pedidos/${id}`,
  cancelar: (id: string) => `/api/pedidos/${id}/cancelar`
} as const;
