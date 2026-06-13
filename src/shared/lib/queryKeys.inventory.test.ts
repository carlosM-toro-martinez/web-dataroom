import { describe, expect, it } from "vitest";
import { queryKeys } from "./queryKeys";

describe("inventory query keys", () => {
  it("builds vales list key with params", () => {
    const key = queryKeys.vales.list({ estado: "PENDIENTE", solicitanteId: 5, page: 1, limit: 10 });
    expect(key[0]).toBe("vales");
    expect(key[1]).toBe("list");
  });

  it("builds historial solicitante key", () => {
    const key = queryKeys.vales.historialSolicitante(5, 1, 10);
    expect(key).toEqual(["vales", "historial-solicitante", 5, 1, 10]);
  });

  it("builds pedidos and reportes keys", () => {
    const pedidosKey = queryKeys.pedidos.list({ page: 1, limit: 10 });
    const reportKey = queryKeys.reportes.stock({ page: 1, limit: 50 }, false);
    expect(pedidosKey[0]).toBe("pedidos");
    expect(reportKey[0]).toBe("reportes");
  });
});
