import { Award, CheckCircle2, ChevronLeft, ChevronRight, Globe, Shield, Users } from "lucide-react";
import { useEffect, useState } from "react";
import newMina from "../../assets/images/imagesCorp/NUEVA BOCAMINA.jpeg";
import presentationVideo from "@/assets/images/VIDEO DE PRESENTACION.mp4";
import aboutPhotoA from "@/assets/images/photos-marte/about1.jpg";
import aboutPhotoB from "@/assets/images/photos-marte/about2.jpg";
import ClickableImage from "./ClickableImage";

const aboutImages = [
  {
    src: newMina,
    alt: "Mining field operations at Minera Marte"
  },
  {
    src: aboutPhotoA,
    alt: "Minera Marte field team in snowy field conditions"
  },
  {
    src: aboutPhotoB,
    alt: "Minera Marte project operations in snowy field conditions"
  }
];

export default function About() {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % aboutImages.length);
    }, 5200);

    return () => window.clearInterval(intervalId);
  }, [aboutImages.length]);

  const showPreviousImage = () => {
    setActiveImageIndex((current) => (current - 1 + aboutImages.length) % aboutImages.length);
  };

  const showNextImage = () => {
    setActiveImageIndex((current) => (current + 1) % aboutImages.length);
  };

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
    <section className="corporate-section py-24 bg-[#f3f6f7]" id="about">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div className="sticky-panel lg:sticky lg:top-28">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#b27d42]">
              Company Overview
            </p>
            <h2 className="section-heading max-w-xl text-4xl font-bold leading-tight text-[#0f1419] md:text-5xl">
              About <span className="text-[#0a4d68]">Minera Marte</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#526273]">
              Minera Marte S.R.L. is a private Bolivian company dedicated to the exploration and
              development of non-ferrous metallic resources, with emphasis on copper and gold in
              the southern mining region of Bolivia.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
              {["Private Bolivian Company", "Sud Lipez, Potosi", "Copper and Gold Focus", "Technical Discipline"].map((item) => (
                <div key={item} className="flex items-center gap-2 border-l-2 border-[#d4a574] bg-white px-4 py-3 text-sm font-semibold text-[#263640] shadow-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0a4d68]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="about-carousel relative overflow-hidden rounded-sm shadow-2xl">
            <ClickableImage
              key={aboutImages[activeImageIndex].src}
              src={aboutImages[activeImageIndex].src}
              alt={aboutImages[activeImageIndex].alt}
              loading="eager"
              className="absolute inset-0 h-full w-full"
              imageClassName="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#07151d]/78 via-transparent to-transparent"></div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f2c879]">
                Lipeña Project
              </p>
              <h3 className="mt-2 max-w-xl text-3xl font-bold text-white">
                Technical planning, field execution and accountable resource development.
              </h3>
            </div>
            <div className="absolute right-4 top-4 z-40 flex gap-2">
              <button
                type="button"
                onClick={showPreviousImage}
                className="flex h-10 w-10 items-center justify-center bg-[#10252d]/82 text-white shadow-lg transition hover:bg-[#f0b35f] hover:text-[#10252d]"
                aria-label="Previous about image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={showNextImage}
                className="flex h-10 w-10 items-center justify-center bg-[#10252d]/82 text-white shadow-lg transition hover:bg-[#f0b35f] hover:text-[#10252d]"
                aria-label="Next about image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="absolute bottom-4 right-4 z-40 flex gap-2 md:bottom-6 md:right-6">
              {aboutImages.map((image, index) => (
                <button
                  key={image.src}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className={`h-2.5 transition-all ${
                    index === activeImageIndex ? "w-8 bg-[#f0b35f]" : "w-2.5 bg-white/58 hover:bg-white"
                  }`}
                  aria-label={`Show about image ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="corporate-feature-card bg-white p-7 shadow-sm transition-all duration-300 border border-[#dce5e8] hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="w-12 h-12 bg-[#0a4d68] flex items-center justify-center mb-6">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-xl font-bold text-[#0f1419] mb-3">{feature.title}</h4>
              <p className="text-[#64748b] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-8 rounded-sm bg-[#10252d] p-6 text-white shadow-2xl md:grid-cols-[0.86fr_1.14fr] md:p-8 lg:p-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f2c879]">
              Corporate Media
            </p>
            <h3 className="mt-3 text-3xl font-bold">Presentation Video</h3>
            <p className="mt-4 max-w-md leading-relaxed text-white/70">
              A concise audiovisual overview of the project context, field setting and operating
              perspective for institutional review.
            </p>
          </div>
          <div className="overflow-hidden rounded-sm border border-white/12 bg-black">
            <video className="h-full w-full" controls preload="metadata" playsInline>
              <source src={presentationVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}
