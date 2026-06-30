import { Download, ExternalLink, FileText } from "lucide-react";
import presentationDeck from "@/assets/docs/Lipena_Presentation_PRELIMINAR.pdf";

export default function PresentationDocument() {
  return (
    <section className="py-20 bg-white" id="presentation-doc">
      <div className="max-w-7xl mx-auto px-6">
        <div className="overflow-hidden border border-[#d7e1ea] bg-white shadow-2xl">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="p-8 md:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0a4d68]">
                Corporate File
              </p>
              <h2 className="mt-3 text-3xl font-bold text-[#0f1419] md:text-4xl">
                Lipeña Project Presentation Deck
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5f7387]">
                Access the official presentation document with project highlights, technical
                context, and strategic corporate information.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={presentationDeck}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#0a4d68] px-6 py-3 font-bold text-white transition-all duration-300 hover:bg-[#083d54]"
                >
                  Open Document
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={presentationDeck}
                  download="Lipena_Presentation_PRELIMINAR.pdf"
                  className="inline-flex items-center gap-2 border border-[#b6c7d8] bg-white px-6 py-3 font-bold text-[#0a4d68] transition-all duration-300 hover:border-[#0a4d68] hover:bg-[#f3f8fc]"
                >
                  Download
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="h-full bg-[#10252d] p-8 text-white md:p-10">
              <div className="flex items-start gap-4">
                <div className="bg-[#d4a574] p-3 text-[#10252d]">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Presentation Format</h3>
                  <p className="mt-1 text-sm text-white/62">Portable Document Format (.pdf)</p>
                </div>
              </div>
              <div className="mt-8 border-l-2 border-[#d4a574] bg-white/[0.06] p-5 text-sm leading-relaxed text-white/72">
                Recommended for institutional and executive reviews.
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3 text-center">
                <div className="border border-white/12 p-4">
                  <p className="text-2xl font-bold text-[#f2c879]">PDF</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/52">Format</p>
                </div>
                <div className="border border-white/12 p-4">
                  <p className="text-2xl font-bold text-[#f2c879]">IR</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/52">Review</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
