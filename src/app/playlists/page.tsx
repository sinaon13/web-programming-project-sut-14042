'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDB, setDB } from '@/lib/mockData';
import { Playlist, Track } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext'; // Imported
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PlaylistsPage() {
  const { currentUser } = useAuth();
  const { playTrack } = usePlayer();
  const { t } = useLanguage(); // Grabbed translations
  const router = useRouter();
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

  const handleRename = (plId: string, oldName: string) => {
    const newName = prompt('Enter new name for playlist:', oldName);
    if (!newName || !newName.trim() || newName === oldName) return;
    
    const all = getDB<Playlist[]>('db_playlists', []);
    const updated = all.map(pl => pl.id === plId ? { ...pl, name: newName.trim() } : pl);
    setDB('db_playlists', updated);
    setPlaylists(updated.filter(p => p.ownerId === currentUser.id));
  };

  const handleDelete = (plId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    const all = getDB<Playlist[]>('db_playlists', []);
    const updated = all.filter(pl => pl.id !== plId);
    setDB('db_playlists', updated);
    setPlaylists(updated.filter(p => p.ownerId === currentUser.id));
  };

  const removeTrackFromPlaylist = (plId: string, trackId: string) => {
    const all = getDB<Playlist[]>('db_playlists', []);
    const updated = all.map(pl => pl.id === plId ? { ...pl, trackIds: pl.trackIds.filter(id => id !== trackId) } : pl);
    setDB('db_playlists', updated);
    setPlaylists(updated.filter(p => p.ownerId === currentUser.id));
  };

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
          <h2 className="text-lg font-bold text-white">{t.playlistsTitle} ({playlists.length} / {maxPlaylists === 9999 ? 'Unlimited' : maxPlaylists})</h2>
          <p className="text-xs text-neutral-400">{t.currentTierLabel} <span className="text-green-400 font-bold">{currentUser.tier}</span></p>
        </div>
        <form onSubmit={handleCreate} className="flex space-x-2 w-full md:w-auto">
          <input type="text" placeholder={t.newPlaylistPlaceholder} value={name} onChange={e => setName(e.target.value)} required className="p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
          <button type="submit" className="px-5 py-2 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400 transition">{t.createBtn}</button>
        </form>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800/60 rounded-xl">
          <p className="text-sm text-neutral-400 mb-4">{t.noPlaylists}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {playlists.map(pl => {
            const plTracks = allTracks.filter(tItem => pl.trackIds.includes(tItem.id));
            return (
              <div key={pl.id} className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-3 mb-3">
                    <h3 className="font-bold text-white text-md truncate pr-2">{pl.name} ({plTracks.length})</h3>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button onClick={() => handleRename(pl.id, pl.name)} title="Rename Playlist" className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs">{t.renameBtn}</button>
                      <button onClick={() => handleDelete(pl.id)} title="Delete Playlist" className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs">{t.deleteBtn}</button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {plTracks.length === 0 ? (
                      <p className="text-xs text-neutral-500 py-4 text-center">{t.noSongsInList}</p>
                    ) : (
                      plTracks.map(tItem => (
                        <div key={tItem.id} className="flex items-center justify-between text-xs bg-black/40 p-2.5 rounded border border-neutral-800/60">
                          <div className="truncate pr-2 flex items-center">
                            <span className="font-bold text-white mr-1.5">{tItem.title}</span>
                            <span className="text-neutral-600">•</span>
                            <Link href={`/artist/${tItem.artistId}`} className="text-neutral-400 hover:text-white hover:underline mx-1.5">{tItem.artistName}</Link>
                            {tItem.albumId && (
                              <>
                                <span className="text-neutral-600">•</span>
                                <Link href={`/albums/${tItem.albumId}`} className="text-neutral-400 hover:text-white hover:underline ml-1.5 truncate max-w-[100px]">{tItem.album}</Link>
                              </>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 flex-shrink-0">
                            <button onClick={() => handlePlayFromPlaylist(tItem, plTracks, pl)} className="text-green-400 font-bold hover:underline">▶ {t.play}</button>
                            <button onClick={() => removeTrackFromPlaylist(pl.id, tItem.id)} title="Remove from Playlist" className="text-neutral-500 hover:text-red-400">✕</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={() => router.push('/browse')}
                  className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-green-400 font-bold text-xs rounded border border-green-500/30 transition flex items-center justify-center gap-2"
                >
                  <span>{t.addSongsFromArchive}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}