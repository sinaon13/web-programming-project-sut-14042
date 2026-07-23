'use client';
import React, { useState, useEffect } from 'react';
import { getDB } from '@/lib/mockData';
import { Track } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext'; // Imported
import { DownloadButton } from '@/components/ui/DownloadButton';
import Link from 'next/link';

export default function SinglesArchivePage() {
  const [singles, setSingles] = useState<Track[]>([]);
  const { playTrack } = usePlayer();
  const { currentUser } = useAuth();
  const { t } = useLanguage(); // Grabbed translations

  useEffect(() => {
    const all = getDB<Track[]>('db_tracks', []);
    setSingles(all.filter(tItem => tItem.releaseType === 'SINGLE' || !tItem.albumId));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">{t.singlesArchiveTitle}</h1>
        <p className="text-xs text-neutral-400">{t.singlesArchiveDesc}</p>
      </div>

      <div className="space-y-2">
        {singles.map(track => (
          <div key={track.id} className="flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition">
            <div className="flex items-center space-x-4">
              <img src={track.coverUrl} className="w-12 h-12 rounded object-cover" />
              <div className="px-2">
                <h4 className="text-sm font-bold text-white">{track.title}</h4>
                <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                  <Link href={`/artist/${track.artistId}`} className="hover:text-white underline">{track.artistName}</Link>
                  <span>•</span>
                  <span className="text-green-400 font-semibold">{track.fileFormat || 'MP3'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {currentUser?.tier === 'GOLD' && (
                <span className="text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded hidden md:inline-block">
                  ▶ {(track.totalStreams || track.listenersCount * 2).toLocaleString()} {t.streams} • 👤 {track.listenersCount.toLocaleString()} {t.unique}
                </span>
              )}
              <DownloadButton track={track} />
              <button onClick={() => playTrack(track, singles)} className="px-5 py-1.5 bg-green-500 text-black font-bold text-xs rounded-full hover:bg-green-400 transition shadow">
                {t.playSingle}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}