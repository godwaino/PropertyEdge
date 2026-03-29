import type { ReactNode } from 'react';
import { TopBar } from './TopBar';

interface Props {
  children: ReactNode;
  fullWidth?: boolean;
  noPad?: boolean;
}

export function AppShell({ children, fullWidth = false, noPad = false }: Props) {
  return (
    <div className="min-h-screen bg-navy">
      <TopBar />
      <main className={`pt-14 ${noPad ? '' : 'px-4 py-6'} ${fullWidth ? '' : 'max-w-7xl mx-auto'}`}>
        {children}
      </main>
    </div>
  );
}
