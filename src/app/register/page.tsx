'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Role } from '@/lib/types';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function RegisterPage() {
  const [tab, setTab] = useState<'LISTENER' | 'ARTIST'>('LISTENER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [portfolio, setPortfolio] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t.passwordMinLength);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    if (!policyAccepted) {
      setError(t.acceptPolicy);
      return;
    }
    setLoading(true);
    try {
      await register(name, email, tab as Role, birthDate, gender, tab === 'ARTIST' ? portfolio : undefined, password);
      router.push('/');
    } catch (err: any) {
      const msg = err?.message || 'Registration failed';
      if (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('⚠️ Backend server is not running. Start Django with: uv run python manage.py runserver');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
      <div className="flex border-b border-neutral-800 mb-6">
        <button onClick={() => setTab('LISTENER')} className={`flex-1 pb-3 text-sm font-bold ${tab === 'LISTENER' ? 'text-green-500 border-b-2 border-green-500' : 'text-neutral-500'}`}>{t.listenerAccount}</button>
        <button onClick={() => setTab('ARTIST')} className={`flex-1 pb-3 text-sm font-bold ${tab === 'ARTIST' ? 'text-green-500 border-b-2 border-green-500' : 'text-neutral-500'}`}>{t.artistApplication}</button>
      </div>

      {error && <div className="p-3 mb-4 bg-red-900/40 border border-red-500 text-red-300 text-xs rounded font-medium">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1">{tab === 'ARTIST' ? t.stageArtistName : t.displayName}</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.emailLabel}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.passwordLabel}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.confirmPasswordLabel}</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.birthDate}</label>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-xs text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.genderLabel}</label>
            <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-xs text-white">
              <option value="MALE">{t.male}</option>
              <option value="FEMALE">{t.female}</option>
              <option value="OTHER">{t.other}</option>
            </select>
          </div>
        </div>

        {tab === 'ARTIST' && (
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.portfolioUrl}</label>
            <input type="url" placeholder="https://soundcloud.com/your-track" value={portfolio} onChange={e => setPortfolio(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
          </div>
        )}

        <div className="flex items-center space-x-2 pt-2">
          <input type="checkbox" checked={policyAccepted} onChange={e => setPolicyAccepted(e.target.checked)} className="accent-green-500" />
          <span className="text-xs text-neutral-400">{t.privacyPolicyAgree} <button type="button" onClick={() => setShowPolicyModal(true)} className="text-white underline">{t.privacyPolicy}</button></span>
        </div>

        <button type="submit" disabled={loading} className="w-full py-2.5 bg-green-500 hover:bg-green-400 text-black font-bold rounded text-sm transition mt-2 disabled:opacity-50">{loading ? t.creatingAccount : t.createAccount}</button>
      </form>

      <div className="mt-4 text-center text-xs text-neutral-400">
        {t.alreadyHaveAccount} <Link href="/login" className="text-white hover:underline font-bold">{t.signIn}</Link>
      </div>

      {showPolicyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl max-w-md w-full">
            <h3 className="font-bold text-white mb-2">{t.privacyPolicyTitle}</h3>
            <p className="text-xs text-neutral-300 leading-relaxed mb-6">{t.privacyPolicyText}</p>
            <button onClick={() => setShowPolicyModal(false)} className="w-full py-2 bg-green-500 text-black font-bold rounded text-xs">{t.closeReturn}</button>
          </div>
        </div>
      )}
    </div>
  );
}