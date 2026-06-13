import { describe, expect, it } from "vitest";
import { pedidosEndpoints } from "./pedidos.endpoints";
import { reportesEndpoints } from "./reportes.endpoints";
import { valesEndpoints } from "./vales.endpoints";

describe("inventory endpoints", () => {
  it("exposes vales critical routes", () => {
    expect(valesEndpoints.rechazar("abc")).toBe("/api/vales/abc/rechazar");
    expect(valesEndpoints.historialSolicitante(5)).toBe("/api/vales/solicitante/5");
  });

  it("exposes pedidos routes", () => {
    expect(pedidosEndpoints.base).toBe("/api/pedidos");
    expect(pedidosEndpoints.cancelar("p-1")).toBe("/api/pedidos/p-1/cancelar");
  });

  it("exposes new reportes routes", () => {
    expect(reportesEndpoints.stock).toBe("/api/reportes/stock");
    expect(reportesEndpoints.vales).toBe("/api/reportes/vales");
    expect(reportesEndpoints.compras).toBe("/api/reportes/compras");
  });
});
