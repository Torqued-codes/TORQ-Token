import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
async function authedFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed: ${res.status}`);
  return body;
}

export interface WalletInfo {
  address: string;
  balance: string;
  cooldownRemaining: number;
}

export async function initWallet(): Promise<{ address: string; created: boolean }> {
  return authedFetch('/api/wallet/init', { method: 'POST' });
}

export async function getWallet(): Promise<WalletInfo> {
  return authedFetch('/api/wallet');
}

export async function mineTokens(): Promise<{ txHash: string; reward: string; balance: string }> {
  return authedFetch('/api/mine', { method: 'POST' });
}

export async function sendTokens(to: string, amount: string): Promise<{ txHash: string; balance: string }> {
  return authedFetch('/api/send', { method: 'POST', body: JSON.stringify({ to, amount }) });
}

export interface HistoryEntry {
  type: 'mined' | 'sent' | 'received';
  amount: string;
  counterparty: string | null;
  txHash: string;
  timestamp: number;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const { history } = await authedFetch('/api/history');
  return history;
}