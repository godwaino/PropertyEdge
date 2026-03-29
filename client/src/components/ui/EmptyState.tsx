import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-navy-light border border-navy-border flex items-center justify-center text-navy-300 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-navy-300 max-w-xs">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
