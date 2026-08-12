import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, ShieldCheck } from "lucide-react";
import Navbar from "@/corporate-site/components/Navbar";
import heroImage from "@/assets/images/imagesCorp/NUEVA BOCAMINA.jpeg";
import { requestDataRoomAccess } from "@/features/auth/api/authApi";
import { ApiError } from "@/shared/api/core/apiError";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const inputClass =
  "w-full border border-[#cbd5e1] bg-white px-3 py-3 text-sm text-[#10252d] outline-none transition focus:border-[#0a4d68] focus:ring-2 focus:ring-[#0a4d68]/20";
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#47606b]";

export function DataRoomAccessRequestPublicPage() {
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
      showSuccess("Request sent. Minera Marte will review your Data Room access request.");
      setForm({ fullName: "", email: "", phone: "", company: "", reason: "" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "The request could not be sent.";
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f8f8] text-[#10252d]">
      <Navbar />
      <main className="relative min-h-screen pt-20">
        <div className="absolute inset-0">
          <img src={heroImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#07384b]/80" />
        </div>

        <section className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-xl text-white">
            <Link
              to="/"
              className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
            >
              <ArrowLeft size={16} />
              Back to website
            </Link>
            <div className="mt-8 inline-flex items-center gap-2 border border-[#f0b35f]/50 bg-[#f0b35f]/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#f2c879]">
              <ShieldCheck size={14} />
              Controlled access
            </div>
            <h1 className="mt-5 font-headline text-4xl font-extrabold leading-tight md:text-5xl">
              Data Room Access Request
            </h1>
            <p className="mt-4 text-base leading-7 text-white/80">
              Submit your contact details so our administration team can review your request. Approved
              visitors receive temporary credentials with an expiration date and single-device access.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="border border-white/20 bg-white p-5 shadow-2xl md:p-7"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>Full name</label>
                <input
                  required
                  placeholder="Jane Doe"
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  required
                  type="email"
                  placeholder="jane.doe@company.com"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contact number</label>
                <input
                  required
                  placeholder="+591 70000000"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Company</label>
                <input
                  placeholder="Company or institution"
                  value={form.company}
                  onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Reason for access</label>
                <textarea
                  required
                  placeholder="Briefly describe why you need to review the Data Room."
                  value={form.reason}
                  onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                  className={`${inputClass} min-h-36 resize-y`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-[#0a4d68] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#07384b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />
              {isSubmitting ? "Sending request..." : "Send request"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
