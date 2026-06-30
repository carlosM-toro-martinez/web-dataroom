import { ArrowRight, Leaf, ShieldCheck, Users2 } from "lucide-react";
import { Link } from "react-router-dom";
import environmentImage from "@/assets/images/fotografias_Medio_Ambiente/IMG_20260203_100156_744.jpg";
import safetyImage from "@/assets/images/fotos_seguridad/F8_ Capacitaciones semanales.jpg";
import ClickableImage from "./ClickableImage";
import {
  responsibleMiningIntro,
  responsibleMiningPillars
} from "@/corporate-site/content/responsibleMining";

const previewIcons = [ShieldCheck, Leaf, Users2];
const pillarRoutes = ["/seguridad-industrial", "/medio-ambiente", "/mineria-responsable"];

export default function ResponsibleMiningPreview() {
  return (
    <section className="responsible-preview scroll-reveal bg-[#edf2f1] py-24" id="responsible-mining">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-[0.92fr_1.18fr]">
        <div className="reveal-up">
          <div className="mb-5 inline-flex items-center gap-2 border border-[#0a4d68]/15 bg-white px-4 py-2 text-sm font-bold text-[#0a4d68] shadow-sm">
            <Leaf className="h-4 w-4" />
            Stewardship
          </div>
          <h2 className="mb-5 text-4xl font-bold leading-tight text-[#0f1419] md:text-5xl">
            Mining Development With Technical, Human And Environmental Discipline
          </h2>
          <p className="mb-5 text-lg leading-relaxed text-[#526273]">
            {responsibleMiningIntro.description}
          </p>
          <p className="mb-8 text-base leading-relaxed text-[#64748b]">
            {responsibleMiningIntro.continuation}
          </p>
          <Link
            to="/mineria-responsable"
            className="motion-button inline-flex items-center justify-center gap-2 bg-[#0a4d68] px-6 py-3 font-bold text-white shadow-lg transition hover:bg-[#083d54]"
          >
            View Stewardship Framework
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="responsible-preview__visual reveal-up reveal-delay-2 grid gap-4 sm:grid-cols-[1.05fr_0.95fr]">
          <div className="image-lift overflow-hidden border border-white bg-white shadow-xl">
            <ClickableImage
              src={safetyImage}
              alt="Safety training at Minera Marte"
              className="relative h-full min-h-[430px] w-full"
              imageClassName="h-full min-h-[430px] w-full object-cover object-center transition duration-700 hover:scale-[1.03]"
            />
          </div>
          <div className="space-y-4">
            <div className="image-lift overflow-hidden border border-white bg-white shadow-xl">
              <ClickableImage
                src={environmentImage}
                alt="Environmental management at the mining project"
                className="relative h-56 w-full"
                imageClassName="h-56 w-full object-cover object-center transition duration-700 hover:scale-[1.04]"
              />
            </div>
            <div className="grid gap-3">
              {responsibleMiningPillars.map((pillar, index) => {
                const Icon = previewIcons[index] ?? Leaf;
                return (
                  <Link
                    key={pillar.title}
                    to={pillarRoutes[index]}
                    className="motion-card group border border-[#dbe5e7] bg-white p-4 shadow-sm transition hover:border-[#0a4d68]/35 hover:shadow-xl"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#0a4d68]/10 text-[#0a4d68]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-bold text-[#0f1419]">{pillar.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-[#64748b]">{pillar.summary}</p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#0a4d68] opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
