import { FlaskConical, X } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';

export function DemoModeBanner() {
  const { demoMode, setDemoMode } = useUiStore();
  if (!demoMode) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gold/10 border border-gold/30 text-sm">
      <FlaskConical size={16} className="text-gold flex-shrink-0" />
      <p className="text-gold flex-1">
        Demo mode — analysis uses example data, not live market information.
      </p>
      <button
        onClick={() => setDemoMode(false)}
        className="flex-shrink-0 text-gold/60 hover:text-gold transition-colors"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
