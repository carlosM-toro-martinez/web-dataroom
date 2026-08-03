import { Check, Clipboard, Clock3, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/shared/api/core/apiError";
import type { DataRoomAccessRequest } from "@/features/auth/model/auth.schema";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import {
  useApproveDataRoomAccessRequestMutation,
  useCancelDataRoomAccessRequestMutation,
  useDataRoomAccessRequestsQuery,
  useRejectDataRoomAccessRequestMutation
} from "@/features/auth/hooks/useUsersManagement";
import {
  authInputClassName,
  authLabelClassName,
  authPrimaryButtonClassName
} from "@/pages/auth/authUi";

interface RequestReviewState {
  id: string;
  mode: "approve" | "reject" | "cancel";
  expiresAt: string;
  notes: string;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function defaultVisitorExpiry() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60_000);
  date.setSeconds(0, 0);
  return date.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(value: string) {
  return new Date(value).toISOString();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function buildAccessMessage(request: DataRoomAccessRequest) {
  const loginUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : "/login";

  return [
    `Estimado/a ${request.fullName},`,
    "",
    "Empresa Minera Marte S.R.L. le informa que su solicitud de acceso visitante al Data Room fue aprobada.",
    "",
    "Sus credenciales de ingreso son:",
    `Usuario / correo: ${request.email}`,
    `Contraseña temporal: ${request.visitorTemporaryPassword ?? ""}`,
    `Vigencia del acceso: ${formatDate(request.expiresAt)}`,
    "",
    `Ingrese desde el siguiente enlace: ${loginUrl}`,
    "",
    "Este acceso es de solo lectura y quedará vinculado al primer dispositivo donde inicie sesión.",
    "",
    "Atentamente,",
    "Empresa Minera Marte S.R.L."
  ].join("\n");
}

export function DataRoomAccessRequestsPage() {
  const accessRequestsQuery = useDataRoomAccessRequestsQuery();
  const approveRequestMutation = useApproveDataRoomAccessRequestMutation();
  const rejectRequestMutation = useRejectDataRoomAccessRequestMutation();
  const cancelRequestMutation = useCancelDataRoomAccessRequestMutation();
  const { showError, showSuccess } = useToast();
  const [reviewRequest, setReviewRequest] = useState<RequestReviewState | null>(null);

  const accessRequests = accessRequestsQuery.data?.data ?? [];
  const pendingRequests = accessRequests.filter((request) => request.status === "PENDING");
  const isReviewingRequest =
    approveRequestMutation.isPending || rejectRequestMutation.isPending || cancelRequestMutation.isPending;

  function openApproveRequest(request: DataRoomAccessRequest) {
    setReviewRequest({
      id: request.id,
      mode: "approve",
      expiresAt: defaultVisitorExpiry(),
      notes: ""
    });
  }

  function openRejectRequest(request: DataRoomAccessRequest) {
    setReviewRequest({
      id: request.id,
      mode: "reject",
      expiresAt: defaultVisitorExpiry(),
      notes: ""
    });
  }

  function openCancelRequest(request: DataRoomAccessRequest) {
    setReviewRequest({
      id: request.id,
      mode: "cancel",
      expiresAt: defaultVisitorExpiry(),
      notes: ""
    });
  }

  function submitReviewRequest() {
    if (!reviewRequest) return;

    if (reviewRequest.mode === "approve") {
      approveRequestMutation.mutate(
        {
          id: reviewRequest.id,
          payload: {
            expiresAt: toIsoFromLocalDatetime(reviewRequest.expiresAt),
            adminNotes: reviewRequest.notes.trim() || undefined
          }
        },
        {
          onSuccess: (response) => {
            const temporaryPassword = response.data.temporaryPassword;
            showSuccess(
              response.data.emailSent
                ? "Acceso aprobado, correo enviado y mensaje disponible para copiar."
                : `Acceso aprobado. Contraseña temporal: ${temporaryPassword}`
            );
            setReviewRequest(null);
          },
          onError: (error) => {
            const message = error instanceof ApiError ? error.message : "No se pudo aprobar la solicitud.";
            showError(message);
          }
        }
      );
      return;
    }

    if (reviewRequest.mode === "reject") {
      rejectRequestMutation.mutate(
        {
          id: reviewRequest.id,
          payload: { rejectionReason: reviewRequest.notes.trim() || "Solicitud rechazada." }
        },
        {
          onSuccess: () => {
            showSuccess("Solicitud rechazada.");
            setReviewRequest(null);
          },
          onError: (error) => {
            const message = error instanceof ApiError ? error.message : "No se pudo rechazar la solicitud.";
            showError(message);
          }
        }
      );
      return;
    }

    cancelRequestMutation.mutate(
      {
        id: reviewRequest.id,
        payload: { cancellationReason: reviewRequest.notes.trim() || "Acceso cancelado por administracion." }
      },
      {
        onSuccess: () => {
          showSuccess("Acceso visitante cancelado.");
          setReviewRequest(null);
        },
        onError: (error) => {
          const message = error instanceof ApiError ? error.message : "No se pudo cancelar el acceso.";
          showError(message);
        }
      }
    );
  }

  async function copyAccessMessage(request: DataRoomAccessRequest) {
    try {
      await navigator.clipboard.writeText(buildAccessMessage(request));
      showSuccess("Mensaje de acceso copiado.");
    } catch {
      showError("No se pudo copiar el mensaje.");
    }
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <InternalHeader
        eyebrow="Administracion"
        title="Solicitudes Data Room"
        description="Evalua solicitudes externas, aprueba accesos visitantes y define su vencimiento."
      />

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Bandeja de solicitudes
            </h2>
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
              Pendientes: {pendingRequests.length}
            </p>
          </div>
          <Clock3 size={18} className="text-[var(--color-primary)]" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Solicitante</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Contacto</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Motivo</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Estado</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {accessRequests.map((request) => (
                <tr key={request.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-4 py-3 text-sm">
                    <p className="font-semibold">{request.fullName}</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">{request.company || "-"}</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">{formatDate(request.requestedAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>{request.email}</p>
                    <p className="mt-1">{request.phone}</p>
                  </td>
                  <td className="max-w-md px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
                    {request.reason}
                    {request.expiresAt ? (
                      <p className="mt-2 font-semibold text-[var(--color-on-surface)]">Vence: {formatDate(request.expiresAt)}</p>
                    ) : null}
                    {request.status === "APPROVED" && request.visitorTemporaryPassword ? (
                      <div className="mt-3 border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] p-3 text-[var(--color-on-surface)]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                          Mensaje listo para enviar
                        </p>
                        <p className="mt-2 break-all text-xs">Correo: {request.email}</p>
                        <p className="mt-1 break-all text-xs">Contraseña: {request.visitorTemporaryPassword}</p>
                        <textarea
                          readOnly
                          value={buildAccessMessage(request)}
                          className="mt-3 h-28 w-full resize-none border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-2 text-xs text-[var(--color-on-surface)] outline-none"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => copyAccessMessage(request)}
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                          >
                            <Clipboard size={12} />
                            Copiar mensaje
                          </button>
                          {onlyDigits(request.phone) ? (
                            <a
                              href={`https://wa.me/${onlyDigits(request.phone)}?text=${encodeURIComponent(buildAccessMessage(request))}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-success)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-success)] transition hover:bg-[var(--color-success)]/10"
                            >
                              <MessageCircle size={12} />
                              WhatsApp
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {request.rejectionReason ? (
                      <p className="mt-2 font-semibold text-[var(--color-error)]">{request.rejectionReason}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        request.status === "APPROVED"
                          ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
                          : request.status === "REJECTED" || request.status === "CANCELLED"
                            ? "bg-[var(--color-error)]/18 text-[var(--color-error)]"
                            : "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                      }`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {request.status === "PENDING" ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openApproveRequest(request)}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-success)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-success)] transition hover:bg-[var(--color-success)]/10"
                        >
                          <Check size={12} />
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => openRejectRequest(request)}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-error)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10"
                        >
                          <X size={12} />
                          Rechazar
                        </button>
                      </div>
                    ) : request.status === "APPROVED" ? (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => openCancelRequest(request)}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-error)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10"
                        >
                          <X size={12} />
                          Cancelar acceso
                        </button>
                      </div>
                    ) : (
                      <p className="text-right text-xs text-[var(--color-on-surface-variant)]">Revisada</p>
                    )}
                  </td>
                </tr>
              ))}
              {!accessRequestsQuery.isPending && accessRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
                    No hay solicitudes de acceso al Data Room.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      {reviewRequest ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl md:p-6">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--color-border-soft)] pb-3">
              <div>
                <h3 className="text-xl font-bold">
                  {reviewRequest.mode === "approve"
                    ? "Aprobar acceso"
                    : reviewRequest.mode === "cancel"
                      ? "Cancelar acceso"
                      : "Rechazar solicitud"}
                </h3>
                <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                  {reviewRequest.mode === "approve"
                    ? "Define hasta cuando estara activo el visitante."
                    : reviewRequest.mode === "cancel"
                      ? "El visitante perdera acceso aunque no haya vencido."
                      : "Registra el motivo del rechazo."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewRequest(null)}
                className="rounded-md border border-[var(--color-outline-variant)] p-2 text-[var(--color-on-surface-variant)] transition hover:text-[var(--color-on-surface)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4">
              {reviewRequest.mode === "approve" ? (
                <div>
                  <label className={authLabelClassName}>Vencimiento</label>
                  <input
                    type="datetime-local"
                    value={reviewRequest.expiresAt}
                    onChange={(event) =>
                      setReviewRequest((current) =>
                        current ? { ...current, expiresAt: event.target.value } : current
                      )
                    }
                    className={authInputClassName}
                  />
                </div>
              ) : null}
              <div>
                <label className={authLabelClassName}>
                  {reviewRequest.mode === "approve" ? "Nota interna" : "Motivo"}
                </label>
                <textarea
                  value={reviewRequest.notes}
                  onChange={(event) =>
                    setReviewRequest((current) =>
                      current ? { ...current, notes: event.target.value } : current
                    )
                  }
                  className={`${authInputClassName} min-h-28 resize-y`}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewRequest(null)}
                className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitReviewRequest}
                disabled={isReviewingRequest}
                className={authPrimaryButtonClassName}
              >
                {isReviewingRequest
                  ? "Guardando..."
                  : reviewRequest.mode === "approve"
                    ? "Aprobar"
                    : reviewRequest.mode === "cancel"
                      ? "Cancelar acceso"
                      : "Rechazar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
