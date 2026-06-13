import { Briefcase, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';

export default function Investment() {
  const blocks = [
    {
      icon: Briefcase,
      title: 'Vision',
      description:
        'To be a world-class Bolivian mining company, promoting efficient and sustainable development of mineral resources while creating value for workers, management and nearby communities.',
      highlight: 'World-Class Goal'
    },
    {
      icon: ShieldCheck,
      title: 'Mission',
      description:
        'To position Mina La Lipeña for international recognition by operating with technical excellence and an uncompromising commitment to worker safety and environmental preservation.',
      highlight: 'Technical Excellence'
    },
    {
      icon: BookOpen,
      title: 'Territorial Contribution',
      description:
        'A long-term commitment to employment generation, regional development, and respect for local cultures across the Lipez region.',
      highlight: 'Regional Impact'
    },
    {
      icon: Sparkles,
      title: 'Strategic Focus',
      description:
        'Responsible development of copper and gold resources under transparent governance, operational discipline, and continuous improvement.',
      highlight: 'Cu + Au Focus'
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-[#f5f7fa] to-white" id="investment">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#0f1419] mb-4">
            Vision & <span className="text-[#0a4d68]">Mission</span>
          </h2>
          <p className="text-lg text-[#64748b] max-w-3xl mx-auto">
            Minera Marte aligns operational growth with safety, sustainability and long-term regional development.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {blocks.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-8 rounded-xl shadow-lg border border-[#e2e8f0] hover:border-[#0a4d68] transition-all duration-300"
            >
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#0a4d68] to-[#088395] rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <h3 className="text-xl font-bold text-[#0f1419]">{item.title}</h3>
                    <span className="px-3 py-1 bg-[#d4a574]/20 text-[#b27d42] rounded-full text-sm font-semibold whitespace-nowrap">
                      {item.highlight}
                    </span>
                  </div>
                  <p className="text-[#64748b] leading-relaxed">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
