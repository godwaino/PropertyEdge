export default function Header() {
  return (
    <header className="pt-10 pb-6 text-center relative">
      {/* Logo mark */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan/20 to-cyan/5 border border-cyan/20 flex items-center justify-center shadow-glow-cyan-sm">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-cyan"
            >
              <path
                d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M9 21V12h6v9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M12 6.5l1.5 1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          {/* Glow dot */}
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-cyan rounded-full border-2 border-navy animate-pulse" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
        <span className="gradient-text">Property</span>
        <span className="text-white">Edge</span>
        <span className="gradient-text-gold ml-2 text-2xl font-light align-middle">AI</span>
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 mt-3 text-sm font-medium tracking-wide">
        AI-powered UK property analysis &mdash; know before you buy
      </p>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 mt-4">
        {[
          { icon: '⚡', label: 'Instant Analysis' },
          { icon: '🏠', label: 'UK Properties' },
          { icon: '🤖', label: 'Claude AI' },
        ].map(({ icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 px-2.5 py-1 rounded-full border border-navy-border bg-navy-light/50"
          >
            <span>{icon}</span>
            {label}
          </span>
        ))}
      </div>
    </header>
  );
}
