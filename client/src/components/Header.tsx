interface Props {
  onReset?: () => void;
}

export default function Header({ onReset }: Props) {
  const isAdmin = window.location.pathname === '/admin';

  return (
    <header className="sticky top-0 z-50 glass border-b border-th-border/60">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Logo mark */}
          <div className="w-7 h-7 rounded-lg bg-cyan flex items-center justify-center flex-shrink-0 shadow-sm shadow-cyan/30">
            <svg className="w-4 h-4 text-navy" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5a.75.75 0 0 1 .75.75v1.5h3a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-.75.75h-3v.75a2.75 2.75 0 1 1-1.5 0V9.25h-3A.75.75 0 0 1 3.5 8.5v-4a.75.75 0 0 1 .75-.75h3V2.25A.75.75 0 0 1 8 1.5ZM5 4.75v3h6v-3H5Zm3 5.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" />
            </svg>
          </div>
          {onReset && !isAdmin ? (
            <button onClick={onReset} className="hover:opacity-75 transition-opacity">
              <span className="text-gradient-cyan font-bold text-base tracking-tight">Property Scorecard</span>
            </button>
          ) : (
            <span className="text-gradient-cyan font-bold text-base tracking-tight">Property Scorecard</span>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Admin link (only show on main pages, not admin) */}
          {!isAdmin && (
            <a
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-th-muted border border-th-border hover:border-th-muted hover:text-th-secondary transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.764-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Admin
            </a>
          )}

          {/* Back to app link on admin page */}
          {isAdmin && (
            <a
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-th-muted border border-th-border hover:border-th-muted hover:text-th-secondary transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Back to app
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
