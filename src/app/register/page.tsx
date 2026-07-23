'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Role } from '@/lib/types';
import Link from 'next/link';

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
  
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-type your password.');
      return;
    }
    if (!policyAccepted) {
      setError('You must accept the Privacy Policy to proceed.');
      return;
    }
    register(name, email, tab as Role, birthDate, gender, tab === 'ARTIST' ? portfolio : undefined);
    router.push('/');
  };

  return (
    <div className="max-w-md mx-auto mt-6 p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
      <div className="flex border-b border-neutral-800 mb-6">
        <button onClick={() => setTab('LISTENER')} className={`flex-1 pb-3 text-sm font-bold ${tab === 'LISTENER' ? 'text-green-500 border-b-2 border-green-500' : 'text-neutral-500'}`}>Listener Account</button>
        <button onClick={() => setTab('ARTIST')} className={`flex-1 pb-3 text-sm font-bold ${tab === 'ARTIST' ? 'text-green-500 border-b-2 border-green-500' : 'text-neutral-500'}`}>Artist Application</button>
      </div>

      {error && <div className="p-3 mb-4 bg-red-900/40 border border-red-500 text-red-300 text-xs rounded font-medium">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1">{tab === 'ARTIST' ? 'Stage / Artist Name' : 'Display Name'}</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1">Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">Birth Date</label>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-xs text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-xs text-white">
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {tab === 'ARTIST' && (
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">Portfolio Sample URL</label>
            <input type="url" placeholder="https://soundcloud.com/your-track" value={portfolio} onChange={e => setPortfolio(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
          </div>
        )}

        <div className="flex items-center space-x-2 pt-2">
          <input type="checkbox" checked={policyAccepted} onChange={e => setPolicyAccepted(e.target.checked)} className="accent-green-500" />
          <span className="text-xs text-neutral-400">I agree to the <button type="button" onClick={() => setShowPolicyModal(true)} className="text-white underline">Privacy Policy</button></span>
        </div>

        <button type="submit" className="w-full py-2.5 bg-green-500 hover:bg-green-400 text-black font-bold rounded text-sm transition mt-2">Create Account</button>
      </form>

      <div className="mt-4 text-center text-xs text-neutral-400">
        Already have an account? <Link href="/login" className="text-white hover:underline font-bold">Sign In</Link>
      </div>

      {showPolicyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl max-w-md w-full">
            <h3 className="font-bold text-white mb-2">Platform Privacy Policy</h3>
            <p className="text-xs text-neutral-300 leading-relaxed mb-6">We collect basic account details and stream telemetry to calculate fair artist payouts. We never share your data with unauthorized third parties.</p>
            <button onClick={() => setShowPolicyModal(false)} className="w-full py-2 bg-green-500 text-black font-bold rounded text-xs">Close & Return</button>
          </div>
        </div>
      )}
    </div>
  );
}