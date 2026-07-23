'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { currentUser, updateUser } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(currentUser?.name || '');

  if (!currentUser) return null;

  const handleAvatarChange = () => {
    if (currentUser.tier === 'BASIC') return alert('Avatar upload is restricted on Free Basic tier. Please upgrade to Silver or Gold.');
    const url = prompt('Enter new image URL:', currentUser.avatar);
    if (url) updateUser({ avatar: url });
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
            <button onClick={handleAvatarChange} className="absolute bottom-0 right-0 bg-neutral-800 border border-neutral-600 text-[10px] px-2 py-0.5 rounded-full hover:bg-neutral-700">Edit</button>
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
    </div>
  );
}