import { apiClient } from './client';
import { useUiStore } from '../stores/uiStore';
import type { FullAnalysisResult } from '../types/analysis';
import type { PropertyInput } from '../types/property';

export async function analyseProperty(property: PropertyInput): Promise<FullAnalysisResult> {
  const { demoMode } = useUiStore.getState();
  const endpoint = demoMode ? '/demo' : '/analyze';
  return apiClient.post<FullAnalysisResult>(endpoint, property);
}

export async function parseListing(url: string): Promise<Partial<PropertyInput>> {
  return apiClient.post<Partial<PropertyInput>>('/parse-listing', { url });
}

export async function checkHealth(): Promise<{ apiKeyConfigured: boolean; status: string }> {
  return apiClient.get('/health');
}
