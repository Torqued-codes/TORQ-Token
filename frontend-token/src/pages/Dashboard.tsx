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
      // wallet may still be initializing right after signup - harmless
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
    <div className="relative min-h-screen flex flex-col bg-charcoal-950 overflow-hidden">
      <div className="bg-token-drift animate-drift-rotate opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-charcoal-950/60 to-charcoal-950 pointer-events-none" />

      <div className="relative z-10 flex flex-col flex-1">
        <Header address={address} balance={balance} />

        <main className="flex-1 safe-x safe-bottom max-w-2xl w-full mx-auto py-6 space-y-6">
          <div className="text-center glass-card rounded-2xl p-6">
            <p className="text-metal-400 text-sm tracking-wide uppercase">Total Balance</p>
            <p className="text-4xl font-bold text-metal-300 mt-1">
              {balance ? Number(balance).toFixed(4) : '0.0000'} TQ
            </p>
            <p className="text-xs text-metal-400/70 mt-2 truncate-hash">Wallet: {address || '...'}</p>
          </div>

          <div className="flex rounded-xl glass-card p-1 gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  tab === t.key
                    ? 'bg-gradient-to-r from-accent-600 to-accent-400 text-white shadow-md shadow-accent-600/20'
                    : 'text-metal-400 hover:text-white'
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
    </div>
  );
}


