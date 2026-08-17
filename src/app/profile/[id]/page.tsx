'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/lib/api';
import { useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';

export default function ProfilePage() {
  const { currentUser, updateUser } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(currentUser?.name || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUser.tier === 'BASIC') return alert('Avatar upload is restricted on Free Basic tier. Please upgrade to Silver or Gold.');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const updatedUser = await authAPI.updateAvatar(file);
      updateUser({ avatar: updatedUser.avatar });
      alert('✅ Avatar updated successfully!');
    } catch (err: any) {
      alert('Failed to update avatar. Is backend running?');
    }
  };

  const handleSaveName = () => {
    if (!newName.trim()) return;
    updateUser({ name: newName });
    setIsEditingName(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <img src={currentUser.avatar} className="w-24 h-24 rounded-full object-cover border-2 border-green-500 shadow-md" />
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-neutral-800 border border-neutral-600 text-[10px] px-2 py-0.5 rounded-full hover:bg-neutral-700">Edit</button>
          </div>
          <div>
            {isEditingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="p-1 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-bold" />
                <button onClick={handleSaveName} className="px-2 py-1 bg-green-500 text-black font-bold text-xs rounded">Save</button>
              </div>
            ) : (
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span>{currentUser.name}</span>
                {currentUser.role === 'ARTIST' && currentUser.status === 'APPROVED' && (
                  <span className="text-blue-400 text-xs font-bold bg-blue-500/20 border border-blue-500/40 px-3 py-1 rounded-full shadow flex items-center gap-1 flex-shrink-0" title="Verified Artist">
                    {t.verifiedBadge}
                  </span>
                )}
                <button onClick={() => { setNewName(currentUser.name); setIsEditingName(true); }} className="text-xs text-neutral-400 hover:text-white underline font-normal">Edit Name</button>
              </h2>
            )}
            <p className="text-xs text-neutral-400">Account ID: {currentUser.id}</p>
            <span className="inline-block mt-2 px-3 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">{currentUser.tier} Subscriber</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
          <span className="block text-2xl font-bold text-white">{currentUser.followersCount}</span>
          <span className="text-xs text-neutral-400">Followers</span>
        </div>
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
          <span className="block text-2xl font-bold text-white">{currentUser.followingCount}</span>
          <span className="text-xs text-neutral-400">Following</span>
        </div>
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
          <span className="block text-2xl font-bold text-white">{currentUser.dailyStreams}</span>
          <span className="text-xs text-neutral-400">Daily Streams</span>
        </div>
      </div>

      {currentUser.role === 'ARTIST' && (
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-lg mt-6">
          <h3 className="text-lg font-bold text-white mb-2">Monetization & Earnings</h3>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-neutral-400 uppercase font-semibold">Total Payouts Earned</span>
              <span className="block text-3xl font-extrabold text-amber-400 mt-1">{currentUser.totalEarnings?.toLocaleString() || 0} IRR</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-neutral-400 uppercase font-semibold block mb-1">Status</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentUser.isMonetized ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {currentUser.isMonetized ? 'Enabled (Active)' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}