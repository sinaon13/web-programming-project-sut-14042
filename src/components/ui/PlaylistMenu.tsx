'use client';
import React, { useState, useEffect } from 'react';
import { Playlist } from '@/lib/types';
import { getDB, setDB } from '@/lib/mockData';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export const PlaylistMenu: React.FC<{ trackId: string }> = ({ trackId }) => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (isOpen && currentUser) {
      const all = getDB<Playlist[]>('db_playlists', []);
      // STRICTLY filter by current user to prevent cross-user leakage!
      setMyPlaylists(all.filter(p => p.ownerId === currentUser.id));
    }
  }, [isOpen, currentUser]);

  if (!currentUser) return null;

  const toggleTrackInPlaylist = (plId: string) => {
    const all = getDB<Playlist[]>('db_playlists', []);
    const updated = all.map(pl => {
      if (pl.id !== plId) return pl;
      const exists = pl.trackIds.includes(trackId);
      const newTrackIds = exists ? pl.trackIds.filter(id => id !== trackId) : [...pl.trackIds, trackId];
      return { ...pl, trackIds: newTrackIds };
    });
    setDB('db_playlists', updated);
    setMyPlaylists(updated.filter(p => p.ownerId === currentUser.id));
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        title="Add to Playlist"
        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded text-xs font-bold transition flex items-center gap-1 border border-neutral-700"
      >
        <span>➕</span>
        <span className="hidden sm:inline">Playlist</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-3 z-50 text-left">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-2">
              <span className="text-xs font-bold text-white">Save to Playlist</span>
              <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white text-xs">✕</button>
            </div>

            {myPlaylists.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-[11px] text-neutral-400 mb-2">No playlists created yet.</p>
                <Link href="/playlists" className="text-xs text-green-400 font-bold hover:underline block">Create Playlist ➡️</Link>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {myPlaylists.map(pl => {
                  const isChecked = pl.trackIds.includes(trackId);
                  return (
                    <label key={pl.id} className="flex items-center space-x-2.5 p-1.5 hover:bg-neutral-800 rounded cursor-pointer text-xs text-neutral-200">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTrackInPlaylist(pl.id)}
                        className="accent-green-500 rounded w-3.5 h-3.5"
                      />
                      <span className="truncate font-medium">{pl.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};