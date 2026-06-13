import { Download, ExternalLink, FileText } from "lucide-react";
import presentationDeck from "@/assets/docs/Lipena_Presentation_PRELIMINAR.pdf";

export default function PresentationDocument() {
  return (
    <section className="py-20 bg-gradient-to-b from-[#f8fbff] to-white" id="presentation-doc">
      <div className="max-w-7xl mx-auto px-6">
        <div className="rounded-3xl border border-[#d7e1ea] bg-white p-8 shadow-2xl md:p-12">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
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
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0a4d68] px-6 py-3 font-medium text-white transition-all duration-300 hover:bg-[#083d54]"
                >
                  Open Document
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={presentationDeck}
                  download="Lipena_Presentation_PRELIMINAR.pdf"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#b6c7d8] bg-white px-6 py-3 font-medium text-[#0a4d68] transition-all duration-300 hover:border-[#0a4d68] hover:bg-[#f3f8fc]"
                >
                  Download
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-[#d8e2ec] bg-gradient-to-br from-[#f4f8fc] to-[#eaf1f8] p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[#0a4d68] p-3 text-white">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#0f1419]">Presentation Format</h3>
                  <p className="mt-1 text-sm text-[#5f7387]">Portable Document Format (.pdf)</p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-[#cfdae6] bg-white/80 p-4 text-sm text-[#4f6478]">
                Recommended for institutional and executive reviews.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
