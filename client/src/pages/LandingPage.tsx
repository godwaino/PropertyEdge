import { Link } from 'react-router-dom';
import { TrendingUp, Map, BarChart2, CheckCircle, Layers, ArrowRight } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';

const PILLARS = [
  {
    icon: TrendingUp,
    title: 'AI Valuation',
    description: 'Fair value range backed by Land Registry comparables. Know if the price is justified.',
    color: 'cyan',
  },
  {
    icon: Map,
    title: 'Neighbourhood Intelligence',
    description: 'Crime context, flood risk, schools, commute, and area character — all in one view.',
    color: 'gold',
  },
  {
    icon: BarChart2,
    title: 'Decision Score',
    description: 'A single verdict derived from valuation, location, risk, and your personal priorities.',
    color: 'pe-green',
  },
];

const HOW = [
  { step: '01', label: 'Paste a listing URL or enter an address' },
  { step: '02', label: 'PropertyEdge pulls real market data and runs AI analysis' },
  { step: '03', label: 'Receive a decision-ready report in seconds' },
];

export function LandingPage() {
  const { setDemoMode } = useUiStore();

  return (
    <div className="min-h-screen bg-navy overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gold/5 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center">
            <Layers size={16} className="text-cyan" />
          </div>
          <span className="font-semibold text-white">Property<span className="text-cyan">Edge</span> AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/analyse" className="text-sm text-navy-300 hover:text-white transition-colors">
            Analyse
          </Link>
          <Link
            to="/analyse"
            className="px-4 py-2 rounded-lg bg-cyan text-navy font-semibold text-sm hover:bg-cyan/90 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 text-center px-6 pt-20 pb-16 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan/10 border border-cyan/20 text-cyan text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
          UK homebuyer intelligence platform
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
          Know before<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan to-cyan/60">
            you offer.
          </span>
        </h1>

        <p className="text-lg text-navy-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Paste a Rightmove or Zoopla listing and get a decision-ready report — AI valuation, neighbourhood intelligence, risk analysis, and a clear verdict.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/analyse"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan text-navy font-semibold hover:bg-cyan/90 transition-colors"
          >
            Analyse a property <ArrowRight size={16} />
          </Link>
          <Link
            to="/analyse"
            onClick={() => setDemoMode(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-navy-border text-white hover:bg-navy-light transition-colors"
          >
            Try demo
          </Link>
        </div>
      </section>

      {/* Pillars */}
      <section className="relative z-10 px-6 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map(({ icon: Icon, title, description, color }) => (
            <div key={title} className="glass-card rounded-2xl border border-navy-border p-6 hover:border-cyan/30 transition-colors">
              <div className={`w-10 h-10 rounded-xl bg-${color}/10 border border-${color}/20 flex items-center justify-center mb-4`}>
                <Icon size={20} className={`text-${color}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-navy-300 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-12">How it works</h2>
        <div className="space-y-6">
          {HOW.map(({ step, label }) => (
            <div key={step} className="flex items-center gap-6">
              <div className="w-10 h-10 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan text-sm font-bold">{step}</span>
              </div>
              <p className="text-base text-navy-300">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What it answers */}
      <section className="relative z-10 px-6 py-16 max-w-4xl mx-auto">
        <div className="glass-card rounded-2xl border border-navy-border p-8 md:p-12">
          <p className="text-xs text-cyan uppercase tracking-wider mb-4">The five questions that matter</p>
          <div className="space-y-3">
            {[
              'Is this property overpriced, fair, or undervalued?',
              'What is it like to live here?',
              'What risks or frictions am I missing?',
              'How does it compare with other properties I\'m considering?',
              'What should I do next?',
            ].map((q, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle size={16} className="text-pe-green flex-shrink-0 mt-0.5" />
                <p className="text-sm text-navy-300">{q}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 text-center px-6 py-20">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to make a better decision?</h2>
        <p className="text-navy-300 mb-8">No account required to get started.</p>
        <Link
          to="/analyse"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-cyan text-navy font-bold text-base hover:bg-cyan/90 transition-colors"
        >
          Analyse your first property <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-navy-border px-6 py-8 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-navy-300">
        <span>© 2025 PropertyEdge AI · UK-first homebuyer intelligence</span>
        <span>Not financial or legal advice. Always take independent professional advice before exchanging contracts.</span>
      </footer>
    </div>
  );
}
