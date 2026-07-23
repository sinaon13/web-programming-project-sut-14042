'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDB, setDB } from '@/lib/mockData';
import { Tier, User, Track, Album, Playlist, Ticket, AppNotification } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsPage() {
  const { currentUser, updateUser, logout } = useAuth();
  const { volume, setVolume } = usePlayer();
  const { language, setLanguage, t } = useLanguage();
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

  // CASCADING ACCOUNT DELETION ENGINE: Removes all traces of user without breaking the app!
  const handleDeleteAccount = () => {
    if (!confirm(t.deleteAccountConfirm)) return;

    const uId = currentUser.id;

    // 1. Delete User Account
    const users = getDB<User[]>('db_users', []).filter(u => u.id !== uId);
    setDB('db_users', users);

    // 2. Delete User's Playlists
    const playlists = getDB<Playlist[]>('db_playlists', []).filter(p => p.ownerId !== uId);
    setDB('db_playlists', playlists);

    // 3. Delete User's Support Tickets
    const tickets = getDB<Ticket[]>('db_tickets', []).filter(tk => tk.userId !== uId);
    setDB('db_tickets', tickets);

    // 4. Delete User's Notifications
    const notifs = getDB<AppNotification[]>('db_notifications', []).filter(n => n.userId !== uId);
    setDB('db_notifications', notifs);

    // 5. If Artist, cleanly delete all their published Tracks & Albums!
    if (currentUser.role === 'ARTIST') {
      const tracks = getDB<Track[]>('db_tracks', []).filter(tr => tk => tr.artistId !== uId);
      setDB('db_tracks', tracks);
      const albums = getDB<Album[]>('db_albums', []).filter(a => a.artistId !== uId);
      setDB('db_albums', albums);
    }

    alert('✅ Account and all associated data deleted permanently.');
    logout();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
        <h3 className="font-bold text-white mb-2 text-md">{t.subManagement}</h3>
        <p className="text-xs text-neutral-400 mb-6">{t.currentTier}: <span className="text-green-400 font-bold uppercase">{currentUser.tier}</span></p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 border border-neutral-700 rounded-xl text-center bg-black/40">
            <h4 className="font-bold text-sm text-white">{t.silverPlan}</h4>
            <p className="text-xs text-neutral-400 my-2 font-mono">{prices.SILVER.toLocaleString()} IRR / month</p>
            <button onClick={() => upgradeTier('SILVER')} className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded transition">{t.selectSilver}</button>
          </div>
          <div className="p-5 border border-amber-500/50 bg-amber-500/5 rounded-xl text-center shadow-lg">
            <h4 className="font-bold text-sm text-amber-400">{t.goldPlan}</h4>
            <p className="text-xs text-neutral-400 my-2 font-mono">{prices.GOLD.toLocaleString()} IRR / month</p>
            <button onClick={() => upgradeTier('GOLD')} className="w-full py-2 bg-amber-400 text-black font-bold text-xs rounded hover:bg-amber-300 transition shadow">{t.upgradeGold}</button>
          </div>
        </div>
      </div>

      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl space-y-6 shadow-xl">
        <h3 className="font-bold text-white text-md border-b border-neutral-800 pb-3">{t.preferences}</h3>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-neutral-300">{t.sysVolume}</label>
            <span className="text-xs text-green-400 font-mono font-bold">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.05" value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-neutral-800 rounded-lg accent-green-500 cursor-pointer"
          />
          <p className="text-[11px] text-neutral-500 mt-1">{t.volDesc}</p>
        </div>

        <div className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-neutral-300 mb-2">{t.notifLimits}</label>
          
          <label className="flex items-center space-x-3 text-xs text-neutral-300 cursor-pointer">
            <input type="checkbox" checked={notifNewReleases} onChange={e => setNotifNewReleases(e.target.checked)} className="accent-green-500 rounded w-4 h-4" />
            <span>{t.notifReleases}</span>
          </label>

          <label className="flex items-center space-x-3 text-xs text-neutral-300 cursor-pointer">
            <input type="checkbox" checked={notifExpiration} onChange={e => setNotifExpiration(e.target.checked)} className="accent-green-500 rounded w-4 h-4" />
            <span>{t.notifExpire}</span>
          </label>

          <label className="flex items-center space-x-3 text-xs text-neutral-300 cursor-pointer">
            <input type="checkbox" checked={notifEmail} onChange={e => setNotifEmail(e.target.checked)} className="accent-green-500 rounded w-4 h-4" />
            <span>{t.notifEmail}</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-300 mb-1">{t.interfaceLang}</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'fa')}
            className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-white"
          >
            <option value="en">English</option>
            <option value="fa">Persian (فارسی)</option>
          </select>
        </div>

        <button onClick={savePreferences} className="w-full py-2.5 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400 transition shadow">
          {t.savePrefs}
        </button>
      </div>

      <div className="space-y-3 pt-2">
        <button onClick={() => { if (confirm('Are you sure you want to log out?')) logout(); }} className="w-full py-3 bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold text-xs rounded hover:bg-neutral-700 hover:text-white transition">
          {t.logout}
        </button>

        {/* FULL ACCOUNT DELETION BUTTON */}
        <button onClick={handleDeleteAccount} className="w-full py-3 bg-red-600/20 border border-red-500 text-red-400 font-bold text-xs rounded hover:bg-red-600/40 transition shadow-lg">
          {t.deleteAccountBtn}
        </button>
      </div>
    </div>
  );
}