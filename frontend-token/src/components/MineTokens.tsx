import { useEffect, useState } from 'react';
import { mineTokens } from '../lib/api';

interface MineTokensProps {
  cooldownRemaining: number;
  onMined: (newBalance: string) => void;
}

export default function MineTokens({ cooldownRemaining, onMined }: MineTokensProps) {
  const [cooldown, setCooldown] = useState(cooldownRemaining);
  const [mining, setMining] = useState(false);
  const [lastReward, setLastReward] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setCooldown(cooldownRemaining), [cooldownRemaining]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleMine() {
    setMining(true);
    setError(null);
    setLastReward(null);
    try {
      const { reward, balance } = await mineTokens();
      setLastReward(reward);
      onMined(balance);
      setCooldown(10);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMining(false);
    }
  }

  const canMine = cooldown <= 0 && !mining;

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 text-center">
      <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-orange-900/30">
        ⛏️
      </div>
      <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
        Mine Torq Tokens
      </h2>
      <p className="text-slate-400 text-sm mt-1 mb-6">
        Earn TQ tokens by contributing computing power to the network
      </p>

      {lastReward && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 py-2 text-green-400 text-sm font-medium">
          +{Number(lastReward).toFixed(4)} TQ mined!
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 py-2 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 mb-6">
        <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4 text-left">
          <p className="text-xs text-slate-400 flex items-center gap-1">⏱ Cooldown</p>
          <p className="text-2xl font-bold text-white">{cooldown > 0 ? `${cooldown}s` : 'Ready'}</p>
        </div>
      </div>

      <button
        onClick={handleMine}
        disabled={!canMine}
        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-4 font-bold text-white text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
      >
        {mining ? 'Mining...' : canMine ? 'Start Mining' : `Wait ${cooldown}s`}
      </button>

      <p className="text-xs text-slate-500 mt-4">
        Mining rewards: 1 - 100 TQ per successful mine
        <br />
        Cooldown: 10 seconds between mines
      </p>
    </div>
  );
}