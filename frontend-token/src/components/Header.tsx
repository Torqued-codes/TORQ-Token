import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';

interface HeaderProps {
  address: string | null;
  balance: string | null;
}

export default function Header({ address, balance }: HeaderProps) {
  const { profile } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const initials = (profile?.display_name || 'T').slice(0, 1).toUpperCase();

  return (
    <>
      <header className="safe-top safe-x sticky top-0 z-30 border-b border-charcoal-700/60 bg-charcoal-950/80 backdrop-blur-xl">
        <div className="flex items-center justify-between py-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 token-logo" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-metal-300 leading-tight tracking-tight">Torq</h1>
              <p className="text-xs text-metal-400 truncate-hash">
                {balance ? `${Number(balance).toFixed(4)} TQ` : '—'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowProfile(true)}
            className="shrink-0 w-10 h-10 rounded-full bg-charcoal-800 border border-charcoal-600 flex items-center justify-center font-semibold text-accent-400 hover:border-accent-500 hover:shadow-lg hover:shadow-accent-600/20 transition"
            aria-label="Open profile"
          >
            {initials}
          </button>
        </div>
      </header>

      {showProfile && <ProfileModal address={address} onClose={() => setShowProfile(false)} />}
    </>
  );
}