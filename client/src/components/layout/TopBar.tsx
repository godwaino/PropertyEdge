import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, GitCompare, Menu, X, UserCircle, LogIn } from 'lucide-react';

function PeLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="#0a1929" />
      <path d="M16 6L4 16h4v10h16V16h4L16 6z" fill="#0369A1" />
      <circle cx="16" cy="19" r="3" fill="#0a1929" />
    </svg>
  );
}
import { useUiStore } from '../../stores/uiStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';

const NAV = [
  { to: '/analyse',   label: 'Analyse',   icon: Home },
  { to: '/workspace', label: 'Workspace', icon: LayoutGrid },
  { to: '/workspace/compare', label: 'Compare', icon: GitCompare },
];

export function TopBar() {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, demoMode } = useUiStore();
  const { shortlist } = useWorkspaceStore();
  const { user, signOut } = useAuthStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-navy-border bg-white shadow-sm">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-2 flex-shrink-0">
          <PeLogo size={26} />
          <span className="font-bold text-charcoal text-sm hidden sm:block tracking-tight">
            Property<span className="text-cyan">Edge</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-cyan/10 text-cyan border border-cyan/20'
                    : 'text-navy-300 hover:text-charcoal hover:bg-navy-light'
                }`}
              >
                <Icon size={14} />
                {label}
                {to === '/workspace' && shortlist.length > 0 && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-cyan/15 text-cyan text-[10px] flex items-center justify-center">
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
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              Demo
            </span>
          )}

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-navy-300 hover:text-charcoal hover:bg-navy-light text-sm transition-colors"
                title={user.email ?? 'Profile'}
              >
                <UserCircle size={15} />
                <span className="hidden lg:block max-w-[100px] truncate text-xs">
                  {user.displayName ?? user.email}
                </span>
              </Link>
              <button
                onClick={() => signOut()}
                className="text-xs text-navy-300 hover:text-charcoal transition-colors px-2 py-1 rounded"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/signin"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-navy-300 hover:text-charcoal text-sm font-medium transition-colors"
            >
              <LogIn size={14} />
              Sign in
            </Link>
          )}

          <Link
            to="/analyse"
            className="hidden sm:flex items-center px-3 py-1.5 rounded-lg bg-charcoal text-white font-semibold text-sm hover:bg-charcoal-800 transition-colors"
          >
            Analyse
          </Link>

          {/* Mobile menu */}
          <button
            onClick={toggleSidebar}
            className="md:hidden w-8 h-8 rounded-lg hover:bg-navy-light flex items-center justify-center text-navy-300 hover:text-charcoal transition-colors"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 border-b border-navy-border bg-white shadow-card">
          <nav className="p-3 flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={toggleSidebar}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-cyan/10 text-cyan' : 'text-navy-300 hover:text-charcoal hover:bg-navy-light'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
            {!user && (
              <Link
                to="/signin"
                onClick={toggleSidebar}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-navy-300 hover:text-charcoal hover:bg-navy-light transition-colors"
              >
                <LogIn size={16} />
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
