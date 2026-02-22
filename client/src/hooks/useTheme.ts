import { useEffect } from 'react';

// App is dark-only — always enforces the dark class.
export function useTheme() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.removeItem('pe-theme');
  }, []);

  return { isDark: true, toggle: () => {} } as const;
}
