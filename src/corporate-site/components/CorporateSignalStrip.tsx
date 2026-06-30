import { ArrowRight, MapPin, Mountain, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const signals = [
  { label: "Project Location", value: "Sud Lipez", tone: "bg-[#153746]" },
  { label: "Strategic Focus", value: "Cu + Au", tone: "bg-[#b77b38]" },
  { label: "Operating Model", value: "Private Bolivian Capital", tone: "bg-[#5b6d72]" },
  { label: "Stewardship", value: "Safety + Environment", tone: "bg-[#10252d]" }
];

const highlights = [
  { icon: Mountain, label: "Exploration and development of non-ferrous resources" },
  { icon: ShieldCheck, label: "Preventive safety culture across field operations" },
  { icon: Sparkles, label: "Technical discipline with long-term regional vision" }
];

export default function CorporateSignalStrip() {
  return (
    <section className="corporate-signal bg-[#0c1d24] text-white">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {signals.map((item) => (
          <div key={item.label} className={`${item.tone} px-6 py-7 md:px-10`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/62">
              {item.label}
            </p>
            <p className="mt-2 text-xl font-bold leading-tight text-white md:text-2xl">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[0.85fr_1.15fr] md:items-center">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-[#f2c879]">
            <MapPin className="h-4 w-4" />
            Lipez, Potosi - Bolivia
          </div>
          <h2 className="max-w-xl text-3xl font-bold leading-tight md:text-4xl">
            A focused Bolivian mining platform with a clearer public presence.
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid gap-3 sm:grid-cols-3">
            {highlights.map((item) => (
              <div key={item.label} className="border-l border-white/16 pl-4">
                <item.icon className="mb-3 h-5 w-5 text-[#f2c879]" />
                <p className="text-sm leading-relaxed text-white/74">{item.label}</p>
              </div>
            ))}
          </div>

          <Link
            to="/mineria-responsable"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#dba35d] px-5 py-3 font-bold text-[#101820] transition hover:bg-[#efbd78]"
          >
            Stewardship
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
