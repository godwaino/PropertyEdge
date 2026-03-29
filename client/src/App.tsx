import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LandingPage } from './pages/LandingPage';
import { AnalysePage } from './pages/AnalysePage';
import { ReportPage } from './pages/ReportPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { useUiStore } from './stores/uiStore';
import { checkHealth } from './api/analyse';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AppInit() {
  const { setApiKeyConfigured, setDemoMode } = useUiStore();

  useEffect(() => {
    checkHealth()
      .then(({ apiKeyConfigured }) => {
        setApiKeyConfigured(apiKeyConfigured);
        if (!apiKeyConfigured) setDemoMode(true);
      })
      .catch(() => {
        setDemoMode(true);
      });
  }, []);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInit />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analyse" element={<AnalysePage />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/workspace/compare" element={<WorkspacePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
