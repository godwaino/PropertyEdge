import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, isConfigured } from '../lib/firebase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isFirebaseConfigured: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initAuth: () => () => void; // returns unsubscribe
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      error: null,
      isFirebaseConfigured: isConfigured,

      initAuth: () => {
        if (!auth) {
          set({ loading: false });
          return () => {};
        }
        const unsub = onAuthStateChanged(auth, (user) => {
          set({ user, loading: false });
        });
        return unsub;
      },

      signIn: async (email, password) => {
        if (!auth) { set({ error: 'Firebase not configured' }); return; }
        set({ error: null, loading: true });
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (e: unknown) {
          set({ error: friendlyAuthError(e), loading: false });
          throw e;
        }
      },

      signUp: async (email, password) => {
        if (!auth) { set({ error: 'Firebase not configured' }); return; }
        set({ error: null, loading: true });
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (e: unknown) {
          set({ error: friendlyAuthError(e), loading: false });
          throw e;
        }
      },

      signInWithGoogle: async () => {
        if (!auth) { set({ error: 'Firebase not configured' }); return; }
        set({ error: null, loading: true });
        try {
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
        } catch (e: unknown) {
          set({ error: friendlyAuthError(e), loading: false });
          throw e;
        }
      },

      signOut: async () => {
        if (!auth) return;
        await firebaseSignOut(auth);
        set({ user: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'pe-auth',
      // isFirebaseConfigured must never be persisted — it must always reflect
      // the live build-time env vars, not a potentially stale cached value.
      partialize: () => ({}),
    },
  ),
);

function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait before trying again.';
    default:
      return 'Authentication failed. Please try again.';
  }
}
