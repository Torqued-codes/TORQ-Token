import { useEffect, useState } from 'react';
import { getHistory, HistoryEntry } from '../lib/api';

const TYPE_STYLES: Record<HistoryEntry['type'], { icon: string; label: string; color: string; sign: string }> = {
  mined: { icon: '⛏️', label: 'Mining Reward', color: 'text-orange-400', sign: '+' },
  received: { icon: '↙', label: 'Received', color: 'text-emerald-400', sign: '+' },
  sent: { icon: '↗', label: 'Sent', color: 'text-red-400', sign: '-' },
};

function shorten(addr: string | null) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function TransactionHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHistory()
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl mb-3">
          🕐
        </div>
        <h2 className="text-2xl font-bold text-purple-300">Transaction History</h2>
        <p className="text-slate-400 text-sm mt-1">View all your Torq token transactions</p>
      </div>

      {loading && <p className="text-center text-slate-400 py-8">Loading...</p>}
      {error && <p className="text-center text-red-400 py-8">{error}</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="text-center text-slate-500 py-8">No transactions yet</p>
      )}

      <div className="space-y-3">
        {entries.map((entry) => {
          const style = TYPE_STYLES[entry.type];
          return (
            <div key={entry.txHash} className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-full bg-slate-700/60 flex items-center justify-center text-sm">
                    {style.icon}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold ${style.color}`}>{style.label}</p>
                    {entry.counterparty && (
                      <p className="text-xs text-slate-400 truncate-hash">
                        {entry.type === 'sent' ? 'To' : 'From'}: {shorten(entry.counterparty)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${style.color} whitespace-nowrap`}>
                    {style.sign}
                    {Number(entry.amount).toFixed(4)} TQ
                  </p>
                  <p className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(entry.timestamp * 1000).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-700/40">
                <p className="text-[10px] text-slate-500">Hash:</p>
                <p className="text-xs text-slate-400 truncate-hash font-mono">{entry.txHash}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}