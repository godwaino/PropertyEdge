import { Link } from 'react-router-dom';
import { TrendingUp, Map, BarChart2, CheckCircle, Layers, ArrowRight } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';

const PILLARS = [
  {
    icon: TrendingUp,
    title: 'AI Valuation',
    description: 'Fair value range backed by Land Registry comparables. Know if the price is justified.',
  },
  {
    icon: Map,
    title: 'Neighbourhood Intel',
    description: 'Crime context, flood risk, schools, commute, and area character — all in one view.',
  },
  {
    icon: BarChart2,
    title: 'Decision Score',
    description: 'A single verdict derived from valuation, location, risk, and your personal priorities.',
  },
];

const STATS = [
  { value: '2,400+', label: 'Properties analysed' },
  { value: '94%',   label: 'Valuation accuracy' },
  { value: '150+',  label: 'UK postcodes' },
  { value: '< 30s', label: 'Avg. analysis time' },
];

const RECENT = [
  { label: '3 bed terraced — SW1A 2AA',  sub: 'Listed · £485,000',  price: '£471k–£499k', dot: 'bg-pe-green' },
  { label: '2 bed flat — EC1A 1BB',       sub: 'Listed · £310,000',  price: '£298k–£322k', dot: 'bg-gold' },
  { label: '4 bed detached — M1 1AE',     sub: 'Listed · £620,000',  price: '£589k–£641k', dot: 'bg-pe-green' },
];

const HOW = [
  { step: '01', label: 'Paste a Rightmove, Zoopla, or OnTheMarket URL — or fill in the details manually.' },
  { step: '02', label: 'PropertyEdge pulls live market data and runs AI analysis against UK benchmarks.' },
  { step: '03', label: 'Receive a decision-ready report with valuation, risks, and a clear verdict.' },
];

const QUESTIONS = [
  'Is this property overpriced, fair, or undervalued?',
  'What is it like to live here day-to-day?',
  'What risks or hidden costs am I missing?',
  'How does it compare with other properties I\'m considering?',
  'What should I do next?',
];

export function LandingPage() {
  const { setDemoMode } = useUiStore();

  return (
    <div className="min-h-screen bg-navy overflow-x-hidden">

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <header className="border-b border-navy-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center">
              <Layers size={14} className="text-cyan" />
            </div>
            <span className="font-semibold text-charcoal text-sm">
              Property<span className="text-cyan">Edge</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-navy-300">
            <Link to="/analyse" className="hover:text-charcoal transition-colors">Analyse</Link>
            <Link to="/workspace" className="hover:text-charcoal transition-colors">Workspace</Link>
            <Link to="/signin" className="hover:text-charcoal transition-colors">Sign in</Link>
          </nav>

          <Link
            to="/analyse"
            className="px-4 py-2 rounded-lg bg-charcoal text-white text-sm font-semibold hover:bg-charcoal-800 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        {/* Left */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-5 h-px bg-cyan" />
            <span className="text-xs font-semibold tracking-widest uppercase text-cyan">
              UK's smartest property platform
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-charcoal leading-tight mb-5">
            Know before<br />
            <span className="text-cyan">you offer.</span>
          </h1>

          <p className="text-base text-navy-300 leading-relaxed mb-8 max-w-md">
            Paste a Rightmove or Zoopla listing and get a decision-ready report — AI valuation, neighbourhood intelligence, risk analysis, and a clear verdict in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/analyse"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-charcoal text-white font-semibold text-sm hover:bg-charcoal-800 transition-colors"
            >
              Analyse a property <ArrowRight size={15} />
            </Link>
            <Link
              to="/analyse"
              onClick={() => setDemoMode(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-navy-border text-charcoal font-medium text-sm hover:bg-navy-light transition-colors"
            >
              Try a demo
            </Link>
          </div>
        </div>

        {/* Right — stats card (CareBirds-style) */}
        <div className="glass-card rounded-2xl p-6 shadow-card-lg">
          {/* Metric grid */}
          <p className="text-[10px] font-semibold tracking-widest uppercase text-navy-300 mb-4">
            Live on platform
          </p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {STATS.map(({ value, label }) => (
              <div key={label} className="bg-navy-light rounded-xl p-3">
                <p className="text-xl font-extrabold text-charcoal leading-none mb-1">{value}</p>
                <p className="text-xs text-navy-300">{label}</p>
              </div>
            ))}
          </div>

          {/* Recent analyses */}
          <p className="text-[10px] font-semibold tracking-widest uppercase text-navy-300 mb-3">
            Recent analyses
          </p>
          <div className="space-y-2.5 mb-4">
            {RECENT.map(({ label, sub, price, dot }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                  <div>
                    <p className="text-sm font-medium text-charcoal leading-none">{label}</p>
                    <p className="text-xs text-navy-300 mt-0.5">{sub}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-cyan">{price}</span>
              </div>
            ))}
          </div>

          <Link
            to="/analyse"
            className="block w-full text-center py-2.5 rounded-xl bg-cyan text-white text-sm font-semibold hover:bg-cyan-dark transition-colors"
          >
            View all analyses →
          </Link>
        </div>
      </section>

      {/* ── Dark stats bar ──────────────────────────────────────────────── */}
      <div className="dark-band">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '2,400+', label: 'Properties analysed' },
            { value: '94%',    label: 'Valuation accuracy' },
            { value: '< 30s',  label: 'Avg. analysis time' },
            { value: '5 min',  label: 'Time to first report' },
          ].map(({ value, label }) => (
            <div key={label} className="border-r border-white/10 last:border-0 pr-8 last:pr-0">
              <p className="text-3xl font-extrabold text-white mb-1">{value}</p>
              <p className="text-sm text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pillars ─────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-4 h-px bg-cyan" />
            <span className="text-xs font-semibold tracking-widest uppercase text-cyan">What you get</span>
            <div className="w-4 h-px bg-cyan" />
          </div>
          <h2 className="text-3xl font-extrabold text-charcoal">Everything in one report</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PILLARS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="glass-card rounded-2xl p-6 hover:shadow-card-hover transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center mb-4">
                <Icon size={18} className="text-cyan" />
              </div>
              <h3 className="text-base font-bold text-charcoal mb-2">{title}</h3>
              <p className="text-sm text-navy-300 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-navy-border">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-4 h-px bg-cyan" />
              <span className="text-xs font-semibold tracking-widest uppercase text-cyan">Simple process</span>
              <div className="w-4 h-px bg-cyan" />
            </div>
            <h2 className="text-3xl font-extrabold text-charcoal">How it works</h2>
          </div>
          <div className="space-y-8">
            {HOW.map(({ step, label }) => (
              <div key={step} className="flex items-start gap-5">
                <div className="w-10 h-10 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan text-sm font-bold">{step}</span>
                </div>
                <p className="text-base text-charcoal-600 leading-relaxed pt-2">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Five questions ───────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="glass-card rounded-2xl p-8 md:p-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-4 h-px bg-cyan" />
            <span className="text-xs font-semibold tracking-widest uppercase text-cyan">
              The five questions that matter
            </span>
          </div>
          <div className="space-y-4">
            {QUESTIONS.map((q, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle size={16} className="text-cyan flex-shrink-0 mt-0.5" />
                <p className="text-sm text-charcoal-600 leading-relaxed">{q}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <div className="dark-band">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3">Ready to make a better decision?</h2>
          <p className="text-white/60 mb-8 text-base">No account required. Your first report is free.</p>
          <Link
            to="/analyse"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-cyan text-white font-bold text-base hover:bg-cyan-dark transition-colors"
          >
            Analyse your first property <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-navy-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-navy-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-cyan/10 border border-cyan/20 flex items-center justify-center">
              <Layers size={10} className="text-cyan" />
            </div>
            <span className="font-medium text-charcoal">PropertyEdge</span>
            <span>© 2025</span>
          </div>
          <span className="text-center sm:text-right max-w-sm">
            Not financial or legal advice. Always take independent professional advice before exchanging contracts.
          </span>
        </div>
      </footer>
    </div>
  );
}
