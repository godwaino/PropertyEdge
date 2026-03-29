import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LandingPage } from './pages/LandingPage';
import { AnalysePage } from './pages/AnalysePage';
import { ReportPage } from './pages/ReportPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { ProfilePage } from './pages/ProfilePage';
import { PrivacyPage, TermsPage } from './pages/PolicyPages';
import { useUiStore } from './stores/uiStore';
import { useAuthStore } from './stores/authStore';
import { checkHealth } from './api/analyse';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AppInit() {
  const { setApiKeyConfigured, setDemoMode } = useUiStore();
  const { initAuth } = useAuthStore();

  useEffect(() => {
    // Bootstrap Firebase auth listener
    const unsubscribe = initAuth();
    return unsubscribe;
  }, []);

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
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
