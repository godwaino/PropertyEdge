import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, Save, RotateCcw, ChevronLeft, Sliders } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { DataCard } from '../components/ui/DataCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useProfileStore, type BuyerProfile } from '../stores/profileStore';

interface WeightSliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}

function WeightSlider({ label, description, value, onChange }: WeightSliderProps) {
  const labels = ['Not important', '', 'Somewhat', '', 'Important', '', 'Very important', '', 'Critical', '', 'Must-have'];

  return (
    <div className="py-4 border-b border-navy-border/50 last:border-0">
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <p className="text-sm font-medium text-charcoal">{label}</p>
          <p className="text-xs text-navy-300">{description}</p>
        </div>
        <span className="text-sm font-semibold text-cyan ml-4 tabular-nums">{value}/10</span>
      </div>
      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 appearance-none rounded-full bg-navy-border cursor-pointer accent-cyan"
        />
        <div className="flex justify-between text-[10px] text-navy-300/60 mt-1">
          <span>0</span>
          <span className="text-center">{labels[value]}</span>
          <span>10</span>
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { profile, updateProfile, resetProfile } = useProfileStore();
  const [saved, setSaved] = useState(false);
  const [local, setLocal] = useState<BuyerProfile>({ ...profile });

  const patch = (p: Partial<BuyerProfile>) => setLocal((prev) => ({ ...prev, ...p }));

  const handleSave = () => {
    updateProfile(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    resetProfile();
    setLocal({ ...useProfileStore.getState().profile });
  };

  const formatBudget = (v: number | null) =>
    v ? `£${(v / 1000).toFixed(0)}k` : '';

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link to="/workspace" className="text-navy-300 hover:text-charcoal transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-charcoal flex items-center gap-2">
              <UserCheck size={20} className="text-cyan" />
              Buyer Profile
            </h1>
            <p className="text-sm text-navy-300 mt-0.5">
              Your preferences power the personalised fit score on every report.
            </p>
          </div>
        </div>

        {/* Budget + requirements */}
        <DataCard>
          <SectionHeader title="Property Requirements" icon={<Sliders size={16} />} />

          <div className="space-y-4 mt-4">
            {/* Max budget */}
            <div>
              <label className="block text-xs font-medium text-navy-300 mb-1.5">
                Maximum budget
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-navy-300">£</span>
                <input
                  type="number"
                  min={50000}
                  step={5000}
                  value={local.budgetMax ?? ''}
                  onChange={(e) =>
                    patch({ budgetMax: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="e.g. 450000"
                  className="flex-1 px-3 py-2.5 bg-navy-light border border-navy-border rounded-xl text-sm text-charcoal placeholder-navy-300/50 focus:outline-none focus:border-cyan/60 transition-colors"
                />
                {local.budgetMax && (
                  <span className="text-sm text-cyan w-16 text-right">
                    {formatBudget(local.budgetMax)}
                  </span>
                )}
              </div>
            </div>

            {/* Min bedrooms */}
            <div>
              <label className="block text-xs font-medium text-navy-300 mb-1.5">
                Minimum bedrooms
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => patch({ minBedrooms: n })}
                    className={`w-10 h-10 rounded-xl border text-sm font-medium transition-colors ${
                      local.minBedrooms === n
                        ? 'bg-cyan border-cyan text-white'
                        : 'border-navy-border text-navy-300 hover:text-charcoal hover:border-cyan/40'
                    }`}
                  >
                    {n}+
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred tenure */}
            <div>
              <label className="block text-xs font-medium text-navy-300 mb-1.5">
                Preferred tenure
              </label>
              <div className="flex gap-2">
                {(['any', 'freehold', 'leasehold'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => patch({ preferredTenure: t })}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium capitalize transition-colors ${
                      local.preferredTenure === t
                        ? 'bg-cyan border-cyan text-white'
                        : 'border-navy-border text-navy-300 hover:text-charcoal hover:border-cyan/40'
                    }`}
                  >
                    {t === 'any' ? 'No preference' : t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DataCard>

        {/* Priority weights */}
        <DataCard>
          <SectionHeader
            title="Priority Weights"
            subtitle="Tell us what matters most to you"
            icon={<Sliders size={16} />}
          />
          <div className="mt-2">
            <WeightSlider
              label="Value for money"
              description="How much does price relative to fair value matter?"
              value={local.weightPrice}
              onChange={(v) => patch({ weightPrice: v })}
            />
            <WeightSlider
              label="Space"
              description="Importance of having enough bedrooms and floor area"
              value={local.weightSpace}
              onChange={(v) => patch({ weightSpace: v })}
            />
            <WeightSlider
              label="Safety"
              description="Crime rates and neighbourhood security"
              value={local.weightLowCrime}
              onChange={(v) => patch({ weightLowCrime: v })}
            />
            <WeightSlider
              label="Flood safety"
              description="How risk-averse are you to flood zones?"
              value={local.weightFloodSafety}
              onChange={(v) => patch({ weightFloodSafety: v })}
            />
            <WeightSlider
              label="Commute"
              description="Transport links and proximity to work/stations"
              value={local.weightCommute}
              onChange={(v) => patch({ weightCommute: v })}
            />
            <WeightSlider
              label="Schools"
              description="Proximity to good-rated schools"
              value={local.weightSchools}
              onChange={(v) => patch({ weightSchools: v })}
            />
            <WeightSlider
              label="Outdoor space"
              description="Green space, parks, and garden"
              value={local.weightOutdoor}
              onChange={(v) => patch({ weightOutdoor: v })}
            />
          </div>
        </DataCard>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-navy-border text-sm text-navy-300 hover:text-charcoal transition-colors"
          >
            <RotateCcw size={14} />
            Reset defaults
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-charcoal text-white hover:bg-charcoal-800'
            }`}
          >
            <Save size={14} />
            {saved ? 'Saved!' : 'Save profile'}
          </button>
        </div>

        <p className="text-xs text-navy-300/60 text-center pb-4">
          Your profile is stored locally in your browser. It is not sent to any server.
        </p>
      </div>
    </AppShell>
  );
}
