import { Mail, MapPin, Send } from "lucide-react";
import { Link } from "react-router-dom";

export default function Contact() {
  return (
    <section className="py-24 bg-[#f3f6f7]" id="contact">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid gap-8 overflow-hidden bg-white shadow-2xl md:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-[#10252d] p-8 text-white md:p-12">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#f2c879]">
              Contact
            </p>
            <h2 className="text-4xl font-bold leading-tight md:text-5xl">
              Corporate Contact
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/68">
              Reach Minera Marte S.R.L. for corporate, technical or strategic inquiries.
            </p>
          </div>

          <div className="p-8 md:p-12">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-[#dce5e8] p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center bg-[#0a4d68] text-white">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#0f1419] mb-2">Email</h3>
                <p className="text-[#64748b] break-all">contact@minmartesrl.com</p>
              </div>

              <div className="border border-[#dce5e8] p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center bg-[#0a4d68] text-white">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#0f1419] mb-2">Project Region</h3>
                <p className="text-[#64748b]">Sud Lipez, Potosi, Bolivia</p>
              </div>
            </div>

            <div className="mt-8 border-l-4 border-[#d4a574] bg-[#f3f6f7] p-7">
              <h3 className="text-2xl font-bold text-[#0f1419] mb-3">
                Access the Private Exploration Data Room
              </h3>
              <p className="text-[#64748b] mb-6">
                Authorized users can sign in to access geological and operational information.
              </p>
            <Link
              to="/login"
                className="inline-flex px-8 py-4 bg-[#0a4d68] hover:bg-[#083d54] text-white transition-all duration-300 items-center justify-center gap-2 font-bold"
            >
              Log In
              <Send className="w-5 h-5" />
            </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
