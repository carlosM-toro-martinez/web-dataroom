export const categoriasInventarioEndpoints = {
  base: "/api/categorias-inventario",
  tree: "/api/categorias-inventario/tree",
  byId: (id: number | string) => `/api/categorias-inventario/${id}`
} as const;
