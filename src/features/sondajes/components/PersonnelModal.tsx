import { useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { usePersonnelQuery, useDeletePersonnelMutation, useSavePersonnelMutation, type DrillingPersonnelLocal } from "@/features/sondajes/hooks/useSondajes";
import { newLocalId } from "@/features/sondajes/db/sondajesDb";
import type { PersonnelRole, PersonnelShift } from "@/features/sondajes/db/sondajesDb";
import { Modal, dangerButton, fieldClass, primaryButton, secondaryButton } from "@/features/sondajes/components/ui";

export const ROLE_LABELS: Record<PersonnelRole, string> = {
  operator: "Perforista",
  firstHelper: "Ayudante 1°",
  secondHelper: "Ayudante 2°",
  driver: "Chofer",
  supervisor: "Supervisor",
  drillingChief: "Jefe de perforación"
};

export const SHIFT_LABELS: Record<PersonnelShift, string> = {
  DAY: "Turno A",
  NIGHT: "Turno B",
  BOTH: "Ambos turnos"
};

const ALL_ROLES: PersonnelRole[] = ["operator", "firstHelper", "secondHelper", "driver", "supervisor", "drillingChief"];
const ALL_SHIFTS: PersonnelShift[] = ["DAY", "NIGHT", "BOTH"];

const shiftDot: Record<PersonnelShift, string> = {
  DAY: "bg-amber-400",
  NIGHT: "bg-indigo-400",
  BOTH: "bg-emerald-400"
};

type EditForm = { name: string; role: PersonnelRole; shift: PersonnelShift };
const emptyForm = (): EditForm => ({ name: "", role: "operator", shift: "DAY" });

export function PersonnelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: personnel = [] } = usePersonnelQuery();
  const saveMutation = useSavePersonnelMutation();
  const deleteMutation = useDeletePersonnelMutation();

  const [editing, setEditing] = useState<{ id: string | null; form: EditForm } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function openNew() {
    setEditing({ id: null, form: emptyForm() });
  }

  function openEdit(person: DrillingPersonnelLocal) {
    setEditing({ id: person.id, form: { name: person.name, role: person.role, shift: person.shift } });
  }

  async function save() {
    if (!editing || !editing.form.name.trim()) return;
    await saveMutation.mutateAsync({
      id: editing.id ?? newLocalId(),
      name: editing.form.name.trim(),
      role: editing.form.role,
      shift: editing.form.shift,
      active: true
    });
    setEditing(null);
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    await deleteMutation.mutateAsync(confirmDeleteId);
    setConfirmDeleteId(null);
  }

  const sorted = [...personnel].sort((a, b) => {
    const roleOrder = ALL_ROLES.indexOf(a.role) - ALL_ROLES.indexOf(b.role);
    if (roleOrder !== 0) return roleOrder;
    return a.name.localeCompare(b.name, "es");
  });

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        icon={<Users size={20} />}
        title="Personal de perforación"
        subtitle="Al crear un parte, los campos de personal se llenan automáticamente según el turno."
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <button type="button" className={secondaryButton} onClick={openNew}>
              <Plus size={15} />
              Agregar persona
            </button>
            <button type="button" className={secondaryButton} onClick={onClose}>
              Cerrar
            </button>
          </div>
        }
      >
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Users size={36} className="text-[var(--color-on-surface-variant)]" />
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              No hay personal registrado aún.
              <br />
              Agrega perforistas, ayudantes, supervisores, etc.
            </p>
            <button type="button" className={primaryButton} onClick={openNew}>
              <Plus size={15} />
              Agregar persona
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border-soft)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-container-high)] text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                <tr>
                  <th className="px-4 py-2.5">Nombre</th>
                  <th className="px-4 py-2.5">Rol</th>
                  <th className="px-4 py-2.5">Turno</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {sorted.map((person) => (
                  <tr key={person.id} className="transition hover:bg-[var(--color-surface-container-high)]">
                    <td className="px-4 py-2.5 font-semibold">{person.name}</td>
                    <td className="px-4 py-2.5 text-[var(--color-on-surface-variant)]">{ROLE_LABELS[person.role]}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <span className={`h-2 w-2 rounded-full ${shiftDot[person.shift]}`} />
                        {SHIFT_LABELS[person.shift]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Editar"
                          className="rounded-lg p-1.5 text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container-highest)] hover:text-[var(--color-primary)]"
                          onClick={() => openEdit(person)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          className="rounded-lg p-1.5 text-[var(--color-on-surface-variant)] transition hover:bg-[var(--color-surface-container-highest)] hover:text-rose-600"
                          onClick={() => setConfirmDeleteId(person.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Formulario agregar / editar */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="sm"
        icon={<Users size={20} />}
        title={editing?.id ? "Editar persona" : "Agregar persona"}
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className={primaryButton}
              disabled={!editing?.form.name.trim() || saveMutation.isPending}
              onClick={save}
            >
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Nombre completo
              </label>
              <input
                className={fieldClass}
                autoFocus
                placeholder="Ej. Juan Mamani"
                value={editing.form.name}
                onChange={(event) => setEditing((current) => current ? { ...current, form: { ...current.form, name: event.target.value } } : null)}
                onKeyDown={(event) => { if (event.key === "Enter") save(); }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Rol
              </label>
              <select
                className={fieldClass}
                value={editing.form.role}
                onChange={(event) => setEditing((current) => current ? { ...current, form: { ...current.form, role: event.target.value as PersonnelRole } } : null)}
              >
                {ALL_ROLES.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                Turno asignado
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ALL_SHIFTS.map((shift) => (
                  <button
                    key={shift}
                    type="button"
                    onClick={() => setEditing((current) => current ? { ...current, form: { ...current.form, shift } } : null)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition ${
                      editing.form.shift === shift
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                        : "border-[var(--color-border-soft)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${editing.form.shift === shift ? "bg-[var(--color-on-primary)]" : shiftDot[shift]}`} />
                    {SHIFT_LABELS[shift]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Confirmar eliminar */}
      <Modal
        open={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        size="sm"
        icon={<Trash2 size={20} />}
        title="Eliminar persona"
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setConfirmDeleteId(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className={dangerButton}
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
            >
              <Trash2 size={15} />
              Eliminar
            </button>
          </>
        }
      >
        <p className="text-sm">¿Eliminar este registro de personal? Solo se borra localmente en este dispositivo.</p>
      </Modal>
    </>
  );
}
