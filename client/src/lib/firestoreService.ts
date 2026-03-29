import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import type { FullAnalysisResult } from '../types/analysis';
import type { PropertyInput } from '../types/property';

export interface SavedReport {
  analysisId: string;
  result: FullAnalysisResult;
  property: PropertyInput;
  savedAt: string;
}

function reportsCol(uid: string) {
  return collection(db!, 'users', uid, 'reports');
}

export async function saveReport(
  uid: string,
  entry: { result: FullAnalysisResult; property: PropertyInput },
): Promise<void> {
  if (!db) return;
  const id = entry.result.analysisId;
  const payload: SavedReport = {
    analysisId: id,
    result: entry.result,
    property: entry.property,
    savedAt: new Date().toISOString(),
  };
  await setDoc(doc(reportsCol(uid), id), payload);
}

export async function loadReport(
  uid: string,
  analysisId: string,
): Promise<{ result: FullAnalysisResult; property: PropertyInput } | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(reportsCol(uid), analysisId));
    if (!snap.exists()) return null;
    const data = snap.data() as SavedReport;
    return { result: data.result, property: data.property };
  } catch {
    return null;
  }
}

export async function listReports(uid: string): Promise<SavedReport[]> {
  if (!db) return [];
  try {
    const q = query(reportsCol(uid), orderBy('savedAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as SavedReport);
  } catch {
    return [];
  }
}

export async function deleteReport(uid: string, analysisId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(reportsCol(uid), analysisId));
}
