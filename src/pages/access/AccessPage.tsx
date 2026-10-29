import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Mail, MailCheck, MailQuestion, RefreshCw, Search, UserCheck, UserMinus, Users } from "lucide-react";
import type { ReactNode } from "react";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import { fieldClass, panelClass, secondaryButton } from "@/features/sondajes/components/ui";
import { getAccessOverview } from "@/features/access/api/accessApi";
import type { AccessAccount, AccessInvitation, AccountState, InvitationState } from "@/features/access/model/access.schema";
import { TONE_CLASS } from "@/features/audit/lib/auditLabels";

type Tone = keyof typeof TONE_CLASS;

const dateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const dateOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

const ACCOUNT_STATE: Record<AccountState, { label: string; hint: string; tone: Tone }> = {
  ACTIVE: { label: "Con acceso", hint: "Puede entrar al sistema", tone: "green" },
  INACTIVE: { label: "Desactivado", hint: "No puede entrar", tone: "red" },
  VISITOR_ACTIVE: { label: "Visitante con acceso", hint: "Acceso temporal vigente", tone: "sky" },
  VISITOR_PENDING: { label: "Invitado, aún no entró", hint: "Tiene acceso vigente pero nunca inició sesión", tone: "amber" },
  VISITOR_EXPIRED: { label: "Acceso vencido", hint: "Su acceso temporal terminó", tone: "red" }
};

const INVITATION_STATE: Record<InvitationState, { label: string; hint: string; tone: Tone }> = {
  PENDING_REVIEW: { label: "Esperando tu respuesta", hint: "Pidió acceso y nadie lo ha aprobado ni rechazado", tone: "amber" },
  NOT_ENTERED: { label: "Invitado, aún no entró", hint: "Se aprobó su acceso, pero nunca inició sesión", tone: "amber" },
  ENTERED: { label: "Ya entró", hint: "Recibió su acceso e inició sesión", tone: "green" },
  EXPIRED: { label: "Acceso vencido", hint: "Terminó el plazo que se le dio", tone: "slate" },
  CANCELLED: { label: "Cancelado", hint: "Se le quitó el acceso", tone: "red" },
  REJECTED: { label: "Rechazado", hint: "La solicitud no se aprobó", tone: "slate" }
};

function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TONE_CLASS[tone]}`}>{children}</span>;
}

function BigNumber({ value, label, hint, tone, icon }: { value: number; label: string; hint: string; tone: Tone; icon: ReactNode }) {
  return (
    <div className={`${panelClass} flex items-start gap-4 p-5`}>
      <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONE_CLASS[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-4xl font-extrabold leading-none">{value.toLocaleString("es-BO")}</p>
        <p className="mt-1.5 text-sm font-bold">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">{hint}</p>
      </div>
    </div>
  );
}

const th = "px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]";
const td = "px-3 py-3 align-top text-sm";

function accessEnd(account: AccessAccount) {
  if (!account.isVisitor) return <span className="text-[var(--color-on-surface-variant)]">Sin vencimiento</span>;
  if (account.state === "VISITOR_EXPIRED") return <span className="text-rose-600">Venció el {dateOnly(account.accessExpiresAt)}</span>;
  if (account.daysLeft === null) return <span>—</span>;
  const soon = account.daysLeft <= 7;
  return (
    <span className={soon ? "font-semibold text-amber-600" : ""}>
      {dateOnly(account.accessExpiresAt)}
      <span className="block text-xs font-normal text-[var(--color-on-surface-variant)]">{account.daysLeft === 0 ? "vence hoy" : `faltan ${account.daysLeft} día${account.daysLeft === 1 ? "" : "s"}`}</span>
    </span>
  );
}

type Filter = "all" | "staff" | "visitors" | "blocked";
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "staff", label: "Personal" },
  { key: "visitors", label: "Visitantes" },
  { key: "blocked", label: "Sin acceso" }
];
const isBlocked = (account: AccessAccount) => account.state === "INACTIVE" || account.state === "VISITOR_EXPIRED";

function AccountsTable({ accounts }: { accounts: AccessAccount[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const counts: Record<Filter, number> = {
    all: accounts.length,
    staff: accounts.filter((a) => !a.isVisitor).length,
    visitors: accounts.filter((a) => a.isVisitor).length,
    blocked: accounts.filter(isBlocked).length
  };
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (filter === "staff" && a.isVisitor) return false;
      if (filter === "visitors" && !a.isVisitor) return false;
      if (filter === "blocked" && !isBlocked(a)) return false;
      return !term || a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term);
    });
  }, [accounts, filter, search]);

  return (
    <section className={`${panelClass} overflow-hidden`}>
      <div className="space-y-3 p-4">
        <h2 className="text-lg font-extrabold">Todas las personas con cuenta</h2>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                filter === item.key ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "bg-[var(--color-surface-container-high)] hover:text-[var(--color-primary)]"
              }`}
            >
              {item.label} <span className="opacity-70">({counts[item.key]})</span>
            </button>
          ))}
          <div className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
            <input className={`${fieldClass} pl-9`} placeholder="Buscar por nombre o correo…" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-t border-[var(--color-border-soft)]">
          <thead className="bg-[var(--color-surface-container-high)]">
            <tr>
              <th className={th}>Persona</th>
              <th className={th}>Rol</th>
              <th className={th}>Situación</th>
              <th className={th}>Último ingreso</th>
              <th className={th}>Ingresos (30 días)</th>
              <th className={th}>Acceso hasta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-soft)]">
            {rows.map((account) => {
              const state = ACCOUNT_STATE[account.state];
              return (
                <tr key={account.id}>
                  <td className={td}>
                    <p className="font-semibold">{account.name}</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">{account.email}</p>
                  </td>
                  <td className={td}>{account.roleName}</td>
                  <td className={td}>
                    <Chip tone={state.tone}>{state.label}</Chip>
                    <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{state.hint}</p>
                  </td>
                  <td className={td}>{account.lastLoginAt ? dateTime(account.lastLoginAt) : <span className="text-[var(--color-on-surface-variant)]">Sin ingreso registrado</span>}</td>
                  <td className={td}>{account.logins30Days}</td>
                  <td className={td}>{accessEnd(account)}</td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-[var(--color-on-surface-variant)]">
                  No hay personas que coincidan.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InvitationsTable({ invitations }: { invitations: AccessInvitation[] }) {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const rows = onlyOpen ? invitations.filter((i) => i.state === "PENDING_REVIEW" || i.state === "NOT_ENTERED") : invitations;
  return (
    <section className={`${panelClass} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-lg font-extrabold">Invitaciones y solicitudes de acceso</h2>
          <p className="text-xs text-[var(--color-on-surface-variant)]">Personas externas que pidieron entrar al Data Room y a las que se les envió (o se les debe) su acceso.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={secondaryButton} onClick={() => setOnlyOpen(!onlyOpen)}>
            {onlyOpen ? `Ver todas (${invitations.length})` : "Ver solo las que requieren atención"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-t border-[var(--color-border-soft)]">
          <thead className="bg-[var(--color-surface-container-high)]">
            <tr>
              <th className={th}>Persona</th>
              <th className={th}>Situación</th>
              <th className={th}>Pidió acceso</th>
              <th className={th}>Aprobada</th>
              <th className={th}>Acceso hasta</th>
              <th className={th}>Último ingreso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-soft)]">
            {rows.map((invitation) => {
              const state = INVITATION_STATE[invitation.state];
              return (
                <tr key={invitation.id}>
                  <td className={td}>
                    <p className="font-semibold">{invitation.name}</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">{invitation.email}</p>
                    {invitation.company ? <p className="text-xs text-[var(--color-on-surface-variant)]">{invitation.company}</p> : null}
                  </td>
                  <td className={td}>
                    <Chip tone={state.tone}>{state.label}</Chip>
                    <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{state.hint}</p>
                  </td>
                  <td className={td}>{dateTime(invitation.requestedAt)}</td>
                  <td className={td}>
                    {invitation.state === "PENDING_REVIEW" || invitation.state === "REJECTED" ? (
                      "—"
                    ) : (
                      <>
                        {dateTime(invitation.reviewedAt)}
                        {invitation.reviewedBy ? <span className="block text-xs text-[var(--color-on-surface-variant)]">por {invitation.reviewedBy}</span> : null}
                      </>
                    )}
                  </td>
                  <td className={td}>{dateOnly(invitation.expiresAt)}</td>
                  <td className={td}>{invitation.lastLoginAt ? dateTime(invitation.lastLoginAt) : <span className="text-[var(--color-on-surface-variant)]">Sin ingreso registrado</span>}</td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-[var(--color-on-surface-variant)]">
                  {onlyOpen ? "No hay invitaciones ni solicitudes que requieran atención." : "Todavía no hay solicitudes."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AccessPage() {
  const query = useQuery({ queryKey: ["access", "overview"], queryFn: getAccessOverview, refetchInterval: 60_000 });
  const data = query.data;

  return (
    <div className="space-y-6">
      <InternalHeader
        eyebrow="Administración"
        title="Accesos al sistema"
        description="Cuántas personas tienen cuenta, quiénes pueden entrar hoy, quiénes entraron y qué invitaciones siguen abiertas."
      />

      {query.isLoading ? <p className="text-sm text-[var(--color-on-surface-variant)]">Cargando…</p> : null}
      {query.isError ? (
        <div className={`${panelClass} flex items-center gap-3 p-4 text-sm`}>
          <AlertTriangle size={18} className="text-rose-600" />
          No se pudo cargar la información de accesos.
          <button type="button" className={`${secondaryButton} ml-auto`} onClick={() => void query.refetch()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold">Resumen de hoy</h2>
              <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
                Actualizado {dateTime(data.generatedAt)}
                <button type="button" className={secondaryButton} onClick={() => void query.refetch()} disabled={query.isFetching}>
                  <RefreshCw size={14} className={query.isFetching ? "animate-spin" : ""} />
                  Actualizar
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <BigNumber value={data.totals.accounts} label="Cuentas en total" hint="Todas las personas registradas, con o sin acceso" tone="slate" icon={<Users size={24} />} />
              <BigNumber value={data.totals.staffActive} label="Personal con acceso" hint="Trabajadores que pueden entrar hoy" tone="green" icon={<UserCheck size={24} />} />
              <BigNumber value={data.totals.visitorsActive} label="Visitantes con acceso" hint="Externos con acceso temporal vigente" tone="sky" icon={<Clock size={24} />} />
              <BigNumber
                value={data.totals.staffInactive + data.totals.visitorsExpired + data.totals.visitorsInactive}
                label="Sin acceso"
                hint="Desactivados o con acceso vencido"
                tone="red"
                icon={<UserMinus size={24} />}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <BigNumber value={data.totals.enteredLast7Days} label="Entraron en los últimos 7 días" hint="Personas distintas que iniciaron sesión" tone="green" icon={<CheckCircle2 size={24} />} />
              <BigNumber value={data.totals.neverEntered} label="Sin ingreso registrado" hint={data.loginTrackingSince ? `No han iniciado sesión desde el ${dateOnly(data.loginTrackingSince)}` : "Tienen cuenta pero no iniciaron sesión"} tone="amber" icon={<MailQuestion size={24} />} />
              <BigNumber value={data.totals.expiringSoon} label="Acceso vence en 7 días" hint="Visitantes a punto de perder el acceso" tone="amber" icon={<AlertTriangle size={24} />} />
            </div>
          </section>

          {data.loginTrackingSince ? (
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Los ingresos se registran desde el {dateOnly(data.loginTrackingSince)}. Quien entró antes de esa fecha y no ha vuelto a entrar aparece como «Sin ingreso registrado», aunque sí haya usado el sistema.
            </p>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-lg font-extrabold">Correos de invitación</h2>
            <div
              className={`${panelClass} flex items-start gap-3 p-4 text-sm ${data.emailConfigured ? "" : "border-rose-500/50"}`}
            >
              {data.emailConfigured ? <MailCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" /> : <AlertTriangle size={20} className="mt-0.5 shrink-0 text-rose-600" />}
              <p>
                {data.emailConfigured ? (
                  <>
                    <b>El envío de correos está activo.</b> Al aprobar una solicitud, el sistema envía el correo con la contraseña temporal. El sistema no guarda si cada correo llegó a la bandeja de la persona; para saber si
                    alguien recibió su acceso, mira si ya aparece como «Ya entró».
                  </>
                ) : (
                  <>
                    <b>El envío de correos NO está configurado.</b> Las invitaciones aprobadas no se envían por correo; la contraseña temporal solo se ve en la pantalla de solicitudes.
                  </>
                )}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <BigNumber value={data.invitationTotals.pendingReview} label="Esperando tu respuesta" hint="Pidieron acceso y no se han revisado" tone="amber" icon={<Mail size={24} />} />
              <BigNumber value={data.invitationTotals.notEntered} label="Invitados que aún no entran" hint="Aprobados, pero todavía no iniciaron sesión" tone="amber" icon={<MailQuestion size={24} />} />
              <BigNumber value={data.invitationTotals.entered} label="Invitados que ya entraron" hint="Recibieron su acceso y lo usaron" tone="green" icon={<MailCheck size={24} />} />
              <BigNumber value={data.invitationTotals.expired + data.invitationTotals.cancelled + data.invitationTotals.rejected} label="Cerradas" hint="Vencidas, canceladas o rechazadas" tone="slate" icon={<UserMinus size={24} />} />
            </div>
          </section>

          <InvitationsTable invitations={data.invitations} />

          <section className={`${panelClass} p-4`}>
            <h2 className="mb-3 text-lg font-extrabold">Personas por rol</h2>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {data.byRole.map((row) => (
                <div key={row.role} className="flex items-center justify-between rounded-xl bg-[var(--color-surface-container-high)] px-4 py-3">
                  <span className="font-semibold">{row.roleName}</span>
                  <span className="text-sm">
                    <b className="text-lg">{row.total}</b> <span className="text-[var(--color-on-surface-variant)]">({row.active} con acceso)</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <AccountsTable accounts={data.accounts} />
        </>
      ) : null}
    </div>
  );
}
