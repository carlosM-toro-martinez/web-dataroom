export const proveedoresEndpoints = {
  base: "/api/proveedores",
  byId: (id: number) => `/api/proveedores/${id}`
} as const;
