import { useState } from 'react';
import { sendTokens } from '../lib/api';

interface SendTokensProps {
  balance: string | null;
  onSent: (newBalance: string) => void;
}

export default function SendTokens({ balance, onSent }: SendTokensProps) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const available = balance ? Number(balance) : 0;
  const amountValid = amount && Number(amount) > 0 && Number(amount) <= available;
  const canSend = to.trim().length > 0 && !!amountValid && !sending;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSending(true);
    try {
      const { txHash, balance: newBalance } = await sendTokens(to.trim(), amount);
      setSuccess(`Sent! Tx: ${txHash.slice(0, 10)}...`);
      onSent(newBalance);
      setTo('');
      setAmount('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 text-center">
      <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-emerald-900/30">
        ➤
      </div>
      <h2 className="text-2xl font-bold text-emerald-400">Send Torq Tokens</h2>
      <p className="text-slate-400 text-sm mt-1 mb-6">Transfer TQ tokens to another wallet address</p>

      <form onSubmit={handleSend} className="text-left space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1 font-medium">Recipient Address</label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x1234567890abcdef..."
            className="w-full rounded-lg bg-slate-800/70 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1 font-medium">Amount (TQ)</label>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg bg-slate-800/70 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-xs text-slate-500 mt-1">Available: {available.toFixed(4)} TQ</p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-emerald-400 text-sm">{success}</p>}

        <button
          type="submit"
          disabled={!canSend}
          className="w-full rounded-xl bg-slate-700/60 disabled:bg-slate-700/60 enabled:bg-gradient-to-r enabled:from-emerald-500 enabled:to-teal-500 py-4 font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
        >
          {sending ? 'Sending...' : 'Send Tokens'}
        </button>

        <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1">
          ⚠️ Double-check the recipient address before sending
          <br />
          Transactions are irreversible once confirmed
        </p>
      </form>
    </div>
  );
}