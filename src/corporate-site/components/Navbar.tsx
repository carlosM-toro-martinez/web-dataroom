import { Menu, Mountain, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { UserRouteMenu } from '@/shared/ui/UserRouteMenu';

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  const navItems = [
    { label: 'About', href: '#about' },
    { label: 'Presentation', href: '#presentation-doc' },
    { label: 'Operations', href: '#operations' },
    { label: 'Vision & Mission', href: '#investment' },
    { label: 'Values', href: '#sustainability' },
    { label: 'Contact', href: '#contact' }
  ];

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

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-[#64748b] hover:text-[#0a4d68] transition-colors duration-200 font-medium"
              >
                {item.label}
              </a>
            ))}
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
              <a
                key={item.label}
                href={item.href}
                className="block py-2 text-[#64748b] hover:text-[#0a4d68] transition-colors duration-200 font-medium"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
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
