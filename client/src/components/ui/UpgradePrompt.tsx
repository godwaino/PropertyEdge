import { Lock } from 'lucide-react';

interface Props {
  feature: string;
  plan?: 'paid' | 'pro';
}

export function UpgradePrompt({ feature, plan = 'paid' }: Props) {
  return (
    <div className="rounded-xl border border-gold/20 bg-gold/5 p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
        <Lock size={18} className="text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-charcoal">{feature}</p>
        <p className="text-xs text-navy-300 mt-0.5">
          Available on the {plan === 'pro' ? 'Pro' : 'Paid'} plan
        </p>
      </div>
      <button className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-gold text-xs font-semibold hover:bg-gold/20 transition-colors">
        Upgrade
      </button>
    </div>
  );
}
