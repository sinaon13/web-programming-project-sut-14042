'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDB, setDB } from '@/lib/mockData';
import { Playlist, Track } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';

export default function PlaylistsPage() {
  const { currentUser } = useAuth();
  const { playTrack } = usePlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [name, setName] = useState('');
  const [allTracks, setAllTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (currentUser) {
      const allPl = getDB<Playlist[]>('db_playlists', []);
      setPlaylists(allPl.filter(p => p.ownerId === currentUser.id));
      setAllTracks(getDB<Track[]>('db_tracks', []));
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const maxPlaylists = currentUser.tier === 'BASIC' ? 6 : currentUser.tier === 'SILVER' ? 100 : 9999;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (playlists.length >= maxPlaylists) return alert(`Limit reached! Upgrade your tier to create more than ${maxPlaylists} playlists.`);
    const newPl: Playlist = { id: 'pl_' + Date.now(), name, ownerId: currentUser.id, trackIds: [] };
    const updated = [...playlists, newPl];
    setPlaylists(updated);
    const all = getDB<Playlist[]>('db_playlists', []);
    setDB('db_playlists', [...all, newPl]);
    setName('');
  };

  const addTrackToPlaylist = (plId: string, trackId: string) => {
    const updated = playlists.map(pl => pl.id === plId ? { ...pl, trackIds: Array.from(new Set([...pl.trackIds, trackId])) } : pl);
    setPlaylists(updated);
    const all = getDB<Playlist[]>('db_playlists', []).map(pl => pl.id === plId ? updated.find(u => u.id === plId)! : pl);
    setDB('db_playlists', all);
  };

  // FIX 2: Trigger logging to recent playlists when hitting Play
  const handlePlayFromPlaylist = (track: Track, list: Track[], pl: Playlist) => {
    const userRecentKey = `db_recent_playlists_${currentUser.id}`;
    const recent = getDB<string[]>(userRecentKey, []);
    const updated = [pl.id, ...recent.filter(id => id !== pl.id)].slice(0, 6);
    localStorage.setItem(userRecentKey, JSON.stringify(updated));
    playTrack(track, list);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-6 rounded-xl gap-4 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white">My Playlists ({playlists.length} / {maxPlaylists === 9999 ? 'Unlimited' : maxPlaylists})</h2>
          <p className="text-xs text-neutral-400">Current Tier: <span className="text-green-400 font-bold">{currentUser.tier}</span></p>
        </div>
        <form onSubmit={handleCreate} className="flex space-x-2 w-full md:w-auto">
          <input type="text" placeholder="New playlist name..." value={name} onChange={e => setName(e.target.value)} required className="p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
          <button type="submit" className="px-5 py-2 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400 transition">Create</button>
        </form>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800/60 rounded-xl">
          <p className="text-sm text-neutral-400 mb-4">No playlists found. Create your first playlist above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {playlists.map(pl => {
            const plTracks = allTracks.filter(t => pl.trackIds.includes(t.id));
            return (
              <div key={pl.id} className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl shadow-md">
                <h3 className="font-bold text-white mb-3 text-md border-b border-neutral-800 pb-2">{pl.name} ({plTracks.length} tracks)</h3>
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {plTracks.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-xs bg-black/40 p-2.5 rounded border border-neutral-800/60">
                      <span className="truncate pr-2 font-medium text-neutral-200">{t.title} - {t.artistName}</span>
                      <button onClick={() => handlePlayFromPlaylist(t, plTracks, pl)} className="text-green-400 font-bold hover:underline">▶ Play</button>
                    </div>
                  ))}
                </div>
                <select onChange={e => e.target.value && addTrackToPlaylist(pl.id, e.target.value)} className="w-full text-xs p-2 bg-neutral-800 border border-neutral-700 rounded text-neutral-300">
                  <option value="">+ Add Track to Playlist...</option>
                  {allTracks.map(t => <option key={t.id} value={t.id}>{t.title} ({t.artistName})</option>)}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}