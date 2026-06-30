import { ChevronDown, Leaf, Menu, Mountain, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { UserRouteMenu } from '@/shared/ui/UserRouteMenu';

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  const navItems = [
    { label: 'Overview', to: '/#about' },
    { label: 'Presentation', to: '/#presentation-doc' },
    { label: 'Vision & Mission', to: '/#investment' },
    { label: 'Contact', to: '/#contact' }
  ];
  const stewardshipItems = [
    { label: 'Sustainability Stewardship', description: 'Our integrated operating principles', to: '/mineria-responsable', icon: Mountain },
    { label: 'Environmental Management', description: 'Water, air, soil and waste programs', to: '/medio-ambiente', icon: Leaf },
    { label: 'Industrial Safety', description: 'Prevention, training and risk control', to: '/seguridad-industrial', icon: ShieldCheck }
  ];
  const isActiveRoute = (to: string) =>
    to.includes('#') ? `${location.pathname}${location.hash}` === to : location.pathname === to;

  useEffect(() => {
    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollYRef.current;
      const crossedTop = currentScrollY < 80;

      if (crossedTop || !isScrollingDown) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 border-b border-[#e2e8f0] bg-white/95 shadow-sm backdrop-blur-sm transition-transform duration-500 ease-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0a4d68] to-[#088395] rounded-lg flex items-center justify-center">
              <Mountain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-xl text-[#0f1419]">Minera Marte S.R.L.</div>
              <div className="text-xs text-[#64748b]">Bolivian Private Mining Company</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={`text-[#64748b] hover:text-[#0a4d68] transition-colors duration-200 font-medium ${
                  isActiveRoute(item.to) ? 'text-[#0a4d68]' : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="nav-dropdown group relative">
              <Link
                to="/mineria-responsable"
                className={`inline-flex items-center gap-1.5 text-[#64748b] transition-colors duration-200 hover:text-[#0a4d68] font-medium ${
                  location.pathname === '/mineria-responsable' ||
                  location.pathname === '/medio-ambiente' ||
                  location.pathname === '/seguridad-industrial'
                    ? 'text-[#0a4d68]'
                    : ''
                }`}
              >
                Stewardship
                <ChevronDown className="h-4 w-4 transition group-hover:rotate-180" />
              </Link>
              <div className="nav-dropdown__menu pointer-events-none absolute left-1/2 top-full z-50 mt-4 w-80 -translate-x-1/2 rounded-xl border border-[#dce6ea] bg-white p-2 opacity-0 shadow-2xl transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                {stewardshipItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[#f4f8f8]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0a4d68]/10 text-[#0a4d68]">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-[#0f1419]">{item.label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-[#64748b]">{item.description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            {isAuthenticated ? (
              <UserRouteMenu
                buttonClassName="inline-flex items-center gap-2 rounded-lg bg-[#0a4d68] px-4 py-2.5 font-medium text-white transition-all duration-300 hover:bg-[#083d54]"
                menuClassName="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-2xl"
                logoutClassName="flex w-full items-center gap-2 border-t border-[#e2e8f0] px-4 py-3 text-left text-sm font-bold text-[#b91c1c] transition hover:bg-[#f8fafc]"
              />
            ) : (
              <Link
                to="/login"
                className="px-6 py-2.5 bg-[#0a4d68] hover:bg-[#083d54] text-white rounded-lg transition-all duration-300 font-medium"
              >
                Log In
              </Link>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-[#0f1419]"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t border-[#e2e8f0]">
          <div className="px-6 py-4 space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="block py-2 text-[#64748b] hover:text-[#0a4d68] transition-colors duration-200 font-medium"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-[#e2e8f0] pt-3">
              <p className="px-1 pb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#0a4d68]">
                Stewardship
              </p>
              {stewardshipItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="block rounded-lg px-1 py-2 text-[#64748b] transition-colors duration-200 hover:text-[#0a4d68] font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            {isAuthenticated ? (
              <UserRouteMenu
                align="left"
                onNavigate={() => setIsOpen(false)}
                buttonClassName="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0a4d68] px-6 py-2.5 text-center font-medium text-white transition-all duration-300 hover:bg-[#083d54]"
                menuClassName="relative left-0 top-auto z-50 mt-2 w-full overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-lg"
                logoutClassName="flex w-full items-center justify-center gap-2 border-t border-[#e2e8f0] px-4 py-3 text-sm font-bold text-[#b91c1c] transition hover:bg-[#f8fafc]"
              />
            ) : (
              <Link
                to="/login"
                className="block w-full px-6 py-2.5 bg-[#0a4d68] hover:bg-[#083d54] text-white rounded-lg transition-all duration-300 font-medium text-center"
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
