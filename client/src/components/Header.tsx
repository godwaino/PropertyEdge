interface Props {
  onReset?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function Header({ onReset, isDark, onToggleTheme }: Props) {
  return (
    <header className="pt-8 pb-4 text-center">
      <div className="flex items-center justify-between max-w-4xl mx-auto px-4">
        <div className="w-9" /> {/* spacer for centering */}
        <h1 className="text-4xl font-bold tracking-tight">
          {onReset ? (
            <button onClick={onReset} className="hover:opacity-80 transition-opacity">
              <span className="text-cyan dark:text-cyan">Property</span>
              <span className="text-th-heading"> Edge</span>
            </button>
          ) : (
            <>
              <span className="text-cyan dark:text-cyan">Property</span>
              <span className="text-th-heading"> Edge</span>
            </>
          )}
        </h1>
        <button
          onClick={onToggleTheme}
          className="w-9 h-9 rounded-full border border-th-border text-th-secondary hover:text-th-heading hover:border-th-heading/30 transition-colors flex items-center justify-center"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-th-secondary mt-2 text-sm">
        AI-powered UK property analysis &mdash; know before you buy
      </p>
    </header>
  );
}
