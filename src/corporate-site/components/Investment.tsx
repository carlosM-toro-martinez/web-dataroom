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
    <section className="relative overflow-hidden bg-[#0f232c] py-24 text-white" id="investment">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(135deg,rgba(212,165,116,0.22),rgba(10,77,104,0))]" />
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative mb-14 grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-end">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#f2c879]">
              Strategic Direction
            </p>
            <h2 className="section-heading text-4xl md:text-5xl font-bold leading-tight">
              Vision & <span className="text-[#f2c879]">Mission</span>
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-white/72">
            Minera Marte aligns operational growth with safety, sustainability and long-term regional development.
          </p>
        </div>

        <div className="relative grid md:grid-cols-2 gap-5">
          {blocks.map((item, idx) => (
            <div
              key={idx}
              className="group border border-white/12 bg-white/[0.06] p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#d4a574]/50 hover:bg-white/[0.09]"
            >
              <div className="mb-8 flex items-center justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center bg-[#d4a574] text-[#0f232c]">
                  <item.icon className="w-7 h-7" />
                </div>
                <span className="border border-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white/58">
                  {item.highlight}
                </span>
              </div>
              <h3 className="mb-3 text-2xl font-bold text-white">{item.title}</h3>
              <p className="leading-relaxed text-white/68">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
