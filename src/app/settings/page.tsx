'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDB } from '@/lib/mockData';
import { Tier } from '@/lib/types';

export default function SettingsPage() {
  const { currentUser, updateUser, logout } = useAuth();
  const [lang, setLang] = useState('English');
  const [prices, setPrices] = useState({ SILVER: 50000, GOLD: 120000 });

  useEffect(() => {
    setPrices(getDB<'db_prices', { SILVER: number; GOLD: number }>('db_prices', { SILVER: 50000, GOLD: 120000 }));
  }, []);

  if (!currentUser) return null;

  const upgradeTier = (target: Tier) => {
    updateUser({ tier: target });
    alert(`Successfully upgraded to ${target}!`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
        <h3 className="font-bold text-white mb-2 text-md">Subscription Tier Management</h3>
        <p className="text-xs text-neutral-400 mb-6">Current Active Tier: <span className="text-green-400 font-bold uppercase">{currentUser.tier}</span></p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 border border-neutral-700 rounded-xl text-center bg-black/40">
            <h4 className="font-bold text-sm text-white">Silver Plan</h4>
            <p className="text-xs text-neutral-400 my-2 font-mono">{prices.SILVER.toLocaleString()} IRR / month</p>
            <button onClick={() => upgradeTier('SILVER')} className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded transition">Select Silver</button>
          </div>
          <div className="p-5 border border-amber-500/50 bg-amber-500/5 rounded-xl text-center shadow-lg">
            <h4 className="font-bold text-sm text-amber-400">VIP Gold Plan</h4>
            <p className="text-xs text-neutral-400 my-2 font-mono">{prices.GOLD.toLocaleString()} IRR / month</p>
            <button onClick={() => upgradeTier('GOLD')} className="w-full py-2 bg-amber-400 text-black font-bold text-xs rounded hover:bg-amber-300 transition shadow">Upgrade Gold</button>
          </div>
        </div>
      </div>

      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4 shadow-xl">
        <h3 className="font-bold text-white text-md">Platform Preferences</h3>
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1">Language</label>
          <select value={lang} onChange={e => setLang(e.target.value)} className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-white">
            <option>English</option>
            <option>Persian (فارسی)</option>
          </select>
        </div>
      </div>

      <button onClick={() => { if (confirm('Are you sure you want to log out?')) logout(); }} className="w-full py-3 bg-red-600/20 border border-red-500 text-red-400 font-bold text-xs rounded hover:bg-red-600/30 transition">
        Log Out of Account
      </button>
    </div>
  );
}