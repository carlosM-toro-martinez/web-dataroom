import { FormEvent, useState } from "react";
import { ArrowLeft, Database, Mail, Phone, Send, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/corporate-site/components/Navbar";
import Footer from "@/corporate-site/components/Footer";
import { requestDataRoomAccess } from "@/features/auth/api/authApi";
import { ApiError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";
import heroImage from "@/assets/images/imagesCorp/NEVADO NOCTURNO.jpeg";

const fieldClassName =
  "w-full border border-[#cbd5df] bg-white px-4 py-3 text-sm text-[#10252d] outline-none transition focus:border-[#0a4d68] focus:ring-2 focus:ring-[#0a4d68]/15";

export function DataRoomAccessRequestPage() {
  const { showError, showSuccess } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    reason: ""
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await requestDataRoomAccess(form);
      showSuccess("Solicitud enviada. Un administrador evaluara tu acceso al Data Room.");
      setForm({ fullName: "", email: "", phone: "", company: "", reason: "" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "No se pudo enviar la solicitud.";
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f8f8] text-[#10252d]">
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden bg-[#0a4d68] text-white">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[0.9fr_1.1fr] md:py-16">
            <div className="flex flex-col justify-center">
              <Link
                to="/"
                className="mb-6 inline-flex w-fit items-center gap-2 border border-white/30 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white/80 transition hover:bg-white/10"
              >
                <ArrowLeft size={14} />
                Volver a la web
              </Link>
              <div className="inline-flex w-fit items-center gap-2 bg-[#f0b35f] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#10252d]">
                <Database size={14} />
                Data Room
              </div>
              <h1 className="mt-5 max-w-xl font-headline text-4xl font-extrabold leading-tight md:text-5xl">
                Solicitud de acceso para revisión técnica
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/80">
                Envia tus datos de contacto y el motivo de revisión. Un administrador evaluara la solicitud, definira la vigencia y habilitara un acceso visitante de solo lectura.
              </p>
              <div className="mt-7 grid gap-3 text-sm text-white/85">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#f2c879]" />
                  Acceso con vencimiento definido por administracion.
                </div>
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-[#f2c879]" />
                  Permiso visitante limitado al Data Room.
                </div>
              </div>
            </div>

            <form
              onSubmit={onSubmit}
              className="border border-[#dce6ea] bg-white p-5 text-[#10252d] shadow-2xl md:p-7"
            >
              <h2 className="font-headline text-2xl font-extrabold">Datos del solicitante</h2>
              <p className="mt-2 text-sm text-[#64748b]">
                Usa un correo y telefono donde podamos coordinar la entrega del acceso.
              </p>

              <div className="mt-6 grid gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">
                    Nombre completo
                  </label>
                  <input
                    required
                    value={form.fullName}
                    onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                    className={fieldClassName}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">
                      Correo
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                        className={`${fieldClassName} pl-10`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">
                      Numero de contacto
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                      <input
                        required
                        value={form.phone}
                        onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                        className={`${fieldClassName} pl-10`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">
                    Empresa
                  </label>
                  <input
                    value={form.company}
                    onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                    className={fieldClassName}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">
                    Motivo de acceso
                  </label>
                  <textarea
                    required
                    value={form.reason}
                    onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                    className={`${fieldClassName} min-h-36 resize-y`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 bg-[#f0b35f] px-5 py-3 font-bold text-[#10252d] transition hover:bg-[#ffd08a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={16} />
                  {isSubmitting ? "Enviando solicitud..." : "Enviar solicitud"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
