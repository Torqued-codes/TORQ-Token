import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../lib/supabase';

interface ProfileModalProps {
  address: string | null;
  onClose: () => void;
}

export default function ProfileModal({ address, onClose }: ProfileModalProps) {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ display_name: name });
      await refreshProfile();
    } finally {
      setSaving(false);
    }
  }

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm safe-x">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6 safe-bottom max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold mb-3">
            {(name || 'T').slice(0, 1).toUpperCase()}
          </div>
          <p className="text-slate-400 text-sm truncate-hash max-w-full px-4">{user?.email}</p>
        </div>

        <label className="block text-sm text-slate-400 mb-1">Display Name</label>
        <div className="flex gap-2 mb-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? '...' : 'Save'}
          </button>
        </div>

        <label className="block text-sm text-slate-400 mb-1">Wallet Address</label>
        <button
          onClick={copyAddress}
          className="w-full text-left rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 mb-6 flex items-center justify-between gap-2 hover:border-purple-400 transition"
        >
          <span className="truncate-hash text-slate-200 text-sm font-mono">{address || 'Loading...'}</span>
          <span className="text-xs text-purple-300 shrink-0">{copied ? 'Copied!' : 'Copy'}</span>
        </button>

        <button
          onClick={signOut}
          className="w-full rounded-lg border border-red-500/40 text-red-400 py-3 font-medium hover:bg-red-500/10 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}