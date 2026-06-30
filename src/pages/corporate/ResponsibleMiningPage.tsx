import { ArrowLeft, ArrowRight, CheckCircle2, Leaf, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/corporate-site/components/Navbar";
import Footer from "@/corporate-site/components/Footer";
import ClickableImage from "@/corporate-site/components/ClickableImage";
import heroImage from "@/assets/images/fotografias_Medio_Ambiente/IMG_20241228_140951_994.jpg";
import environmentImageA from "@/assets/images/fotografias_Medio_Ambiente/IMG_20240926_142306_063.jpg";
import environmentImageB from "@/assets/images/fotografias_Medio_Ambiente/IMG_20260203_100156_744.jpg";
import safetyImageA from "@/assets/images/fotos_seguridad/F10 Control de gases en interior mina.jpg";
import safetyImageB from "@/assets/images/fotos_seguridad/F4_Capacitacion primeros auxilios.jpg";
import safetyImageC from "@/assets/images/fotos_seguridad/F5_Dotación de ropa de trabajo.jpg";
import {
  communityCommitments,
  environmentPrograms,
  miningResponsibilityStats,
  responsibleMiningIntro,
  responsibleMiningPillars,
  safetyPractices
} from "@/corporate-site/content/responsibleMining";

const safetyGallery = [safetyImageA, safetyImageB, safetyImageC];
const environmentGallery = [environmentImageA, environmentImageB];
const pillarRoutes = ["/seguridad-industrial", "/medio-ambiente", "/mineria-responsable"];

export function ResponsibleMiningPage() {
  return (
    <div className="min-h-screen bg-[#f6f8f7] text-[#0f1419]">
      <Navbar />

      <main>
        <section className="responsible-hero relative flex min-h-[82vh] items-end overflow-hidden pt-24">
          <ClickableImage
            src={heroImage}
            alt="Environmental stewardship at Minera Marte"
            className="topic-hero__image absolute inset-0 h-full w-full"
            imageClassName="h-full w-full object-cover"
          />
          <div className="hero-readable-overlay absolute inset-0" />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-20">
            <Link
              to="/"
              className="reveal-up mb-8 inline-flex items-center gap-2 rounded-full border border-white/30 bg-[#07151d]/55 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-[#07151d]/70"
            >
              <ArrowLeft className="h-4 w-4" />
              Back To Home
            </Link>
            <div className="max-w-4xl">
              <p className="reveal-up reveal-delay-1 mb-4 inline-flex rounded-full bg-[#d4a574]/18 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#f2d5ad]">
                Empresa Minera Marte S.R.L.
              </p>
              <h1 className="hero-title reveal-up reveal-delay-2 mb-6 text-5xl font-bold leading-tight md:text-7xl">
                {responsibleMiningIntro.title}
              </h1>
              <p className="hero-copy reveal-up reveal-delay-3 max-w-3xl text-xl leading-relaxed">
                {responsibleMiningIntro.description}
              </p>
            </div>
            <div className="responsible-hero__stats mt-12 grid max-w-3xl grid-cols-3 gap-4">
              {miningResponsibilityStats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="reveal-up rounded-xl border border-white/16 bg-white/10 p-5 text-white backdrop-blur"
                  style={{ animationDelay: `${360 + index * 90}ms` }}
                >
                  <div className="text-3xl font-bold text-[#d4a574]">{stat.value}</div>
                  <div className="mt-1 text-sm text-white/72">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#10252d] text-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 md:grid-cols-3">
            {responsibleMiningPillars.map((pillar, index) => (
              <Link
                key={pillar.title}
                to={pillarRoutes[index]}
                className="group border-l-2 border-white/18 pl-5 transition hover:border-[#d4a574]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f2c879]">
                  Pillar 0{index + 1}
                </p>
                <p className="mt-2 text-2xl font-bold text-white">{pillar.title}</p>
                <span className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-white/58 transition group-hover:text-[#f2c879]">
                  View Detail
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="scroll-reveal py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <h2 className="mb-4 text-4xl font-bold text-[#0f1419] md:text-5xl">
                Three Pillars For Sustainable Operations
              </h2>
              <p className="text-lg leading-relaxed text-[#64748b]">
                {responsibleMiningIntro.continuation}
              </p>
            </div>
            <div className="responsible-pillars grid gap-6 md:grid-cols-3">
              {responsibleMiningPillars.map((pillar, index) => (
                <Link
                  key={pillar.title}
                  to={pillarRoutes[index]}
                  className="motion-card group border border-[#dbe5e7] bg-white p-7 shadow-sm transition hover:border-[#0a4d68]/35 hover:shadow-xl"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center bg-[#0a4d68] text-white">
                    <pillar.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold">{pillar.title}</h3>
                  <p className="mb-4 leading-relaxed text-[#526273]">{pillar.summary}</p>
                  <p className="text-sm leading-relaxed text-[#64748b]">{pillar.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#0a4d68]">
                    View Detail
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="scroll-reveal bg-white py-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#0a4d68]/10 px-4 py-2 text-sm font-semibold text-[#0a4d68]">
                <ShieldCheck className="h-4 w-4" />
                Health & Safety
              </div>
              <h2 className="mb-5 text-4xl font-bold">Preventive Culture In Every Activity</h2>
              <p className="mb-7 text-lg leading-relaxed text-[#64748b]">
                The safety and health of workers, contractors and visitors are a permanent priority. Our management approach anticipates risks, implements controls and strengthens preventive habits.
              </p>
              <div className="grid gap-3">
                {safetyPractices.map((practice) => (
                  <p key={practice} className="flex gap-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 text-[#526273]">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0a4d68]" />
                    {practice}
                  </p>
                ))}
              </div>
            </div>
            <div className="responsible-photo-grid grid gap-4 sm:grid-cols-3">
              {safetyGallery.map((image, index) => (
                <ClickableImage
                  key={image}
                  src={image}
                  alt={`Safety practice ${index + 1}`}
                  className="image-lift relative h-full min-h-[320px] w-full shadow-xl"
                  imageClassName="h-full min-h-[320px] w-full object-cover"
                />
              ))}
            </div>
          </div>
        </section>

        <section className="scroll-reveal py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-12 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#0a4d68]/10 px-4 py-2 text-sm font-semibold text-[#0a4d68]">
                  <Leaf className="h-4 w-4" />
                  Environmental Management
                </div>
                <h2 className="mb-5 text-4xl font-bold">Prevention, Control And Continuous Improvement</h2>
                <p className="text-lg leading-relaxed text-[#64748b]">
                  Our environmental management is based on permanent monitoring, regulatory compliance and operational actions focused on minimizing impacts.
                </p>
              </div>
              <div className="responsible-environment-strip grid gap-4 sm:grid-cols-2">
                {environmentGallery.map((image, index) => (
                  <ClickableImage
                    key={image}
                    src={image}
                    alt={`Environmental management ${index + 1}`}
                    className="image-lift relative h-64 w-full shadow-lg"
                    imageClassName="h-64 w-full object-cover"
                  />
                ))}
              </div>
            </div>

            <div className="responsible-programs grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {environmentPrograms.map((program) => (
                <article key={program.title} className="border border-[#dbe5e7] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center bg-[#d4a574]/18 text-[#9f6d33]">
                    <program.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-4 text-xl font-bold">{program.title}</h3>
                  <ul className="space-y-3">
                    {program.items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-relaxed text-[#526273]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0a4d68]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="scroll-reveal bg-[#0f1419] py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#d4a574]">
                Community & Development
              </p>
              <h2 className="mb-5 text-4xl font-bold">Transparent And Lasting Relationships</h2>
              <p className="text-lg leading-relaxed text-white/72">
                Empresa Minera Marte recognizes the importance of building respectful relationships with communities and local stakeholders, contributing to sustainable development in its area of influence.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {communityCommitments.map((commitment) => (
                <div key={commitment} className="border border-white/12 bg-white/8 p-5">
                  <CheckCircle2 className="mb-3 h-5 w-5 text-[#d4a574]" />
                  <p className="leading-relaxed text-white/82">{commitment}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
