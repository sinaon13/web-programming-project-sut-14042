'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDB } from '@/lib/mockData';
import { Tier } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';

export default function SettingsPage() {
  const { currentUser, updateUser, logout } = useAuth();
  const { volume, setVolume } = usePlayer();
  const [lang, setLang] = useState('English');
  const [prices, setPrices] = useState({ SILVER: 50000, GOLD: 120000 });
  
  const [notifNewReleases, setNotifNewReleases] = useState(true);
  const [notifExpiration, setNotifExpiration] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  useEffect(() => {
    setPrices(getDB<{ SILVER: number; GOLD: number }>('db_prices', { SILVER: 50000, GOLD: 120000 }));
    const savedVol = localStorage.getItem('sys_default_volume');
    if (savedVol && !isNaN(parseFloat(savedVol))) setVolume(parseFloat(savedVol));
  }, []);

  if (!currentUser) return null;

  const upgradeTier = (target: Tier) => {
    updateUser({ tier: target });
    alert(`Successfully upgraded to ${target}!`);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    localStorage.setItem('sys_default_volume', newVol.toString());
  };

  const savePreferences = () => {
    alert('✅ Platform preferences and notification limitations saved successfully!');
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

      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl space-y-6 shadow-xl">
        {/* FIX: Removed Section text */}
        <h3 className="font-bold text-white text-md border-b border-neutral-800 pb-3">Platform & Audio Preferences</h3>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-neutral-300">Default System Sound Volume</label>
            <span className="text-xs text-green-400 font-mono font-bold">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.05" value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-neutral-800 rounded-lg accent-green-500 cursor-pointer"
          />
          <p className="text-[11px] text-neutral-500 mt-1">Sets the baseline volume across all streaming media and players.</p>
        </div>

        <div className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-neutral-300 mb-2">Notification Limitations</label>
          
          <label className="flex items-center space-x-3 text-xs text-neutral-300 cursor-pointer">
            <input type="checkbox" checked={notifNewReleases} onChange={e => setNotifNewReleases(e.target.checked)} className="accent-green-500 rounded w-4 h-4" />
            <span>Receive alerts for new track releases from followed artists</span>
          </label>

          <label className="flex items-center space-x-3 text-xs text-neutral-300 cursor-pointer">
            <input type="checkbox" checked={notifExpiration} onChange={e => setNotifExpiration(e.target.checked)} className="accent-green-500 rounded w-4 h-4" />
            <span>Receive subscription expiration & renewal warnings</span>
          </label>

          <label className="flex items-center space-x-3 text-xs text-neutral-300 cursor-pointer">
            <input type="checkbox" checked={notifEmail} onChange={e => setNotifEmail(e.target.checked)} className="accent-green-500 rounded w-4 h-4" />
            <span>Send system notifications directly to my registered email</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-300 mb-1">Interface Language</label>
          <select value={lang} onChange={e => setLang(e.target.value)} className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-white">
            <option>English</option>
            <option>Persian (فارسی)</option>
          </select>
        </div>

        <button onClick={savePreferences} className="w-full py-2.5 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400 transition shadow">
          Save All Preferences
        </button>
      </div>

      <button onClick={() => { if (confirm('Are you sure you want to log out?')) logout(); }} className="w-full py-3 bg-red-600/20 border border-red-500 text-red-400 font-bold text-xs rounded hover:bg-red-600/30 transition">
        Log Out of Account
      </button>
    </div>
  );
}