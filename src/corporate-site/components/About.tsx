import { Award, Globe, Shield, Users } from "lucide-react";
import newMina from "../../assets/images/imagesCorp/NUEVA BOCAMINA.jpeg";
import presentationVideo from "@/assets/images/VIDEO DE PRESENTACION.mp4";

export default function About() {
  const features = [
    {
      icon: Globe,
      title: "Corporate Overview",
      description:
        "Empresa Minera Marte S.R.L. is a private Bolivian mining company focused on the exploration and development of metallic resources."
    },
    {
      icon: Award,
      title: "Technical Excellence",
      description:
        "Operations are executed under rigorous geological criteria, combining open-pit and underground methods where technically appropriate."
    },
    {
      icon: Shield,
      title: "Responsible Development",
      description:
        "The company is committed to safe operations, environmental preservation, and accountable resource management."
    },
    {
      icon: Users,
      title: "Regional Commitment",
      description:
        "A long-term approach to local employment and territorial development in the Lipez region of southwestern Bolivia."
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white to-[#f5f7fa]" id="about">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#0f1419] mb-4">
            About <span className="text-[#0a4d68]">Minera Marte</span>
          </h2>
          <p className="text-lg text-[#64748b] max-w-3xl mx-auto">
            Minera Marte S.R.L. is a private Bolivian company dedicated to exploration and
            development of non-ferrous metallic resources, especially copper and gold, in the
            southern mining region of Bolivia.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-[#0f1419]">
              Lipeña Project, Sud Lipez - Potosi
            </h3>
            <p className="text-lg text-[#64748b] leading-relaxed">
              The company operates within the Lipeña Project in Sud Lipez Province, Department of
              Potosi. Its operational model combines technical discipline, sustainable planning, and
              a clear commitment to the responsible use of subsurface resources.
            </p>
            <p className="text-lg text-[#64748b] leading-relaxed">
              Minera Marte represents the commitment of private Bolivian mining to technical
              excellence, regional development, and respectful coexistence with neighboring
              communities and the natural environment.
            </p>

            <div className="mt-8 max-w-xl rounded-2xl border border-[#d7e1ea] bg-white p-5 shadow-lg">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a4d68]">
                    Corporate Media
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-[#0f1419]">Presentation Video</h3>
                </div>
                <span className="rounded-full bg-[#0a4d68]/10 px-3 py-1 text-xs font-medium text-[#0a4d68]">
                  Official
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-[#d9e2eb] bg-[#0b1620]">
                <video
                  className="h-full w-full"
                  controls
                  preload="metadata"
                  playsInline
                >
                  <source src={presentationVideo} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={newMina}
              alt="Mining field operations"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a4d68]/60 to-transparent"></div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-[#e2e8f0]"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-[#0a4d68] to-[#088395] rounded-lg flex items-center justify-center mb-6">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-xl font-bold text-[#0f1419] mb-3">{feature.title}</h4>
              <p className="text-[#64748b] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
