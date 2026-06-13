export const queryKeys = {
  systemStatus: {
    all: ["system-status"] as const,
    detail: () => [...queryKeys.systemStatus.all, "detail"] as const
  },
  kardexValorado: {
    all: ["kardex-valorado"] as const,
    detail: () => [...queryKeys.kardexValorado.all, "detail"] as const
  },
  categoriasInventario: {
    all: ["categorias-inventario"] as const,
    tree: () => [...queryKeys.categoriasInventario.all, "tree"] as const
  },
  productos: {
    all: ["productos"] as const,
    list: (params: {
      page: number;
      limit: number;
      search?: string;
      grupoId?: number;
      subgrupoId?: number;
      cuentaId?: number;
      sinCuenta?: boolean;
    }) => [...queryKeys.productos.all, "list", params] as const
  },
  exploraciones: {
    all: ["exploraciones"] as const,
    offline: () => [...queryKeys.exploraciones.all, "offline"] as const,
    elementosOffline: () => [...queryKeys.exploraciones.all, "elementos-offline"] as const,
    remotas: () => [...queryKeys.exploraciones.all, "remotas"] as const,
    elementos: () => [...queryKeys.exploraciones.all, "elementos"] as const,
    laboratorios: () => [...queryKeys.exploraciones.all, "laboratorios"] as const,
    hierarchy: (params: { search?: string; page?: number; limit?: number }) =>
      [...queryKeys.exploraciones.all, "hierarchy", params] as const
  },
  auth: {
    all: ["auth"] as const,
    users: () => [...queryKeys.auth.all, "users"] as const
  },
  contabilidad: {
    all: ["contabilidad"] as const,
    centrosCosto: () => [...queryKeys.contabilidad.all, "centros-costo"] as const,
    funcionesGasto: () => [...queryKeys.contabilidad.all, "funciones-gasto"] as const,
    sectores: () => [...queryKeys.contabilidad.all, "sectores"] as const,
    cuentas: () => [...queryKeys.contabilidad.all, "cuentas"] as const
  },
  vales: {
    all: ["vales"] as const,
    list: (params?: { estado?: string; solicitanteId?: number; page?: number; limit?: number }) =>
      [...queryKeys.vales.all, "list", params ?? {}] as const,
    detail: (id: string) => [...queryKeys.vales.all, "detail", id] as const,
    historialSolicitante: (userId: number, page: number, limit: number) =>
      [...queryKeys.vales.all, "historial-solicitante", userId, page, limit] as const
  },
  compras: {
    all: ["compras"] as const,
    list: (params: { estado?: string; proveedorId?: number; page: number; limit: number }) =>
      [...queryKeys.compras.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.compras.all, "detail", id] as const
  },
  proveedores: {
    all: ["proveedores"] as const,
    list: (params: { page: number; limit: number; search?: string }) =>
      [...queryKeys.proveedores.all, "list", params] as const
  },
  reportes: {
    all: ["reportes"] as const,
    binCard: (
      params: {
        page: number;
        limit: number;
        productoId?: number;
        fechaInicio?: string;
        fechaFin?: string;
        fecha?: string;
      },
      fetchAll: boolean
    ) => [...queryKeys.reportes.all, "bin-card", params, fetchAll] as const,
    binCardValorado: (
      params: {
        page: number;
        limit: number;
        productoId?: number;
        fechaInicio?: string;
        fechaFin?: string;
        fecha?: string;
      },
      fetchAll: boolean
    ) => [...queryKeys.reportes.all, "bin-card-valorado", params, fetchAll] as const,
    stock: (params: { page: number; limit: number; categoriaId?: number }, fetchAll: boolean) =>
      [...queryKeys.reportes.all, "stock", params, fetchAll] as const,
    vales: (
      params: {
        page: number;
        limit: number;
        estado?: string;
        solicitanteId?: number;
        fechaInicio?: string;
        fechaFin?: string;
      },
      fetchAll: boolean
    ) => [...queryKeys.reportes.all, "vales", params, fetchAll] as const,
    compras: (
      params: {
        page: number;
        limit: number;
        estado?: string;
        proveedorId?: number;
        fechaInicio?: string;
        fechaFin?: string;
      },
      fetchAll: boolean
    ) => [...queryKeys.reportes.all, "compras", params, fetchAll] as const
  },
  pedidos: {
    all: ["pedidos"] as const,
    list: (params: { estado?: string; proveedorId?: number; page: number; limit: number }) =>
      [...queryKeys.pedidos.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.pedidos.all, "detail", id] as const
  },
  movimientos: {
    all: ["movimientos"] as const
  },
  employees: {
    all: ["employees"] as const,
    list: () => [...queryKeys.employees.all, "list"] as const,
    syncQueue: () => [...queryKeys.employees.all, "sync-queue"] as const,
    cuentas: () => [...queryKeys.contabilidad.all, "cuentas"] as const
  }
};
