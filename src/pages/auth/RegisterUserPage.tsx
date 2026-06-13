import { FormEvent, useMemo, useState } from "react";
import { Pencil, Search, UserPlus, UserX, X } from "lucide-react";
import { ApiError } from "@/shared/api/core/apiError";
import type { AuthRole, ManagedUser } from "@/features/auth/model/auth.schema";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import { useRegisterMutation } from "@/features/auth/hooks/useRegisterMutation";
import { useUpdateUserMutation, useUsersListQuery } from "@/features/auth/hooks/useUsersManagement";
import {
  authInputClassName,
  authLabelClassName,
  authPrimaryButtonClassName
} from "@/pages/auth/authUi";

const roleOptions: AuthRole[] = [
  "ADMIN",
  "ALMACENERO",
  "RECEPCIONISTA",
  "SUPERINTENDENTE",
  "TRABAJADOR",
  "VISITANTE",
  "GEOLOGOADMIN",
  "GEOLOGO",
  "ADMINISTRADOR"
];

interface EditFormState {
  id: number;
  nombre: string;
  email: string;
  role: AuthRole;
  activo: boolean;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function RegisterUserPage() {
  const registerMutation = useRegisterMutation();
  const usersQuery = useUsersListQuery();
  const updateUserMutation = useUpdateUserMutation();
  const { showError, showSuccess } = useToast();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AuthRole>("TRABAJADOR");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | AuthRole>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | "activo" | "inactivo">("todos");
  const [editUser, setEditUser] = useState<EditFormState | null>(null);

  function resetCreateForm() {
    setNombre("");
    setEmail("");
    setPassword("");
    setRole("TRABAJADOR");
  }

  function onSubmitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    registerMutation.mutate(
      { nombre, email, password, role },
      {
        onSuccess: (response) => {
          showSuccess(`Usuario registrado: ${response.data.nombre} (${response.data.role})`);
          resetCreateForm();
        },
        onError: (error) => {
          const message =
            error instanceof ApiError ? error.message : "No se pudo registrar el usuario.";
          showError(message);
        }
      }
    );
  }

  function openEditModal(user: ManagedUser) {
    setEditUser({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      activo: user.activo ?? true
    });
  }

  function saveEditUser() {
    if (!editUser) return;
    updateUserMutation.mutate(
      {
        id: editUser.id,
        payload: {
          nombre: editUser.nombre.trim(),
          email: editUser.email.trim(),
          role: editUser.role,
          activo: editUser.activo
        }
      },
      {
        onSuccess: () => {
          showSuccess("Trabajador actualizado correctamente.");
          setEditUser(null);
        },
        onError: (error) => {
          const message =
            error instanceof ApiError ? error.message : "No se pudo actualizar el trabajador.";
          showError(message);
        }
      }
    );
  }

  function deactivateUser(user: ManagedUser) {
    if (!(user.activo ?? true)) return;
    updateUserMutation.mutate(
      {
        id: user.id,
        payload: { activo: false }
      },
      {
        onSuccess: () => showSuccess(`Usuario ${user.nombre} dado de baja correctamente.`),
        onError: (error) => {
          const message =
            error instanceof ApiError ? error.message : "No se pudo dar de baja al usuario.";
          showError(message);
        }
      }
    );
  }

  const users = usersQuery.data?.data ?? [];

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const isActive = user.activo ?? true;
      const matchesQuery =
        !query ||
        user.nombre.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        String(user.id).includes(query);
      const matchesRole = roleFilter === "todos" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "activo" && isActive) ||
        (statusFilter === "inactivo" && !isActive);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const isCreating = registerMutation.isPending;
  const isUpdating = updateUserMutation.isPending;

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <InternalHeader
        eyebrow="Administracion"
        title="Trabajadores"
        description="Administracion de usuarios: alta, edicion y baja logica."
      />

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 md:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <UserPlus size={18} />
          Crear trabajador
        </h2>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmitCreate}>
          <div className="md:col-span-2">
            <label className={authLabelClassName}>Nombre</label>
            <input
              required
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className={authInputClassName}
            />
          </div>

          <div>
            <label className={authLabelClassName}>Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={authInputClassName}
            />
          </div>

          <div>
            <label className={authLabelClassName}>Rol</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as AuthRole)}
              className={authInputClassName}
            >
              {roleOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <PasswordInput
            required
            label="Contraseña"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            labelClassName={authLabelClassName}
            wrapperClassName="md:col-span-2"
            className={`${authInputClassName} pr-10`}
          />

          <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={resetCreateForm}
              className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
            >
              Limpiar
            </button>
            <button type="submit" disabled={isCreating} className={authPrimaryButtonClassName}>
              {isCreating ? "Creando..." : "Crear trabajador"}
            </button>
          </div>
        </form>
      </article>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
        <div className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Lista de trabajadores
          </h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <label className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, email o ID"
                className={`${authInputClassName} pl-9`}
              />
            </label>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as "todos" | AuthRole)}
              className={authInputClassName}
            >
              <option value="todos">Todos los roles</option>
              {roleOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "todos" | "activo" | "inactivo")
              }
              className={authInputClassName}
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  ID
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Nombre
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Email
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Rol
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Registro
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {filteredUsers.map((user) => {
                const isActive = user.activo ?? true;
                return (
                  <tr
                    key={user.id}
                    className="transition hover:bg-[var(--color-surface-container-highest)]"
                  >
                    <td className="px-4 py-3 text-xs">{user.id}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{user.nombre}</td>
                    <td className="px-4 py-3 text-xs">{user.email}</td>
                    <td className="px-4 py-3 text-xs">{user.role}</td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          isActive
                            ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
                            : "bg-[var(--color-error)]/18 text-[var(--color-error)]"
                        }`}
                      >
                        {isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-outline-variant)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
                        >
                          <Pencil size={12} />
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={!isActive || isUpdating}
                          onClick={() => deactivateUser(user)}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-error)]/45 px-3 py-1.5 text-xs font-semibold text-[var(--color-error)] transition hover:bg-[var(--color-error)]/10 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <UserX size={12} />
                          Baja
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!usersQuery.isPending && filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]"
                  >
                    No hay trabajadores para los filtros aplicados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      {editUser ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5 shadow-2xl md:p-6">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--color-border-soft)] pb-3">
              <div>
                <h4 className="text-xl font-bold">Editar trabajador</h4>
                <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                  Actualiza datos y estado del usuario.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="rounded-md border border-[var(--color-outline-variant)] p-2 text-[var(--color-on-surface-variant)] transition hover:text-[var(--color-on-surface)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={authLabelClassName}>Nombre</label>
                <input
                  value={editUser.nombre}
                  onChange={(event) =>
                    setEditUser((current) =>
                      current ? { ...current, nombre: event.target.value } : current
                    )
                  }
                  className={authInputClassName}
                />
              </div>
              <div className="md:col-span-2">
                <label className={authLabelClassName}>Email</label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(event) =>
                    setEditUser((current) =>
                      current ? { ...current, email: event.target.value } : current
                    )
                  }
                  className={authInputClassName}
                />
              </div>
              <div>
                <label className={authLabelClassName}>Rol</label>
                <select
                  value={editUser.role}
                  onChange={(event) =>
                    setEditUser((current) =>
                      current ? { ...current, role: event.target.value as AuthRole } : current
                    )
                  }
                  className={authInputClassName}
                >
                  {roleOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={authLabelClassName}>Estado</label>
                <select
                  value={editUser.activo ? "activo" : "inactivo"}
                  onChange={(event) =>
                    setEditUser((current) =>
                      current ? { ...current, activo: event.target.value === "activo" } : current
                    )
                  }
                  className={authInputClassName}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="rounded-lg border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEditUser}
                disabled={isUpdating}
                className={authPrimaryButtonClassName}
              >
                {isUpdating ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
