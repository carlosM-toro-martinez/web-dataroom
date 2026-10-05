import { useCallback, useEffect, useRef, useState } from "react";
import { useShiftReportQueueQuery, useSyncShiftReportsMutation } from "@/features/sondajes/hooks/useSondajes";
import type { ShiftReportsSyncResult } from "@/features/sondajes/services/shiftReportsSync";

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

// Sincronización de partes diarios con los mismos disparadores que las muestras de Exploraciones:
// al guardar, cada 60 s mientras haya pendientes, al recuperar conexión y al volver a la pestaña.
export function useShiftReportsSync() {
  const online = useOnlineStatus();
  const queueQuery = useShiftReportQueueQuery();
  const syncMutation = useSyncShiftReportsMutation();
  const { mutateAsync } = syncMutation;
  const inFlight = useRef<Promise<ShiftReportsSyncResult> | null>(null);
  const lastSilentRun = useRef(0);

  const queue = queueQuery.data ?? [];
  const pendingCount = queue.filter((item) => !item.synced).length;
  const errorCount = queue.filter((item) => !item.synced && item.syncError).length;

  const runSync = useCallback(
    async (options: { silent?: boolean; force?: boolean } = {}): Promise<ShiftReportsSyncResult | undefined> => {
      if (!navigator.onLine) return undefined;
      if (inFlight.current) {
        // Una sincronización automática ya está en curso: la manual espera a que termine y luego corre.
        if (options.silent) return undefined;
        await inFlight.current.catch(() => undefined);
      }
      const now = Date.now();
      // Pausa mínima entre sincronizaciones automáticas (no aplica al recuperar la conexión).
      if (options.silent && !options.force && now - lastSilentRun.current < 45_000) return undefined;
      if (options.silent) lastSilentRun.current = now;
      // Manual: también reintenta los partes que quedaron con error.
      const run = mutateAsync({ retryFailed: !options.silent });
      inFlight.current = run;
      try {
        return await run;
      } finally {
        if (inFlight.current === run) inFlight.current = null;
      }
    },
    [mutateAsync]
  );

  useEffect(() => {
    if (pendingCount === 0) return;
    const syncSilently = () => {
      if (navigator.onLine) void runSync({ silent: true });
    };
    // Al volver la conexión se envía de inmediato.
    const syncOnReconnect = () => void runSync({ silent: true, force: true });
    const onVisibility = () => {
      if (!document.hidden) syncSilently();
    };
    const intervalId = window.setInterval(syncSilently, 60_000);
    window.addEventListener("online", syncOnReconnect);
    document.addEventListener("visibilitychange", onVisibility);
    syncSilently();
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", syncOnReconnect);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pendingCount, runSync]);

  return { online, queue, pendingCount, errorCount, isSyncing: syncMutation.isPending, runSync };
}
