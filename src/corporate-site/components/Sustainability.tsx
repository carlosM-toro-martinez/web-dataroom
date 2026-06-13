import { Leaf, Recycle, Users2, Droplets } from 'lucide-react';

export default function Sustainability() {
  const initiatives = [
    {
      icon: Leaf,
      title: 'Occupational Health & Safety',
      description:
        'Health and safety are transversal principles across all decisions, with proactive protection for people and assets.',
      metric: 'Priority 1',
      metricLabel: 'Company-wide Principle'
    },
    {
      icon: Users2,
      title: 'Integrity',
      description:
        'The company honors commitments and acts in strict compliance with current laws and corporate policies.',
      metric: '100%',
      metricLabel: 'Commitment to Compliance'
    },
    {
      icon: Recycle,
      title: 'Responsibility',
      description:
        'Efficient use of resources with full social and environmental accountability, promoting sustainable development.',
      metric: 'Full Scope',
      metricLabel: 'Operational Responsibility'
    },
    {
      icon: Droplets,
      title: 'Continuous Learning & Innovation',
      description:
        'A culture of learning and innovation to optimize technical, operational and management processes.',
      metric: 'Continuous',
      metricLabel: 'Improvement Cycle'
    }
  ];

  return (
    <section className="py-24 bg-white" id="sustainability">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#8b6a45]/10 rounded-full text-[#8b6a45] mb-4">
            <Leaf className="w-4 h-4" />
            <span className="text-sm font-medium">Corporate Values</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#0f1419] mb-4">
            Values That Shape <span className="text-[#0a4d68]">Every Operation</span>
          </h2>
          <p className="text-lg text-[#64748b] max-w-3xl mx-auto">
            Our value system supports responsible mining, operational discipline and long-term sustainability.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {initiatives.map((initiative, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-white to-[#f5f7fa] p-8 rounded-xl border border-[#e2e8f0] hover:shadow-lg transition-all duration-300"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-[#0a4d68] to-[#8b6a45] rounded-lg flex items-center justify-center mb-6">
                <initiative.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#0f1419] mb-3">{initiative.title}</h3>
              <p className="text-[#64748b] mb-6 leading-relaxed">{initiative.description}</p>
              <div className="pt-4 border-t border-[#e2e8f0]">
                <div className="text-2xl font-bold text-[#0a4d68] mb-1">{initiative.metric}</div>
                <div className="text-sm text-[#64748b]">{initiative.metricLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
