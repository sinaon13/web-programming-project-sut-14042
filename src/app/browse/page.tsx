'use client';
import React, { useState, useEffect } from 'react';
import { getDB } from '@/lib/mockData';
import { Track } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
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
  const { t } = useLanguage();
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
    .filter(tItem => tItem.title.toLowerCase().includes(query.toLowerCase()) || tItem.artistName.toLowerCase().includes(query.toLowerCase()) || (tItem.collaborators && tItem.collaborators.toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => sortBy === 'LISTENERS' ? b.listenersCount - a.listenersCount : new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <input
          type="text" placeholder={t.searchPlaceholder} value={query} onChange={e => setQuery(e.target.value)}
          className="w-full md:w-96 p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white"
        />
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs text-neutral-400 px-1">{t.sortBy}</span>
          <button onClick={() => setSortBy('LISTENERS')} className={`px-3 py-1.5 rounded text-xs font-bold ${sortBy === 'LISTENERS' ? 'bg-green-500 text-black' : 'bg-neutral-900 text-neutral-400'}`}>{t.mostListeners}</button>
          <button onClick={() => setSortBy('DATE')} className={`px-3 py-1.5 rounded text-xs font-bold ${sortBy === 'DATE' ? 'bg-green-500 text-black' : 'bg-neutral-900 text-neutral-400'}`}>{t.releaseDate}</button>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(track => (
          <div key={track.id} className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition">
            <div className="flex items-center space-x-4 truncate">
              <img src={track.coverUrl} className="w-12 h-12 rounded object-cover flex-shrink-0" />
              <div className="px-2 truncate">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">{track.title}</span>
                  {track.isEarlyAccess && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold flex-shrink-0">VIP Gold</span>}
                </h4>
                <div className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5 truncate">
                  <Link href={`/artist/${track.artistId}`} className="hover:text-white hover:underline truncate">
                    {track.artistName} {track.collaborators && <span className="text-neutral-500 font-normal">ft. {track.collaborators}</span>}
                  </Link>
                  <span>•</span>
                  {track.albumId ? <Link href={`/albums/${track.albumId}`} className="hover:text-white hover:underline truncate">{track.album}</Link> : <span>{track.album}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              {currentUser?.tier === 'GOLD' && (
                <span className="text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded hidden lg:inline-block">
                  ▶ {(track.totalStreams || track.listenersCount * 2).toLocaleString()} {t.streams} • 👤 {track.listenersCount.toLocaleString()} {t.unique}
                </span>
              )}
              <PlaylistMenu trackId={track.id} />
              <DownloadButton track={track} />
              <button onClick={() => handlePlayAttempt(track, filtered)} className={`px-4 py-1.5 font-bold text-xs rounded-full transition ${track.isEarlyAccess && currentUser?.tier !== 'GOLD' ? 'bg-amber-400 text-black hover:bg-amber-300' : 'bg-white text-black hover:bg-green-400'}`}>
                {track.isEarlyAccess && currentUser?.tier !== 'GOLD' ? t.unlockVip : t.play}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}