import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-outline-variant/60 bg-surface-container-low p-8 text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-500">404</p>
        <h1 className="mt-3 text-3xl font-bold">Ruta no encontrada</h1>
        <p className="mt-3 text-sm text-slate-400">
          La página solicitada no existe o fue movida.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg border border-primary/60 px-5 py-2 text-sm font-semibold text-on-surface transition hover:bg-primary/10"
        >
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
