'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('user@test.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email)) router.push('/');
    else setError('User not found. Try: user@test.com, artist@test.com, rejected@test.com, support@test.com, or admin@test.com');
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Log in to Spotify Clone</h2>
      {error && <div className="p-3 mb-4 bg-red-900/40 border border-red-500 text-red-300 text-xs rounded font-medium leading-relaxed">{error}</div>}
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1">Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
        </div>
        <button type="submit" className="w-full py-2.5 bg-green-500 hover:bg-green-400 text-black font-bold rounded text-sm transition mt-2 shadow">Sign In</button>
      </form>

      <div className="mt-4 flex justify-between text-xs text-neutral-400">
        <button onClick={() => setShowForgot(true)} className="hover:text-white underline">Forgot Password?</button>
        <Link href="/register" className="hover:text-white underline font-bold">Create Account</Link>
      </div>

      {showForgot && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl max-w-sm w-full text-center shadow-2xl">
            <h3 className="font-bold text-white mb-2">Reset Password</h3>
            <p className="text-xs text-neutral-400 mb-4">Enter your email to receive recovery instructions.</p>
            <input type="email" placeholder="email@domain.com" className="w-full p-2 mb-4 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono" />
            <button onClick={() => { alert('Recovery email sent!'); setShowForgot(false); }} className="w-full py-2 bg-green-500 text-black font-bold rounded text-xs mb-2">Send Recovery Link</button>
            <button onClick={() => setShowForgot(false)} className="text-xs text-neutral-400 hover:text-white">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}