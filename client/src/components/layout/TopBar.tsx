import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, GitCompare, Bell, Menu, X, Layers } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

const NAV = [
  { to: '/analyse', label: 'Analyse', icon: Home },
  { to: '/workspace', label: 'Workspace', icon: LayoutGrid },
  { to: '/workspace/compare', label: 'Compare', icon: GitCompare },
];

export function TopBar() {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, demoMode } = useUiStore();
  const { shortlist } = useWorkspaceStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-navy-border bg-navy/95 backdrop-blur-md">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center">
            <Layers size={14} className="text-cyan" />
          </div>
          <span className="font-semibold text-white text-sm hidden sm:block">
            Property<span className="text-cyan">Edge</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-cyan/10 text-cyan border border-cyan/20'
                    : 'text-navy-300 hover:text-white hover:bg-navy-light'
                }`}
              >
                <Icon size={14} />
                {label}
                {to === '/workspace' && shortlist.length > 0 && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-cyan/20 text-cyan text-[10px] flex items-center justify-center">
                    {shortlist.length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2 ml-auto">
          {demoMode && (
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              Demo
            </span>
          )}

          <button className="w-8 h-8 rounded-lg hover:bg-navy-light flex items-center justify-center text-navy-300 hover:text-white transition-colors relative">
            <Bell size={16} />
          </button>

          <Link
            to="/analyse"
            className="hidden sm:flex items-center px-3 py-1.5 rounded-lg bg-cyan text-navy font-semibold text-sm hover:bg-cyan/90 transition-colors"
          >
            Analyse
          </Link>

          {/* Mobile menu */}
          <button
            onClick={toggleSidebar}
            className="md:hidden w-8 h-8 rounded-lg hover:bg-navy-light flex items-center justify-center text-navy-300 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 border-b border-navy-border bg-navy shadow-xl">
          <nav className="p-3 flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={toggleSidebar}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-cyan/10 text-cyan' : 'text-navy-300 hover:text-white hover:bg-navy-light'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
