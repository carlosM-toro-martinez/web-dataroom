import { ArrowLeft, CheckCircle2 } from "lucide-react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/corporate-site/components/Navbar";
import Footer from "@/corporate-site/components/Footer";

interface ResponsibleTopicProgram {
  title: string;
  description?: string;
  items: string[];
  icon?: ComponentType<{ className?: string }>;
}

interface ResponsibleTopicPageProps {
  eyebrow: string;
  title: string;
  description: string;
  heroImage: string;
  gallery: string[];
  accent: "environment" | "safety";
  leadTitle: string;
  leadDescription: string;
  programs: ResponsibleTopicProgram[];
}

export function ResponsibleTopicPage({
  eyebrow,
  title,
  description,
  heroImage,
  gallery,
  accent,
  leadTitle,
  leadDescription,
  programs
}: ResponsibleTopicPageProps) {
  const accentClass = accent === "environment" ? "topic-page--environment" : "topic-page--safety";

  return (
    <div className={`topic-page ${accentClass} min-h-screen bg-[#f6f8f7] text-[#0f1419]`}>
      <Navbar />

      <main>
        <section className="topic-hero relative flex min-h-[86vh] items-end overflow-hidden pt-24">
          <img src={heroImage} alt="" aria-hidden="true" className="topic-hero__backdrop absolute inset-0 h-full w-full object-cover" />
          <img src={heroImage} alt={title} className="topic-hero__image absolute inset-0 h-full w-full object-cover" />
          <div className="hero-readable-overlay absolute inset-0" />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-20">
            <Link
              to="/mineria-responsable"
              className="reveal-up mb-8 inline-flex items-center gap-2 rounded-full border border-white/30 bg-[#07151d]/55 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-[#07151d]/70"
            >
              <ArrowLeft className="h-4 w-4" />
              Back To Stewardship
            </Link>
            <div className="max-w-4xl">
              <p className="reveal-up reveal-delay-1 mb-4 inline-flex rounded-full bg-[#d4a574]/18 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#f2d5ad]">
                {eyebrow}
              </p>
              <h1 className="hero-title reveal-up reveal-delay-2 mb-6 text-5xl font-bold leading-tight md:text-7xl">
                {title}
              </h1>
              <p className="hero-copy reveal-up reveal-delay-3 max-w-3xl text-xl leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </section>

        <section className="scroll-reveal py-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <div className="reveal-up">
              <h2 className="mb-5 text-4xl font-bold leading-tight md:text-5xl">{leadTitle}</h2>
              <p className="text-lg leading-relaxed text-[#64748b]">{leadDescription}</p>
            </div>
            <div className="topic-gallery grid gap-4 sm:grid-cols-3">
              {gallery.map((image, index) => (
                <img
                  key={image}
                  src={image}
                  alt={`${title} ${index + 1}`}
                  className="reveal-up h-full min-h-[320px] w-full rounded-xl object-cover shadow-xl"
                  style={{ animationDelay: `${160 + index * 110}ms` }}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="scroll-reveal bg-white py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="reveal-up mx-auto mb-12 max-w-3xl text-center">
              <h2 className="mb-4 text-4xl font-bold md:text-5xl">Action Lines</h2>
              <p className="text-lg leading-relaxed text-[#64748b]">
                Operational management supported by follow-up, training and continuous improvement.
              </p>
            </div>
            <div className="topic-programs grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {programs.map((program, index) => {
                const Icon = program.icon;
                return (
                  <article
                    key={program.title}
                    className="reveal-up topic-program rounded-xl border border-[#dbe5e7] bg-[#f8fafc] p-6 shadow-sm"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    {Icon ? (
                      <div className="topic-program__icon mb-5 flex h-12 w-12 items-center justify-center rounded-lg">
                        <Icon className="h-6 w-6" />
                      </div>
                    ) : null}
                    <h3 className="mb-3 text-xl font-bold">{program.title}</h3>
                    {program.description ? (
                      <p className="mb-4 text-sm leading-relaxed text-[#64748b]">{program.description}</p>
                    ) : null}
                    <ul className="space-y-3">
                      {program.items.map((item) => (
                        <li key={item} className="flex gap-2 text-sm leading-relaxed text-[#526273]">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--topic-accent)]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
