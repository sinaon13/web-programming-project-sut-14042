'use client';
import React, { useState, useEffect } from 'react';
import { Playlist, Track } from '@/lib/types';
import { playlistsAPI } from '@/lib/api';
import { adaptPlaylist } from '@/lib/adapters';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

export const PlaylistMenu: React.FC<{ track: Track }> = ({ track }) => {
  const { currentUser } = useAuth();
  const { addToQueue } = usePlayer();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (isOpen && currentUser) {
      const fetchPlaylists = async () => {
        try {
          const res = await playlistsAPI.getPlaylists();
          const list = ((res as any).results || (Array.isArray(res) ? res : [])).map(adaptPlaylist);
          setMyPlaylists(list.filter((p: Playlist) => p.ownerId === String(currentUser.id)));
        } catch {
          // Backend offline or error, fail silently or handle error state
        }
      };
      fetchPlaylists();
    }
  }, [isOpen, currentUser]);

  if (!currentUser) return null;

  const toggleTrackInPlaylist = async (plId: string) => {
    const pl = myPlaylists.find(p => p.id === plId);
    if (!pl) return;
    const exists = (pl.trackIds || []).includes(track.id);
    try {
      if (exists) {
        await playlistsAPI.removeTrack(plId, track.id);
      } else {
        await playlistsAPI.addTrack(plId, track.id);
      }
      const res = await playlistsAPI.getPlaylists();
      const list = ((res as any).results || (Array.isArray(res) ? res : [])).map(adaptPlaylist);
      setMyPlaylists(list.filter((p: Playlist) => p.ownerId === String(currentUser.id)));
    } catch (err: any) {
      showToast(t.playlistAddTrackFailed, 'error');
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        title="More Options"
        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded text-xs font-bold transition flex items-center gap-1 border border-neutral-700"
      >
        <span className="mb-1">...</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-3 z-50 text-left">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-2">
              <span className="text-xs font-bold text-white">Options</span>
              <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white text-xs">✕</button>
            </div>

            <button 
              onClick={() => { addToQueue(track); setIsOpen(false); }}
              className="w-full text-left p-2 mb-2 hover:bg-neutral-800 rounded text-xs text-white font-semibold transition"
            >
              🎵 Add to Queue
            </button>

            <div className="border-t border-neutral-800 pt-2 mb-2">
              <span className="text-[10px] uppercase text-neutral-500 font-bold px-2">Save to Playlist</span>
            </div>

            {myPlaylists.length === 0 ? (
              <div className="text-center py-2">
                <p className="text-[11px] text-neutral-400 mb-2">No playlists created yet.</p>
                <Link href="/playlists" className="text-xs text-green-400 font-bold hover:underline block">Create Playlist ➡️</Link>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {myPlaylists.map(pl => {
                  const isChecked = (pl.trackIds || []).includes(track.id);
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