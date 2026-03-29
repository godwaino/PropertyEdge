import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

export function SectionHeader({ title, subtitle, badge, action, icon }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center text-cyan flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="text-sm text-navy-300 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
