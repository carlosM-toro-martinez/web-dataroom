import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, Microscope, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InternalHeader } from "@/shared/ui/InternalHeader";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import {
  useCreateSharedElementMutation,
  useSharedElementsQuery
} from "@/features/exploraciones/hooks/useProposalSamples";

const fieldClassName =
  "w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-3 py-2.5 text-sm text-[var(--color-on-surface)] outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]";

export function ExploracionesElementosPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const elementsQuery = useSharedElementsQuery();
  const createElement = useCreateSharedElementMutation();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const elements = elementsQuery.data ?? [];
    if (!query) return elements;
    return elements.filter((element) =>
      `${element.name} ${element.symbol} ${element.defaultUnit ?? ""}`.toLowerCase().includes(query)
    );
  }, [elementsQuery.data, search]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createElement.mutateAsync({
        name: name.trim(),
        symbol: symbol.trim(),
        defaultUnit: defaultUnit.trim() || undefined,
        description: description.trim() || undefined
      });
      showSuccess("Elemento creado.");
      setName("");
      setSymbol("");
      setDefaultUnit("");
      setDescription("");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo crear el elemento.");
    }
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <InternalHeader
        eyebrow="Exploraciones"
        title="Elementos"
        description="Catálogo compartido para Interior Mina, Superficie y canales."
      />

      <article className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Microscope size={18} />
            Crear elemento
          </h2>
          <button
            type="button"
            onClick={() => navigate("/exploraciones")}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-on-surface)]"
          >
            <ArrowLeft size={15} />
            Volver
          </button>
        </div>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[1.2fr_0.7fr_0.7fr_1.2fr_auto]">
          <input
            className={fieldClassName}
            placeholder="Nombre, ej. Plata"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <input
            className={fieldClassName}
            placeholder="Símbolo, ej. Ag"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            required
          />
          <input
            className={fieldClassName}
            placeholder="Unidad, ej. g/tn"
            value={defaultUnit}
            onChange={(event) => setDefaultUnit(event.target.value)}
          />
          <input
            className={fieldClassName}
            placeholder="Descripción"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <button
            type="submit"
            disabled={createElement.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={15} />
            Crear
          </button>
        </form>
      </article>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
        <div className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-container-high)] px-5 py-3">
          <label className="relative block max-w-md">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, símbolo o unidad"
              className={`${fieldClassName} pl-9`}
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Símbolo
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Nombre
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Unidad
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Descripción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-soft)]">
              {rows.map((element) => (
                <tr key={element.id} className="transition hover:bg-[var(--color-surface-container-highest)]">
                  <td className="px-4 py-3 text-sm font-bold">{element.symbol}</td>
                  <td className="px-4 py-3 text-sm">{element.name}</td>
                  <td className="px-4 py-3 text-xs">{element.defaultUnit ?? "-"}</td>
                  <td className="px-4 py-3 text-xs">{element.description ?? "-"}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
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
