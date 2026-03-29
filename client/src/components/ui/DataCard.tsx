import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function DataCard({ children, className = '', padding = 'md' }: Props) {
  const p = padding === 'none' ? '' : padding === 'sm' ? 'p-4' : padding === 'lg' ? 'p-8' : 'p-6';
  return (
    <div className={`glass-card rounded-2xl border border-navy-border ${p} ${className}`}>
      {children}
    </div>
  );
}
