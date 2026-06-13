import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileSpreadsheet, FileUp, RefreshCw, Save, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import {
  useExploracionesElementosOfflineQuery,
  useExploracionesElementosQuery,
  useSaveElementosOfflineBatchMutation,
  useSyncExploracionesElementosMutation
} from "@/features/exploraciones/hooks/useExploraciones";
import { downloadTemplateXlsx, readExcelRows } from "@/features/exploraciones/lib/excel.utils";
import { exploracionElementoPayloadSchema } from "@/features/exploraciones/model/muestra.schema";

interface ElementRow {
  key: string;
  nombre: string;
  unidad?: string;
  estado: "Sincronizado" | "Pendiente local" | "Error de sincronizacion";
  origen: "local" | "remoto";
  detalle?: string;
}

const inputClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

export function ExploracionesElementosPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  const remoteQuery = useExploracionesElementosQuery();
  const offlineQuery = useExploracionesElementosOfflineQuery();
  const saveBatchMutation = useSaveElementosOfflineBatchMutation();
  const syncMutation = useSyncExploracionesElementosMutation();

  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("");
  const [search, setSearch] = useState("");

  const pendingLocal = useMemo(
    () => (offlineQuery.data ?? []).filter((item) => !item.synced),
    [offlineQuery.data]
  );

  const rows = useMemo<ElementRow[]>(() => {
    const remoteRows: ElementRow[] = (remoteQuery.data?.data ?? []).map((item) => ({
      key: `r-${item.id ?? item.nombre}`,
      nombre: item.nombre,
      unidad: item.unidad ?? undefined,
      estado: "Sincronizado",
      origen: "remoto"
    }));

    const localRows: ElementRow[] = pendingLocal.map((item) => ({
      key: `l-${item.id ?? item.localId}`,
      nombre: item.payload.nombre,
      unidad: item.payload.unidad,
      estado: item.syncError ? "Error de sincronizacion" : "Pendiente local",
      origen: "local",
      detalle: item.syncError
    }));

    return [...localRows, ...remoteRows];
  }, [pendingLocal, remoteQuery.data?.data]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.nombre.toLowerCase().includes(query) || (row.unidad ?? "").toLowerCase().includes(query)
    );
  }, [rows, search]);

  const attemptSync = useCallback(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (syncMutation.isPending || pendingLocal.length === 0) return;
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.failed > 0) {
          showError("Algunos elementos no pudieron sincronizarse.");
        }
      }
    });
  }, [pendingLocal.length, showError, syncMutation]);

  useEffect(() => {
    attemptSync();
  }, [attemptSync]);

  useEffect(() => {
    function handleOnline() {
      attemptSync();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [attemptSync]);

  function queueElements(payloads: Array<{ nombre: string; unidad?: string }>) {
    saveBatchMutation.mutate(payloads, {
      onSuccess: () => {
        showSuccess(`${payloads.length} elementos enviados a cola local.`);
        setNombre("");
        setUnidad("");
        attemptSync();
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "No se pudo encolar elementos.";
        showError(message);
      }
    });
  }

  function onQueueSingle() {
    try {
      const payload = exploracionElementoPayloadSchema.parse({
        nombre: nombre.trim(),
        unidad: unidad.trim() || undefined
      });
      queueElements([payload]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Revisa los datos del elemento.";
      showError(message);
    }
  }

  function downloadElementosTemplate() {
    downloadTemplateXlsx(
      "Elementos",
      [
        { nombre: "Oro", unidad: "ppm" },
        { nombre: "Cobre", unidad: "ppm" }
      ],
      "plantilla-elementos-exploraciones.xlsx"
    );
  }

  async function onImportElementos(file: File) {
    try {
      const excelRows = await readExcelRows(file);
      if (excelRows.length === 0) {
        showError("El archivo no tiene filas para procesar.");
        return;
      }

      const payloads: Array<{ nombre: string; unidad?: string }> = [];
      for (const row of excelRows) {
        const nombreRaw = row.nombre ?? row.Nombre ?? row.NOMBRE;
        const unidadRaw = row.unidad ?? row.Unidad ?? row.UNIDAD;
        const nombreParsed = String(nombreRaw ?? "").trim();
        if (!nombreParsed) continue;
        payloads.push({
          nombre: nombreParsed,
          unidad: String(unidadRaw ?? "").trim() || undefined
        });
      }

      const uniquePayloads = Array.from(
        new Map(payloads.map((item) => [item.nombre.toLowerCase(), item])).values()
      );

      if (uniquePayloads.length === 0) {
        showError("No se encontraron filas válidas con columna nombre.");
        return;
      }

      queueElements(uniquePayloads);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo procesar el Excel.";
      showError(message);
    }
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">Elementos</h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Gestión de elementos con carga masiva por Excel y sincronización en cola.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/exploraciones")}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
          >
            <ArrowLeft size={15} />
            Volver
          </button>
        </div>
      </header>

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Crear y cargar elementos</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadElementosTemplate}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              <FileSpreadsheet size={15} />
              Plantilla Excel
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-primary)]/55 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10">
              <FileUp size={15} />
              Cargar Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onImportElementos(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.3fr_1fr_auto]">
          <input
            placeholder="Nombre del elemento"
            className={inputClassName}
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
          />
          <input
            placeholder="Unidad (opcional)"
            className={inputClassName}
            value={unidad}
            onChange={(event) => setUnidad(event.target.value)}
          />
          <button
            type="button"
            onClick={onQueueSingle}
            disabled={saveBatchMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={14} />
            Encolar
          </button>
        </div>
      </article>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
        <div className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="relative max-w-md flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar elemento o unidad"
                className={`${inputClassName} pl-9`}
              />
            </label>
            <button
              type="button"
              onClick={attemptSync}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              <RefreshCw size={14} />
              Sincronizar cola
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Nombre
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Unidad
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {filteredRows.map((row) => (
                <tr key={row.key} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        row.estado === "Sincronizado"
                          ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
                          : row.estado === "Error de sincronizacion"
                            ? "bg-[var(--color-error)]/18 text-[var(--color-error)]"
                            : "bg-[var(--color-tertiary)]/20 text-[var(--color-tertiary)]"
                      }`}
                    >
                      {row.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">{row.nombre}</td>
                  <td className="px-4 py-3 text-xs">{row.unidad ?? "-"}</td>
                  <td className="px-4 py-3 text-xs">{row.detalle ?? (row.origen === "local" ? "En cola de sincronización." : "-")}</td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                  >
                    No hay elementos para mostrar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
