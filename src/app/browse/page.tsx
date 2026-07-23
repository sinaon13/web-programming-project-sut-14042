'use client';
import React, { useState, useEffect } from 'react';
import { getDB } from '@/lib/mockData';
import { Track } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { PlaylistMenu } from '@/components/ui/PlaylistMenu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BrowsePage() {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'LISTENERS' | 'DATE'>('LISTENERS');
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [showVipModal, setShowVipModal] = useState(false);
  const { playTrack } = usePlayer();
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setAllTracks(getDB<Track[]>('db_tracks', []));
  }, []);

  const handlePlayAttempt = (track: Track, list: Track[]) => {
    if (track.isEarlyAccess && currentUser?.tier !== 'GOLD') {
      setShowVipModal(true);
      return;
    }
    playTrack(track, list);
  };

  const filtered = allTracks
    .filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || t.artistName.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sortBy === 'LISTENERS' ? b.listenersCount - a.listenersCount : new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <input
          type="text" placeholder="Search by song title or artist name..." value={query} onChange={e => setQuery(e.target.value)}
          className="w-full md:w-96 p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white"
        />
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs text-neutral-400">Sort By:</span>
          <button onClick={() => setSortBy('LISTENERS')} className={`px-3 py-1.5 rounded text-xs font-bold ${sortBy === 'LISTENERS' ? 'bg-green-500 text-black' : 'bg-neutral-900 text-neutral-400'}`}>Most Listeners</button>
          <button onClick={() => setSortBy('DATE')} className={`px-3 py-1.5 rounded text-xs font-bold ${sortBy === 'DATE' ? 'bg-green-500 text-black' : 'bg-neutral-900 text-neutral-400'}`}>Release Date</button>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(track => (
          <div key={track.id} className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition">
            <div className="flex items-center space-x-4">
              <img src={track.coverUrl} className="w-12 h-12 rounded object-cover" />
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{track.title}</span>
                  {track.isEarlyAccess && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">VIP Gold</span>}
                </h4>
                <div className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                  <Link href={`/artist/${track.artistId}`} className="hover:text-white hover:underline">{track.artistName}</Link>
                  <span>•</span>
                  {/* Strictly plural /albums/${track.albumId} */}
                  {track.albumId ? <Link href={`/albums/${track.albumId}`} className="hover:text-white hover:underline">{track.album}</Link> : <span>{track.album}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              {currentUser?.tier === 'GOLD' && (
                <span className="text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded hidden lg:inline-block">
                  ▶ {(track.totalStreams || track.listenersCount * 2).toLocaleString()} streams • 👤 {track.listenersCount.toLocaleString()} unique
                </span>
              )}
              {/* Section 8.2 Requirement: Playlist Menu on Track Cards */}
              <PlaylistMenu trackId={track.id} />
              <DownloadButton track={track} />
              <button onClick={() => handlePlayAttempt(track, filtered)} className={`px-4 py-1.5 font-bold text-xs rounded-full transition ${track.isEarlyAccess && currentUser?.tier !== 'GOLD' ? 'bg-amber-400 text-black hover:bg-amber-300' : 'bg-white text-black hover:bg-green-400'}`}>
                {track.isEarlyAccess && currentUser?.tier !== 'GOLD' ? '🔒 Unlock VIP' : 'Play'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showVipModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-amber-500/50 p-6 rounded-xl max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-lg font-bold text-amber-400 mb-2">VIP Gold Exclusive Track</h3>
            <p className="text-xs text-neutral-300 mb-6 leading-relaxed">This Early Access release is restricted to Gold VIP subscribers. Upgrade your tier to stream exclusive tracks instantly!</p>
            <button onClick={() => { setShowVipModal(false); router.push('/settings'); }} className="w-full py-2.5 bg-amber-400 text-black font-bold rounded text-xs mb-2 hover:bg-amber-300">Upgrade to Gold VIP</button>
            <button onClick={() => setShowVipModal(false)} className="text-xs text-neutral-400 hover:text-white mt-2">Maybe Later</button>
          </div>
        </div>
      )}
    </div>
  );
}