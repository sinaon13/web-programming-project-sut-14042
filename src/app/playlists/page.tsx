'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { playlistsAPI, musicAPI } from '@/lib/api';
import { Playlist, Track } from '@/lib/types';
import { adaptPlaylist, adaptTrack } from '@/lib/adapters';
import { usePlayer } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';
import { BackendOfflineBanner } from '@/components/ui/BackendOfflineBanner';
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
  const [backendOffline, setBackendOffline] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    const load = async () => {
      try {
        const plRes = await playlistsAPI.getPlaylists();
        const trRes = await musicAPI.getTracks();
        const pls = ((plRes as any).results || (Array.isArray(plRes) ? plRes : [])).map(adaptPlaylist);
        const trks = (trRes as any).results || (Array.isArray(trRes) ? trRes : []);
        setPlaylists(pls.filter((p: Playlist) => p.ownerId === String(currentUser.id)));
        setAllTracks(trks.map(adaptTrack));
        setBackendOffline(false);
      } catch {
        setBackendOffline(true);
      }
    };
    load();
  }, [currentUser]);

  if (!currentUser) return null;

  const maxPlaylists = currentUser.tier === 'BASIC' ? 6 : currentUser.tier === 'SILVER' ? 100 : 9999;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (playlists.length >= maxPlaylists) return alert(`Limit reached! Upgrade your tier to create more than ${maxPlaylists} playlists.`);
    
    try {
      await playlistsAPI.createPlaylist(name);
      const res = await playlistsAPI.getPlaylists();
      const pls = ((res as any).results || (Array.isArray(res) ? res : [])).map(adaptPlaylist);
      setPlaylists(pls.filter((p: Playlist) => p.ownerId === String(currentUser.id)));
      setName('');
      setBackendOffline(false);
    } catch {
      alert('Backend offline. Cannot create playlist.');
    }
  };

  const handleRename = async (plId: string, oldName: string) => {
    const newName = prompt('Enter new name for playlist:', oldName);
    if (!newName || !newName.trim() || newName === oldName) return;
    
    try {
      await playlistsAPI.updatePlaylist(plId, { name: newName.trim() } as any);
      const res = await playlistsAPI.getPlaylists();
      const pls = (res as any).results || (Array.isArray(res) ? res : []);
      setPlaylists(pls);
      setBackendOffline(false);
    } catch {
      alert('Backend offline. Cannot rename playlist.');
    }
  };

  const handleDelete = async (plId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
      await playlistsAPI.deletePlaylist(plId);
      const res = await playlistsAPI.getPlaylists();
      const pls = (res as any).results || (Array.isArray(res) ? res : []);
      setPlaylists(pls);
      setBackendOffline(false);
    } catch {
      alert('Backend offline. Cannot delete playlist.');
    }
  };

  const removeTrackFromPlaylist = async (plId: string, trackId: string) => {
    try {
      await playlistsAPI.removeTrack(plId, trackId);
      const res = await playlistsAPI.getPlaylists();
      const pls = (res as any).results || (Array.isArray(res) ? res : []);
      setPlaylists(pls);
      setBackendOffline(false);
    } catch {
      alert('Backend offline. Cannot remove track from playlist.');
    }
  };

  const handlePlayFromPlaylist = (track: Track, list: Track[], pl: Playlist) => {
    const userRecentKey = `db_recent_playlists_${currentUser.id}`;
    const recentStr = localStorage.getItem(userRecentKey);
    const recent: string[] = recentStr ? JSON.parse(recentStr) : [];
    const updated = [pl.id, ...recent.filter((id: string) => id !== pl.id)].slice(0, 6);
    localStorage.setItem(userRecentKey, JSON.stringify(updated));
    playTrack(track, list);
  };

  return (
    <div className="space-y-6">
      <BackendOfflineBanner show={backendOffline} />
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
            const plTracks = allTracks.filter(tItem => (pl.trackIds || []).includes(tItem.id));
            return (
              <div key={pl.id} className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-3 mb-3">
                    <h3 className="font-bold text-white text-md truncate pr-2">{pl.name} ({plTracks.length})</h3>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button onClick={() => handleRename(pl.id, pl.name)} title="Rename Playlist" className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs">{t.renameBtn}</button>
                      <button onClick={() => handleDelete(pl.id)} title="Delete Playlist" className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs flex items-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        {t.deleteBtn}
                      </button>
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
                            <button onClick={() => handlePlayFromPlaylist(tItem, plTracks, pl)} className="text-green-400 font-bold hover:underline flex items-center">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="mr-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                              {t.play}
                            </button>
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