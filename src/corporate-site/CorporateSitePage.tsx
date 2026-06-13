import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import PresentationDocument from "./components/PresentationDocument";
import Operations from "./components/Operations";
import Investment from "./components/Investment";
import Sustainability from "./components/Sustainability";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

export function CorporateSitePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <About />
      <PresentationDocument />
      {/* <Operations /> */}
      <Investment />
      {/* <Sustainability /> */}
      <Contact />
      <Footer />
    </div>
  );
}
