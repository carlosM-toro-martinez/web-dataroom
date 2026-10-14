import { useEffect, useMemo, useState } from "react";
import { Lock, Plus, Save, ShieldCheck, Trash2, Users } from "lucide-react";
import { ApiError } from "@/shared/api/core/apiError";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useRoleCatalogQuery,
  useRolesQuery,
  useUpdateRoleMutation
} from "@/features/auth/hooks/useRoles";
import type { PermissionAction, PermissionMap, RoleRecord } from "@/features/auth/model/auth.schema";
import { authInputClassName, authLabelClassName, authPrimaryButtonClassName } from "@/pages/auth/authUi";

const ACTION_LABELS: Record<PermissionAction, string> = {
  read: "Ver",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar"
};
const ACTION_ORDER: PermissionAction[] = ["read", "create", "update", "delete"];
const primaryButton = `${authPrimaryButtonClassName.replace("w-full ", "")} inline-flex items-center gap-2`;

type Draft = {
  key: string;
  name: string;
  description: string;
  permissions: PermissionMap;
  isNew: boolean;
};

const panelClass = "rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]";
const ghostButton =
  "inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:cursor-not-allowed disabled:opacity-45";

function draftFrom(role: RoleRecord): Draft {
  return {
    key: role.key,
    name: role.name,
    description: role.description ?? "",
    permissions: role.permissions,
    isNew: false
  };
}

function emptyDraft(): Draft {
  return { key: "", name: "", description: "", permissions: {}, isNew: true };
}

// Crear/editar/eliminar implican ver; quitar "ver" quita todo el módulo.
function toggleAction(permissions: PermissionMap, module: string, action: PermissionAction): PermissionMap {
  const current = new Set(permissions[module] ?? []);
  if (current.has(action)) {
    if (action === "read") current.clear();
    else current.delete(action);
  } else {
    current.add(action);
    current.add("read");
  }
  const next = { ...permissions };
  if (current.size === 0) delete next[module];
  else next[module] = ACTION_ORDER.filter((item) => current.has(item));
  return next;
}

function setModule(permissions: PermissionMap, module: string, actions: PermissionAction[]): PermissionMap {
  const next = { ...permissions };
  if (actions.length === 0) delete next[module];
  else next[module] = actions;
  return next;
}

function summarize(permissions: PermissionMap, labels: Map<string, string>) {
  const modules = Object.keys(permissions);
  if (modules.length === 0) return "Sin permisos";
  return modules.map((key) => labels.get(key) ?? key).join(", ");
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function RolesPage() {
  const { can, isAdmin } = useAuth();
  const { showError, showSuccess } = useToast();
  const rolesQuery = useRolesQuery();
  const catalogQuery = useRoleCatalogQuery();
  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();
  const deleteMutation = useDeleteRoleMutation();

  const roles = rolesQuery.data ?? [];
  const modules = catalogQuery.data?.modules ?? [];
  const moduleLabels = useMemo(() => new Map(modules.map((item) => [item.key, item.label])), [modules]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedRole = roles.find((role) => role.key === selectedKey) ?? null;

  useEffect(() => {
    if (draft || roles.length === 0) return;
    setSelectedKey(roles[0].key);
    setDraft(draftFrom(roles[0]));
  }, [roles, draft]);

  const isAdminRole = !draft?.isNew && draft?.key === "ADMIN";
  const canEdit = draft?.isNew ? can("usuarios", "create") : can("usuarios", "update") && !isAdminRole;
  const dirty =
    draft !== null &&
    (draft.isNew ||
      (selectedRole !== null &&
        (draft.name !== selectedRole.name ||
          draft.description !== (selectedRole.description ?? "") ||
          JSON.stringify(draft.permissions) !== JSON.stringify(selectedRole.permissions))));

  function select(role: RoleRecord) {
    setSelectedKey(role.key);
    setDraft(draftFrom(role));
    setConfirmDelete(false);
  }

  function startNew() {
    setSelectedKey(null);
    setDraft(emptyDraft());
    setConfirmDelete(false);
  }

  function save() {
    if (!draft) return;
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      permissions: draft.permissions
    };
    if (draft.isNew) {
      createMutation.mutate(
        { key: draft.key.trim(), ...payload },
        {
          onSuccess: (role) => {
            showSuccess(`Rol ${role.name} creado.`);
            setSelectedKey(role.key);
            setDraft(draftFrom(role));
          },
          onError: (error) => showError(errorMessage(error, "No se pudo crear el rol."))
        }
      );
      return;
    }
    updateMutation.mutate(
      { key: draft.key, payload: isAdminRole ? { name: payload.name, description: payload.description } : payload },
      {
        onSuccess: (role) => {
          showSuccess(`Rol ${role.name} actualizado.`);
          setDraft(draftFrom(role));
        },
        onError: (error) => showError(errorMessage(error, "No se pudo guardar el rol."))
      }
    );
  }

  function remove() {
    if (!draft || draft.isNew) return;
    deleteMutation.mutate(draft.key, {
      onSuccess: () => {
        showSuccess(`Rol ${draft.name} eliminado.`);
        setConfirmDelete(false);
        setDraft(null);
        setSelectedKey(null);
      },
      onError: (error) => showError(errorMessage(error, "No se pudo eliminar el rol."))
    });
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  const canDeleteRole =
    !!selectedRole && !selectedRole.isSystem && selectedRole.userCount === 0 && can("usuarios", "delete");

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <InternalHeader
        eyebrow="Administración"
        title="Roles y permisos"
        description="Crea roles y define, módulo por módulo, qué puede ver, crear, editar o eliminar cada uno."
      />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`${panelClass} h-fit overflow-hidden`}>
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Roles</h2>
            {can("usuarios", "create") ? (
              <button type="button" className={ghostButton} onClick={startNew}>
                <Plus size={14} />
                Nuevo rol
              </button>
            ) : null}
          </div>
          <ul className="divide-y divide-[var(--color-border-soft)]">
            {rolesQuery.isPending ? (
              <li className="px-4 py-6 text-sm text-[var(--color-on-surface-variant)]">Cargando roles...</li>
            ) : null}
            {roles.map((role) => {
              const active = !draft?.isNew && selectedKey === role.key;
              return (
                <li key={role.key}>
                  <button
                    type="button"
                    onClick={() => select(role)}
                    className={`w-full px-4 py-3 text-left transition ${
                      active
                        ? "bg-[var(--color-primary)]/10 shadow-[inset_3px_0_0_var(--color-primary)]"
                        : "hover:bg-[var(--color-surface-container-high)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold">{role.name}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-[var(--color-on-surface-variant)]">
                        <Users size={12} />
                        {role.userCount}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[var(--color-on-surface-variant)]">{role.key}</span>
                      {role.isSystem ? (
                        <span className="rounded bg-[var(--color-surface-container-highest)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                          Sistema
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--color-on-surface-variant)]">
                      {role.key === "ADMIN" ? "Acceso total" : summarize(role.permissions, moduleLabels)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {draft ? (
          <article className={`${panelClass} min-w-0 p-5 md:p-6`}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[var(--color-primary)]" />
                <h2 className="text-lg font-bold">{draft.isNew ? "Nuevo rol" : draft.name}</h2>
              </div>
              {!draft.isNew && selectedRole ? (
                <span className="text-xs text-[var(--color-on-surface-variant)]">
                  {selectedRole.userCount} usuario(s) con este rol
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={authLabelClassName}>Nombre</label>
                <input
                  className={authInputClassName}
                  value={draft.name}
                  disabled={!canEdit && !isAdminRole}
                  placeholder="Ej. Geólogo de campo"
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </div>
              <div>
                <label className={authLabelClassName}>Clave</label>
                <input
                  className={`${authInputClassName} font-mono uppercase`}
                  value={draft.key}
                  disabled={!draft.isNew}
                  placeholder="GEOLOGO_CAMPO"
                  onChange={(event) => setDraft({ ...draft, key: event.target.value.toUpperCase().replace(/\s+/g, "_") })}
                />
                {draft.isNew ? (
                  <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">
                    Identificador fijo del rol: letras, números y guion bajo. No se puede cambiar después.
                  </p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <label className={authLabelClassName}>Descripción</label>
                <input
                  className={authInputClassName}
                  value={draft.description}
                  disabled={!canEdit && !isAdminRole}
                  placeholder="Para qué sirve este rol"
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </div>
            </div>

            <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Permisos por módulo
            </h3>
            {isAdminRole ? (
              <p className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--color-surface-container-high)] px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                <Lock size={13} />
                El Administrador siempre tiene acceso total; sus permisos no se pueden modificar.
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-[var(--color-border-soft)]">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead className="bg-[var(--color-surface-container-high)] text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  <tr>
                    <th className="px-4 py-2.5">Módulo</th>
                    {ACTION_ORDER.map((action) => (
                      <th key={action} className="w-20 px-2 py-2.5 text-center">
                        {ACTION_LABELS[action]}
                      </th>
                    ))}
                    <th className="w-40 px-2 py-2.5 text-center">Rápido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]">
                  {modules.map((module) => {
                    const granted = isAdminRole ? ACTION_ORDER : draft.permissions[module.key] ?? [];
                    return (
                      <tr key={module.key} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold">{module.label}</p>
                          <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">{module.description}</p>
                        </td>
                        {ACTION_ORDER.map((action) => (
                          <td key={action} className="px-2 py-3 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${ACTION_LABELS[action]} ${module.label}`}
                              className="h-4 w-4 cursor-pointer accent-[var(--color-primary)] disabled:cursor-not-allowed"
                              checked={granted.includes(action)}
                              disabled={!canEdit}
                              onChange={() =>
                                setDraft({ ...draft, permissions: toggleAction(draft.permissions, module.key, action) })
                              }
                            />
                          </td>
                        ))}
                        <td className="px-2 py-3">
                          <div className="flex justify-center gap-1">
                            {(
                              [
                                ["Todo", ACTION_ORDER],
                                ["Solo ver", ["read"]],
                                ["Nada", []]
                              ] as [string, PermissionAction[]][]
                            ).map(([label, actions]) => (
                              <button
                                key={label}
                                type="button"
                                disabled={!canEdit}
                                onClick={() =>
                                  setDraft({ ...draft, permissions: setModule(draft.permissions, module.key, actions) })
                                }
                                className="whitespace-nowrap rounded-md border border-[var(--color-border-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                {!draft.isNew && can("usuarios", "delete") ? (
                  confirmDelete ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[var(--color-error)]">¿Eliminar el rol {draft.name}?</span>
                      <button
                        type="button"
                        className="rounded-lg bg-[var(--color-error)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        disabled={deleteMutation.isPending}
                        onClick={remove}
                      >
                        Sí, eliminar
                      </button>
                      <button type="button" className={ghostButton} onClick={() => setConfirmDelete(false)}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={ghostButton}
                      disabled={!canDeleteRole}
                      title={
                        selectedRole?.isSystem
                          ? "Los roles del sistema no se pueden eliminar"
                          : selectedRole && selectedRole.userCount > 0
                            ? "Reasigna sus usuarios antes de eliminarlo"
                            : undefined
                      }
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 size={14} />
                      Eliminar rol
                    </button>
                  )
                ) : null}
              </div>
              <div className="flex gap-2">
                {dirty && !draft.isNew && selectedRole ? (
                  <button type="button" className={ghostButton} onClick={() => setDraft(draftFrom(selectedRole))}>
                    Descartar cambios
                  </button>
                ) : null}
                {canEdit || (isAdminRole && isAdmin) ? (
                  <button
                    type="button"
                    className={primaryButton}
                    disabled={saving || !dirty || !draft.name.trim() || (draft.isNew && draft.key.trim().length < 2)}
                    onClick={save}
                  >
                    <Save size={15} />
                    {saving ? "Guardando..." : draft.isNew ? "Crear rol" : "Guardar cambios"}
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
