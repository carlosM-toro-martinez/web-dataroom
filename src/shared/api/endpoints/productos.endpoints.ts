export const productosEndpoints = {
  base: "/api/productos",
  byId: (id: number | string) => `/api/productos/${id}`
} as const;
