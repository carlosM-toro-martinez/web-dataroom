import { AlertTriangle, CheckCircle2, CloudUpload, RefreshCw, WifiOff } from "lucide-react";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { useShiftReportsSync } from "@/features/sondajes/hooks/useShiftReportsSync";
import { secondaryButton } from "@/features/sondajes/components/ui";

// Estado de conexión y de partes pendientes, con botón para sincronizar a mano.
export function SyncBar({ sync }: { sync: ReturnType<typeof useShiftReportsSync> }) {
  const { showError, showSuccess } = useToast();
  const { online, pendingCount, errorCount, isSyncing, runSync } = sync;

  async function syncNow() {
    if (!online) {
      showError("Sin conexión. Los partes quedan guardados en este dispositivo.");
      return;
    }
    try {
      const result = await runSync();
      if (!result) return;
      if (result.failed > 0) showError(result.errors[0] ?? `${result.failed} parte(s) no se pudieron sincronizar.`);
      else if (result.synced > 0) showSuccess(`${result.synced} parte(s) sincronizado(s).`);
      else showSuccess("No hay partes pendientes.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo sincronizar.");
    }
  }

  const tone = !online
    ? "border-amber-500/40 bg-amber-500/10"
    : errorCount > 0
      ? "border-rose-500/40 bg-rose-500/10"
      : pendingCount > 0
        ? "border-sky-500/40 bg-sky-500/10"
        : "border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]";

  const { icon, title, detail } = !online
    ? {
        icon: <WifiOff size={18} className="text-amber-600" />,
        title: "Sin conexión",
        detail:
          pendingCount > 0
            ? `${pendingCount} parte(s) guardado(s) en este dispositivo. Se enviarán solos al volver la conexión.`
            : "Puedes seguir registrando partes; se guardan en este dispositivo."
      }
    : errorCount > 0
      ? {
          icon: <AlertTriangle size={18} className="text-rose-600" />,
          title: `${errorCount} parte(s) con error`,
          detail: "Revisa el mensaje en el parte, corrígelo y vuelve a sincronizar."
        }
      : pendingCount > 0
        ? {
            icon: <CloudUpload size={18} className="text-sky-600" />,
            title: `${pendingCount} parte(s) por enviar`,
            detail: "Se están sincronizando automáticamente."
          }
        : {
            icon: <CheckCircle2 size={18} className="text-emerald-600" />,
            title: "Todo sincronizado",
            detail: "Los partes están guardados en el servidor."
          };

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{icon}</span>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="text-xs text-[var(--color-on-surface-variant)]">{detail}</p>
        </div>
      </div>
      <button type="button" className={`${secondaryButton} shrink-0`} onClick={syncNow} disabled={isSyncing}>
        <RefreshCw size={15} className={isSyncing ? "animate-spin" : ""} />
        {pendingCount > 0 ? `Sincronizar (${pendingCount})` : "Sincronizar"}
      </button>
    </div>
  );
}
