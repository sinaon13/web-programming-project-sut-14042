'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authAPI, subscriptionsAPI } from '@/lib/api';
import { Tier } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';
import { BackendOfflineBanner } from '@/components/ui/BackendOfflineBanner';
import { useSearchParams } from 'next/navigation';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-neutral-400">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { currentUser, updateUser, logout } = useAuth();
  const { volume, setVolume } = usePlayer();
  const { language, setLanguage, t } = useLanguage();
  const searchParams = useSearchParams();
  const [prices, setPrices] = useState({ SILVER: 0, GOLD: 0 });
  const [planIds, setPlanIds] = useState<Record<string, number>>({});
  const [backendOffline, setBackendOffline] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<Record<string, number>>({ SILVER: 1, GOLD: 1 });
  const [paymentResult, setPaymentResult] = useState<string | null>(null);
  
  const [notifNewReleases, setNotifNewReleases] = useState(true);
  const [notifExpiration, setNotifExpiration] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await subscriptionsAPI.getPlans();
        const plans = (res as any).results || (Array.isArray(res) ? res : []);
        const silver = plans.find((p: any) => p.tier === 'SILVER');
        const gold = plans.find((p: any) => p.tier === 'GOLD');
        setPrices({
          SILVER: silver?.price || 0,
          GOLD: gold?.price || 0,
        });
        setPlanIds({
          SILVER: silver?.id,
          GOLD: gold?.id,
        });
        setBackendOffline(false);
      } catch (err: any) {
        if (err?.message?.includes("fetch") || err?.message?.includes("Network")) setBackendOffline(true);
      }
    };
    load();
    const savedVol = localStorage.getItem('sys_default_volume');
    if (savedVol && !isNaN(parseFloat(savedVol))) setVolume(parseFloat(savedVol));
  }, []);

  // Handle Zarinpal callback when redirected back from payment gateway
  useEffect(() => {
    const isCallback = searchParams.get('payment') === 'callback';
    const authority = searchParams.get('Authority');
    const status = searchParams.get('Status');

    if (isCallback && authority && status && currentUser) {
      setPaymentProcessing(true);
      const verify = async () => {
        try {
          const res = await subscriptionsAPI.verifyPayment(authority, status);
          setPaymentResult('✅ Payment verified! Your subscription has been activated.');
          // Refresh user data to get updated tier
          const freshUser = await authAPI.getMe();
          updateUser({
            tier: freshUser.tier || currentUser.tier,
          });
        } catch (err: any) {
          setPaymentResult(`❌ Payment verification failed: ${err?.message || 'Unknown error'}`);
        } finally {
          setPaymentProcessing(false);
          // Clean up URL params
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/settings');
          }
        }
      };
      verify();
    }
  }, [searchParams, currentUser]);

  if (!currentUser) return null;

  const handlePurchase = async (tier: 'SILVER' | 'GOLD') => {
    const planId = planIds[tier];
    if (!planId) {
      alert('Plan not found. Is the backend online?');
      return;
    }
    try {
      setPaymentProcessing(true);
      const months = selectedDuration[tier] || 1;
      const res = await subscriptionsAPI.purchase(planId, months);
      const paymentUrl = (res as any).payment_url;
      if (paymentUrl) {
        // Redirect user to Zarinpal sandbox payment page
        window.location.href = paymentUrl;
      } else {
        // Free plan was activated directly
        alert('Plan activated!');
        const freshUser = await authAPI.getMe();
        updateUser({ tier: freshUser.tier || tier });
        setPaymentProcessing(false);
      }
    } catch (err: any) {
      alert(`Purchase failed: ${err?.message || 'Unknown error'}`);
      setPaymentProcessing(false);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    localStorage.setItem('sys_default_volume', newVol.toString());
  };

  const savePreferences = async () => {
    try {
      await authAPI.updatePreferences({
        language,
        volume: Math.round(volume * 100),
        notifications_enabled: notifNewReleases || notifExpiration || notifEmail
      });
      alert('✅ Platform preferences and notification limitations saved successfully!');
    } catch (err: any) {
      alert('Failed to save preferences. Is the backend online?');
    }
  };

  // CASCADING ACCOUNT DELETION ENGINE (Now handled by backend)
  const handleDeleteAccount = async () => {
    if (!confirm(t.deleteAccountConfirm)) return;

    try {
      await authAPI.deleteAccount();
      alert('✅ Account and all associated data deleted permanently.');
      logout();
    } catch (err: any) {
      alert('Failed to delete account. Is the backend offline?');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <BackendOfflineBanner show={backendOffline} />

      {paymentResult && (
        <div className={`p-4 rounded-xl text-sm font-bold border shadow-lg ${
          paymentResult.startsWith('✅')
            ? 'bg-green-500/10 border-green-500/40 text-green-400'
            : 'bg-red-500/10 border-red-500/40 text-red-400'
        }`}>
          {paymentResult}
        </div>
      )}

      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
        <h3 className="font-bold text-white mb-2 text-md">{t.subManagement}</h3>
        <p className="text-xs text-neutral-400 mb-6">{t.currentTier}: <span className="text-green-400 font-bold uppercase">{currentUser.tier}</span></p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 border border-neutral-700 rounded-xl text-center bg-black/40">
            <h4 className="font-bold text-sm text-white">{t.silverPlan}</h4>
            <p className="text-xs text-neutral-400 mt-2 font-mono">{prices.SILVER.toLocaleString()} IRR / month</p>
            <select
              value={selectedDuration.SILVER}
              onChange={e => setSelectedDuration({ ...selectedDuration, SILVER: parseInt(e.target.value) })}
              className="w-full mt-2 mb-3 p-2 bg-neutral-800 border border-neutral-700 rounded text-xs text-white"
            >
              <option value={1}>1 Month ({(prices.SILVER * 1).toLocaleString()} IRR)</option>
              <option value={3}>3 Months ({(prices.SILVER * 3).toLocaleString()} IRR)</option>
              <option value={6}>6 Months ({(prices.SILVER * 6).toLocaleString()} IRR)</option>
              <option value={12}>12 Months ({(prices.SILVER * 12).toLocaleString()} IRR)</option>
            </select>
            <button
              onClick={() => handlePurchase('SILVER')}
              disabled={paymentProcessing}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded transition disabled:opacity-50"
            >
              {paymentProcessing ? 'Processing...' : t.selectSilver}
            </button>
          </div>
          <div className="p-5 border border-amber-500/50 bg-amber-500/5 rounded-xl text-center shadow-lg">
            <h4 className="font-bold text-sm text-amber-400">{t.goldPlan}</h4>
            <p className="text-xs text-neutral-400 mt-2 font-mono">{prices.GOLD.toLocaleString()} IRR / month</p>
            <select
              value={selectedDuration.GOLD}
              onChange={e => setSelectedDuration({ ...selectedDuration, GOLD: parseInt(e.target.value) })}
              className="w-full mt-2 mb-3 p-2 bg-neutral-800 border border-neutral-700 rounded text-xs text-white"
            >
              <option value={1}>1 Month ({(prices.GOLD * 1).toLocaleString()} IRR)</option>
              <option value={3}>3 Months ({(prices.GOLD * 3).toLocaleString()} IRR)</option>
              <option value={6}>6 Months ({(prices.GOLD * 6).toLocaleString()} IRR)</option>
              <option value={12}>12 Months ({(prices.GOLD * 12).toLocaleString()} IRR)</option>
            </select>
            <button
              onClick={() => handlePurchase('GOLD')}
              disabled={paymentProcessing}
              className="w-full py-2 bg-amber-400 text-black font-bold text-xs rounded hover:bg-amber-300 transition shadow disabled:opacity-50"
            >
              {paymentProcessing ? 'Processing...' : t.upgradeGold}
            </button>
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
        <button onClick={handleDeleteAccount} className="w-full py-3 bg-red-600/20 hover:bg-red-600/40 text-red-500 font-bold rounded-xl border border-red-600/30 transition flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          {t.deleteAccountBtn}
        </button>
      </div>
    </div>
  );
}