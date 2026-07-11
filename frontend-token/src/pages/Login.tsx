import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TokenBackground from '../components/TokenBackground';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center safe-x safe-top safe-bottom px-4 overflow-hidden">
      <TokenBackground />
      <div className="absolute inset-0 bg-charcoal-950/20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm text-center mb-8">
        <div className="mx-auto w-20 h-20 token-logo mb-5" />
        <h1 className="text-4xl font-bold tracking-tight text-metal-300">Torq</h1>
        <p className="text-sm text-metal-400 mt-2 tracking-wide uppercase">
          Premium Digital Currency Platform
        </p>
      </div>

      <div className="relative z-10 w-full max-w-sm glass-card rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white mb-5">
          {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg bg-charcoal-900/70 border border-charcoal-600 px-4 py-3 text-white placeholder-metal-400/60 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg bg-charcoal-900/70 border border-charcoal-600 px-4 py-3 text-white placeholder-metal-400/60 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-gradient-to-r from-accent-600 to-accent-400 py-3 font-semibold text-white disabled:opacity-50 hover:brightness-110 transition shadow-lg shadow-accent-600/20"
          >
            {busy ? 'Please wait...' : mode === 'signin' ? 'Sign In →' : 'Sign Up →'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="w-full text-center text-sm text-metal-400 hover:text-accent-400 mt-4 transition"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}


