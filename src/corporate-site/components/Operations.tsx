import { MapPin, Pickaxe, Layers, ArrowDownToLine } from 'lucide-react';
import ClickableImage from './ClickableImage';

export default function Operations() {
  const sites = [
    {
      name: 'Lipeña Area',
      location: 'Sud Lipez, Potosi - Bolivia',
      type: 'Open Pit + Underground Mining',
      production: 'Ag-Pb-Bi-Cu vein stockwork system',
      grade: 'Hosted in altered Miocene biotitic dacite',
      image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1400&q=80'
    },
    {
      name: 'La Mosa Area',
      location: 'Neighboring Lipeña, same project corridor',
      type: 'Open Pit Mining',
      production: 'Silver, lead, bismuth and copper-bearing veins',
      grade: 'Geological continuity with Lipeña',
      image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1400&q=80'
    }
  ];

  return (
    <section className="py-24 bg-white" id="operations">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a4d68]/10 rounded-full text-[#0a4d68] mb-4">
            <Pickaxe className="w-4 h-4" />
            <span className="text-sm font-medium">Lipeña Project Operations</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#0f1419] mb-4">
            Operational <span className="text-[#0a4d68]">Areas</span>
          </h2>
          <p className="text-lg text-[#64748b] max-w-3xl mx-auto">
            Minera Marte currently develops two principal areas inside the Lipeña Project, with
            technical and geological continuity that strengthens the district-scale potential.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {sites.map((site, idx) => (
            <div
              key={idx}
              className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-[#e2e8f0]"
            >
              <div className="relative h-64 overflow-hidden">
                <ClickableImage
                  src={site.image}
                  alt={site.name}
                  className="relative h-full w-full"
                  imageClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1419]/80 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-bold text-white mb-1">{site.name}</h3>
                  <div className="flex items-center gap-1 text-white/90">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{site.location}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm text-[#64748b]">Mining Method</span>
                  <span className="font-semibold text-[#0f1419] text-right">{site.type}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm text-[#64748b]">Mineralization</span>
                  <span className="font-semibold text-[#0a4d68] text-right">{site.production}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm text-[#64748b]">Geological Host</span>
                  <span className="font-semibold text-[#0f1419] text-right">{site.grade}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-[#0a4d68] to-[#1f3f56] rounded-2xl p-12 text-white">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-6">Technical Operating Approach</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Layers className="w-6 h-6 text-[#d4a574] flex-shrink-0 mt-1" />
                  <p className="text-white/80">
                    Lipeña and La Mosa are separate but neighboring mines developed over the same stockwork vein system.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <ArrowDownToLine className="w-6 h-6 text-[#d4a574] flex-shrink-0 mt-1" />
                  <p className="text-white/80">
                    Underground galleries are used for mapping, drilling and sampling to reach higher-grade structures at depth.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: 'Primary District', value: 'Lipeña' },
                { label: 'Second Front', value: 'La Mosa' },
                { label: 'Metals', value: 'Cu-Au-Ag-Pb-Bi' },
                { label: 'Country', value: 'Bolivia' }
              ].map((metric, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="text-3xl font-bold text-[#d4a574] mb-2">{metric.value}</div>
                  <div className="text-sm text-white/80">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
