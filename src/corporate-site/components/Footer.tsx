import { Globe, MessageCircle, Mountain, Share2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0f1419] text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0a4d68] to-[#088395] rounded-lg flex items-center justify-center">
                <Mountain className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-xl">Empresa Minera Marte S.R.L.</div>
                <div className="text-xs text-white/60">Private Bolivian Mining Company</div>
              </div>
            </div>
            <p className="text-white/70 leading-relaxed mb-6">
              Technical excellence, responsible mining development and long-term commitment to workers,
              communities and the natural environment of the Lipez region.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-[#0a4d68] rounded-lg flex items-center justify-center transition-all duration-300">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-[#0a4d68] rounded-lg flex items-center justify-center transition-all duration-300">
                <MessageCircle className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-[#0a4d68] rounded-lg flex items-center justify-center transition-all duration-300">
                <Share2 className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-3">
              <li><a href="#about" className="text-white/70 hover:text-[#d4a574] transition-colors">Overview</a></li>
              <li><a href="#operations" className="text-white/70 hover:text-[#d4a574] transition-colors">Operations</a></li>
              <li><a href="#investment" className="text-white/70 hover:text-[#d4a574] transition-colors">Vision & Mission</a></li>
              <li><a href="#sustainability" className="text-white/70 hover:text-[#d4a574] transition-colors">Values</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Access</h4>
            <ul className="space-y-3">
              <li><a href="/login" className="text-white/70 hover:text-[#d4a574] transition-colors">Data Room Login</a></li>
              <li><a href="/exploraciones-data-room" className="text-white/70 hover:text-[#d4a574] transition-colors">Exploration Portal</a></li>
              <li><a href="#contact" className="text-white/70 hover:text-[#d4a574] transition-colors">Corporate Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/50 text-sm">© 2026 Empresa Minera Marte S.R.L. All rights reserved.</p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-white/50 hover:text-[#d4a574] transition-colors">Privacy Policy</a>
              <a href="#" className="text-white/50 hover:text-[#d4a574] transition-colors">Terms of Use</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
