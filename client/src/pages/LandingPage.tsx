import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp, Map, AlertTriangle, Heart, ArrowRight,
  CheckCircle, ChevronRight,
} from 'lucide-react';
import { useUiStore } from '../stores/uiStore';

// ── Favicon-matching logo ────────────────────────────────────────────────
function PeLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="#0a1929" />
      <path d="M16 6L4 16h4v10h16V16h4L16 6z" fill="#00D9FF" />
      <circle cx="16" cy="19" r="3" fill="#0a1929" />
    </svg>
  );
}

const PILLARS = [
  {
    icon: TrendingUp,
    title: 'Value',
    desc: 'See whether the asking price looks fair, stretched, or promising.',
    color: 'text-cyan',
    bg: 'bg-cyan/10 border-cyan/20',
  },
  {
    icon: Map,
    title: 'Neighbourhood',
    desc: 'Understand what the area is actually like around the property.',
    color: 'text-gold',
    bg: 'bg-gold/10 border-gold/20',
  },
  {
    icon: AlertTriangle,
    title: 'Risks',
    desc: 'Spot the issues worth checking before you commit.',
    color: 'text-pe-red',
    bg: 'bg-pe-red/10 border-pe-red/20',
  },
  {
    icon: Heart,
    title: 'Fit',
    desc: 'See whether the home matches your priorities, not just the market.',
    color: 'text-pe-green',
    bg: 'bg-pe-green/10 border-pe-green/20',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Paste a listing',
    body: 'Start with a property URL from Rightmove, Zoopla, or OnTheMarket — or fill in the details yourself.',
  },
  {
    n: '02',
    title: 'Get a decision-ready report',
    body: 'Review price, place, risk, and fit in one clear view.',
  },
  {
    n: '03',
    title: 'Decide with confidence',
    body: 'Shortlist, compare, or move on with clearer reasoning.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { setDemoMode } = useUiStore();

  return (
    <div className="min-h-screen bg-navy">

      {/* ── Navigation — fixed ─────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-navy-border bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5">
            <PeLogo size={28} />
            <span className="font-bold text-charcoal text-sm tracking-tight">
              Property<span className="text-cyan">Edge</span>
            </span>
          </Link>

          {/* Nav links */}
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

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="pt-14">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">

          {/* Left — copy */}
          <div>
            {/* Category badge */}
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-cyan/10 border border-cyan/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
              <span className="text-xs font-semibold text-cyan tracking-wide">
                Buyer-side intelligence for UK homebuyers
              </span>
            </div>

            <h1 className="text-4xl sm:text-[2.75rem] font-extrabold text-charcoal leading-tight mb-5">
              Know if it's worth it —{' '}
              <span className="text-cyan">and right for your life.</span>
            </h1>

            <p className="text-base text-navy-300 leading-relaxed mb-8 max-w-md">
              Paste a property listing and get a clear view of value, neighbourhood, risks, and fit before you book a viewing.
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
                View sample report
              </Link>
            </div>
          </div>

          {/* Right — sample report preview card */}
          <div className="glass-card rounded-2xl p-5 shadow-card-lg">
            {/* Pill row */}
            <div className="flex flex-wrap gap-2 mb-5">
              {PILLARS.map(({ title, color, bg }) => (
                <span key={title} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${color} ${bg}`}>
                  <CheckCircle size={11} />
                  {title}
                </span>
              ))}
            </div>

            {/* Mock property */}
            <div className="bg-navy-light border border-navy-border rounded-xl p-4 mb-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-sm font-bold text-charcoal leading-tight">3 bed semi-detached</p>
                  <p className="text-xs text-navy-300 mt-0.5">Elm Road, SW12 · £485,000</p>
                </div>
                <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-pe-green/10 border border-pe-green/20 text-pe-green text-xs font-semibold">
                  Good buy
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Value', val: 'Fair price',  ok: true  },
                  { label: 'Neighbourhood', val: 'Good area', ok: true  },
                  { label: 'Risks', val: '2 flagged',  ok: false },
                  { label: 'Fit score', val: '78 / 100', ok: true  },
                ].map(({ label, val, ok }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <CheckCircle size={12} className={ok ? 'text-pe-green' : 'text-gold'} />
                    <span className="text-xs text-navy-300">{label}: <span className="font-medium text-charcoal">{val}</span></span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setDemoMode(true); navigate('/analyse'); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-charcoal text-white text-sm font-semibold hover:bg-charcoal-800 transition-colors"
            >
              View full sample report <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Dark stats bar ─────────────────────────────────────────────── */}
      <div className="dark-band">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 'Value',        label: 'Is it priced right?' },
            { value: 'Neighbourhood',label: 'Is the area right?' },
            { value: 'Risks',        label: 'What should I check?' },
            { value: 'Fit',          label: 'Is it right for my life?' },
          ].map(({ value, label }) => (
            <div key={value} className="border-r border-white/10 last:border-0 pr-8 last:pr-0">
              <p className="text-xl font-extrabold text-cyan mb-1">{value}</p>
              <p className="text-sm text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem statement ──────────────────────────────────────────── */}
      <section className="bg-white border-y border-navy-border">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-extrabold text-charcoal mb-5 leading-tight">
            Listings tell you what's for sale.<br />
            They don't tell you what it means.
          </h2>
          <p className="text-base text-navy-300 leading-relaxed max-w-xl mx-auto">
            A home can look great on paper and still be overpriced, poorly connected, risky, or wrong for your lifestyle. PropertyEdge brings the key signals together so you can make a better call faster.
          </p>
        </div>
      </section>

      {/* ── Four pillars ───────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-4 h-px bg-cyan" />
            <span className="text-xs font-semibold tracking-widest uppercase text-cyan">What's in a report</span>
            <div className="w-4 h-px bg-cyan" />
          </div>
          <h2 className="text-3xl font-extrabold text-charcoal">
            Everything you need to judge a property in one place.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PILLARS.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="glass-card rounded-2xl p-5 hover:shadow-card-hover transition-shadow">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${bg}`}>
                <Icon size={18} className={color} />
              </div>
              <h3 className="text-base font-bold text-charcoal mb-2">{title}</h3>
              <p className="text-sm text-navy-300 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section className="bg-white border-y border-navy-border">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-4 h-px bg-cyan" />
              <span className="text-xs font-semibold tracking-widest uppercase text-cyan">Simple process</span>
              <div className="w-4 h-px bg-cyan" />
            </div>
            <h2 className="text-3xl font-extrabold text-charcoal">How PropertyEdge works</h2>
          </div>
          <div className="space-y-8">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="flex items-start gap-5">
                <div className="w-10 h-10 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan text-sm font-bold">{n}</span>
                </div>
                <div className="pt-1.5">
                  <p className="text-base font-bold text-charcoal mb-1">{title}</p>
                  <p className="text-sm text-navy-300 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing section ────────────────────────────────────────────── */}
      <div className="dark-band">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Less guesswork. Better decisions.
          </h2>
          <p className="text-white/60 text-base mb-8 max-w-xl mx-auto leading-relaxed">
            PropertyEdge helps you spend less time piecing together portals, maps, and scattered research — and more time focusing on homes actually worth pursuing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/analyse"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-cyan text-white font-bold text-sm hover:bg-cyan-dark transition-colors"
            >
              Analyse a property <ArrowRight size={16} />
            </Link>
            <Link
              to="/analyse"
              onClick={() => setDemoMode(true)}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl border border-white/20 text-white font-medium text-sm hover:bg-white/10 transition-colors"
            >
              View sample report
            </Link>
          </div>
          <p className="text-white/30 text-xs mt-5">No account required to get started.</p>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-navy-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-navy-300">
          <div className="flex items-center gap-2.5">
            <PeLogo size={20} />
            <span className="font-semibold text-charcoal">PropertyEdge</span>
            <span>© 2025</span>
          </div>
          <div className="flex items-center gap-4 text-center sm:text-right">
            <Link to="/privacy" className="hover:text-charcoal transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-charcoal transition-colors">Terms of Service</Link>
            <span className="hidden sm:block max-w-xs">Not financial or legal advice. Always take independent professional advice before exchanging contracts.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
