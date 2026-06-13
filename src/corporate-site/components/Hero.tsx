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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        {heroImages.map((imageUrl, index) => (
          <div
            key={imageUrl}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              index === activeImageIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        ))}
        <div className="absolute inset-0 bg-black/45"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#091924]/96 via-[#152c3d]/92 to-[#091924]/96"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 mb-8 border border-white/20">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm">Private Bolivian Mining Company - Lipez, Potosi</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Powering the Future of
          <span className="block bg-gradient-to-r from-[#d4a574] to-[#f4d03f] bg-clip-text text-transparent">
            Responsible Mining
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-12 leading-relaxed">
          Empresa Minera Marte S.R.L. is a private Bolivian company focused on exploration and
          development of non-ferrous metallic resources, with emphasis on copper and gold.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="#operations"
            className="px-8 py-4 bg-[#d4a574] hover:bg-[#c49564] text-white rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl font-medium"
          >
            Explore Operations
            <ArrowRight className="w-5 h-5" />
          </a>
          <Link
            to="/login"
            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-lg backdrop-blur-sm transition-all duration-300 font-medium"
          >
            Log In to Data Room
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
          {[
            { value: "2", label: "Main Areas" },
            { value: "Sud Lipez", label: "Project Location" },
            { value: "Cu + Au", label: "Strategic Focus" },
            { value: "Private", label: "Bolivian Capital" }
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6"
            >
              <div className="text-3xl md:text-4xl font-bold text-[#d4a574] mb-2">{stat.value}</div>
              <div className="text-sm text-white/80">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center gap-2">
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
