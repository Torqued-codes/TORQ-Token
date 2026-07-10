import { useEffect, useState } from 'react';
import Header from '../components/Header';
import MineTokens from '../components/MineTokens';
import SendTokens from '../components/SendTokens';
import TransactionHistory from '../components/TransactionHistory';
import { getWallet } from '../lib/api';

type Tab = 'mine' | 'send' | 'history';
export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('mine');
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  async function loadWallet() {
    try {
      const w = await getWallet();
      setAddress(w.address);
      setBalance(w.balance);
      setCooldown(w.cooldownRemaining);
    } catch {
    }
  }

  useEffect(() => {
    loadWallet();
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'mine', label: 'Mine Tokens' },
    { key: 'send', label: 'Send Tokens' },
    { key: 'history', label: 'History' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header address={address} balance={balance} />

      <main className="flex-1 safe-x safe-bottom max-w-2xl w-full mx-auto py-6 space-y-6">
        <div className="text-center rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6">
          <p className="text-slate-400 text-sm">Total Balance</p>
          <p className="text-4xl font-bold text-purple-300 mt-1">
            {balance ? Number(balance).toFixed(4) : '0.0000'} TQ
          </p>
          <p className="text-xs text-slate-500 mt-2 truncate-hash">Wallet: {address || '...'}</p>
        </div>

        <div className="flex rounded-xl bg-slate-900/60 border border-slate-700/50 p-1 gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'mine' && <MineTokens cooldownRemaining={cooldown} onMined={setBalance} />}
        {tab === 'send' && <SendTokens balance={balance} onSent={setBalance} />}
        {tab === 'history' && <TransactionHistory />}
      </main>
    </div>
  );
}