export const inventarioImportEndpoints = {
  catalogo: "/api/inventario-import/catalogo",
  stockInicial: "/api/inventario-import/stock-inicial",
  reiniciarStock: "/api/inventario-import/reiniciar-stock",
  recalcularStock: "/api/inventario-import/recalcular-stock",
  sincronizarStock: "/api/inventario-import/sincronizar-stock",
  cierreMes: "/api/inventario-import/cierre-mes",
  saldoMensual: "/api/inventario-import/saldo-mensual",
  saldoMensualInicializar: "/api/inventario-import/saldo-mensual/inicializar",
  saldoMensualPreview: "/api/inventario-import/saldo-mensual/preview",
  saldoMensualItem: "/api/inventario-import/saldo-mensual/item",
  saldoMensualById: (id: string | number) => `/api/inventario-import/saldo-mensual/${id}`
} as const;
