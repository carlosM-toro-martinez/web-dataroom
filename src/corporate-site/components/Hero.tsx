import { ArrowRight, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import campamentoLaLipena from "@/assets/images/imagesCorp/CAMPAMENTO LA LIPEÑA.jpeg";
import personalMiner from "@/assets/images/imagesCorp/personal minero nivel0.jpg";
import nevadoNocturno from "@/assets/images/imagesCorp/NEVADO NOCTURNO.jpeg";
import imagen1 from "@/assets/images/imagesCorp/area tecnica.jpg";

export default function Hero() {
  const heroImages = [campamentoLaLipena, personalMiner, nevadoNocturno, imagen1];
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % heroImages.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [heroImages.length]);

  return (
    <section className="corporate-hero relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        {heroImages.map((imageUrl, index) => (
          <div
            key={imageUrl}
            className={`hero-slide absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              index === activeImageIndex ? "hero-slide--active opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        ))}
        <div className="absolute inset-0 bg-black/12"></div>
        <div className="hero-readable-overlay absolute inset-0"></div>
      </div>

      <div className="corporate-hero__content relative z-10 mx-auto px-6 text-center">
        <div className="corporate-hero__badge inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-4 py-2 text-white backdrop-blur-sm">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm">Private Bolivian Mining Company - Lipez, Potosi</span>
        </div>

        <h1 className="corporate-hero__title hero-title font-bold leading-tight">
          Powering the Future of
          <span className="corporate-hero__title-accent block">
            Sustainable Stewardship
          </span>
        </h1>

        <p className="corporate-hero__copy hero-copy mx-auto max-w-3xl leading-relaxed">
          Empresa Minera Marte S.R.L. is a private Bolivian company focused on exploration and
          development of non-ferrous metallic resources, with emphasis on copper and gold.
        </p>

        <div className="corporate-hero__actions flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/mineria-responsable"
            className="px-8 py-4 bg-[#d4a574] hover:bg-[#c49564] text-white rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-medium"
          >
            Sustainability Stewardship
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-lg backdrop-blur-sm transition-all duration-300 font-medium"
          >
            Log In to Data Room
          </Link>
        </div>

        <div className="corporate-hero__stats mx-auto grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { value: "2", label: "Main Areas" },
            { value: "Sud Lipez", label: "Project Location" },
            { value: "Cu + Au", label: "Strategic Focus" },
            { value: "Private", label: "Bolivian Capital" }
          ].map((stat, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-white/25 bg-black/24 p-4 backdrop-blur-md"
            >
              <div className="corporate-hero__stat-value font-bold text-[#d4a574]">{stat.value}</div>
              <div className="text-sm text-white/88">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="corporate-hero__dots flex justify-center gap-2">
          {heroImages.map((imageUrl, index) => (
            <button
              key={imageUrl}
              type="button"
              aria-label={`Hero image ${index + 1}`}
              onClick={() => setActiveImageIndex(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === activeImageIndex
                  ? "w-8 bg-[#d4a574]"
                  : "w-2.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
