import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CorporateSignalStrip from "./components/CorporateSignalStrip";
import About from "./components/About";
import PresentationDocument from "./components/PresentationDocument";
import Investment from "./components/Investment";
import ResponsibleMiningPreview from "./components/ResponsibleMiningPreview";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

export function CorporateSitePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <CorporateSignalStrip />
      <About />
      <PresentationDocument />
      <Investment />
      <ResponsibleMiningPreview />
      <Contact />
      <Footer />
    </div>
  );
}
