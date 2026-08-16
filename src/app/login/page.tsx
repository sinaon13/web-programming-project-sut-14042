'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        router.push('/');
      }
    } catch (err: any) {
      const msg = err?.message || 'Login failed';
      if (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('⚠️ Backend server is not running. Start Django with: uv run python manage.py runserver');
      } else if (msg.includes('401') || msg.includes('No active account') || msg.includes('credentials')) {
        setError('Invalid email or password. Please check your credentials.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Log in to Spotify Clone</h2>
      {error && <div className="p-3 mb-4 bg-red-900/40 border border-red-500 text-red-300 text-xs rounded font-medium leading-relaxed">{error}</div>}
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1">Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 characters" className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
        </div>
        <button type="submit" disabled={loading} className="w-full py-2.5 bg-green-500 hover:bg-green-400 text-black font-bold rounded text-sm transition mt-2 shadow disabled:opacity-50">{loading ? 'Signing in...' : 'Sign In'}</button>
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
            
            {forgotMsg && <div className="p-2 mb-3 bg-green-900/40 border border-green-500 text-green-400 text-xs rounded">{forgotMsg}</div>}
            
            <input 
              type="email" 
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              placeholder="email@domain.com" 
              className="w-full p-2 mb-4 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono" 
            />
            <button 
              disabled={forgotLoading || !forgotEmail}
              onClick={async () => { 
                setForgotLoading(true);
                try {
                  await authAPI.requestPasswordReset(forgotEmail);
                  setForgotMsg('Recovery email sent!');
                  setTimeout(() => setShowForgot(false), 2000);
                } catch (err: any) {
                  alert('Failed to send recovery email. Is backend online?');
                } finally {
                  setForgotLoading(false);
                }
              }} 
              className="w-full py-2 bg-green-500 text-black font-bold rounded text-xs mb-2 disabled:opacity-50"
            >
              {forgotLoading ? 'Sending...' : 'Send Recovery Link'}
            </button>
            <button onClick={() => setShowForgot(false)} className="text-xs text-neutral-400 hover:text-white">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}