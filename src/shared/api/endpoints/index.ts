import { systemStatusEndpoints } from "@/shared/api/endpoints/systemStatus.endpoints";
import { kardexValoradoEndpoints } from "@/shared/api/endpoints/kardexValorado.endpoints";
import { authEndpoints } from "@/shared/api/endpoints/auth.endpoints";
import { categoriasInventarioEndpoints } from "@/shared/api/endpoints/categoriasInventario.endpoints";
import { productosEndpoints } from "@/shared/api/endpoints/productos.endpoints";
import { contabilidadEndpoints } from "@/shared/api/endpoints/contabilidad.endpoints";
import { exploracionesEndpoints } from "@/shared/api/endpoints/exploraciones.endpoints";
import { valesEndpoints } from "@/shared/api/endpoints/vales.endpoints";
import { movimientosEndpoints } from "@/shared/api/endpoints/movimientos.endpoints";
import { comprasEndpoints } from "@/shared/api/endpoints/compras.endpoints";
import { proveedoresEndpoints } from "@/shared/api/endpoints/proveedores.endpoints";
import { reportesEndpoints } from "@/shared/api/endpoints/reportes.endpoints";
import { pedidosEndpoints } from "@/shared/api/endpoints/pedidos.endpoints";
import { inventarioImportEndpoints } from "@/shared/api/endpoints/inventarioImport.endpoints";

export const apiEndpoints = {
  auth: authEndpoints,
  systemStatus: systemStatusEndpoints,
  kardexValorado: kardexValoradoEndpoints,
  categoriasInventario: categoriasInventarioEndpoints,
  productos: productosEndpoints,
  exploraciones: exploracionesEndpoints,
  contabilidad: contabilidadEndpoints,
  vales: valesEndpoints,
  movimientos: movimientosEndpoints,
  compras: comprasEndpoints,
  proveedores: proveedoresEndpoints,
  reportes: reportesEndpoints,
  pedidos: pedidosEndpoints,
  inventarioImport: inventarioImportEndpoints
} as const;
