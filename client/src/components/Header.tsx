import { Building2, Zap } from 'lucide-react';

export default function Header() {
  return (
    <header className="w-full py-6 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan to-cyan-dark flex items-center justify-center glow-cyan">
              <Building2 className="w-7 h-7 text-navy" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-white">Property</span>
              <span className="text-cyan"> Edge</span>
              <span className="text-gold"> AI</span>
            </h1>
            <p className="text-xs text-gray-400 tracking-widest uppercase">
              UK Property Intelligence
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full glass-card">
          <Zap className="w-4 h-4 text-gold" />
          <span className="text-sm text-gray-300">Powered by Claude AI</span>
        </div>
      </div>
    </header>
  );
}
