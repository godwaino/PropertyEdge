import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Chrome, Layers } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export function SignInPage() {
  const navigate = useNavigate();
  const { user, loading, error, signIn, signInWithGoogle, clearError, isFirebaseConfigured } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (user) navigate('/workspace', { replace: true }); }, [user, navigate]);
  useEffect(() => { clearError(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate('/workspace', { replace: true });
    } catch { /* error set in store */ } finally { setSubmitting(false); }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate('/workspace', { replace: true });
    } catch { /* error set in store */ } finally { setSubmitting(false); }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-card rounded-2xl p-8 text-center">
          <LogIn size={32} className="text-navy-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-charcoal mb-2">Authentication unavailable</h1>
          <p className="text-sm text-navy-300 mb-6">
            Firebase is not configured in this environment. Sign in requires Firebase credentials.
          </p>
          <Link to="/" className="text-sm text-cyan hover:underline">← Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/30 flex items-center justify-center">
              <Layers size={16} className="text-cyan" />
            </div>
            <span className="text-lg font-bold text-charcoal">
              Property<span className="text-cyan">Edge</span>
            </span>
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-charcoal mb-1">Welcome back</h1>
          <p className="text-sm text-navy-300 mb-6">Sign in to access your property workspace</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-pe-red/10 border border-pe-red/20 text-sm text-pe-red">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-charcoal mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-navy-light border border-navy-border rounded-xl text-sm text-charcoal placeholder-navy-300/60 focus:outline-none focus:border-cyan transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-navy-light border border-navy-border rounded-xl text-sm text-charcoal placeholder-navy-300/60 focus:outline-none focus:border-cyan transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-charcoal text-white font-semibold text-sm hover:bg-charcoal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn size={14} />
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-navy-border" />
            <span className="text-xs text-navy-300">or</span>
            <div className="flex-1 h-px bg-navy-border" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-navy-border text-sm text-charcoal hover:bg-navy-light transition-colors disabled:opacity-50"
          >
            <Chrome size={14} />
            Continue with Google
          </button>

          <p className="text-center text-xs text-navy-300 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-cyan hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
