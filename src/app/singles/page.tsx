'use client';
import React, { useState, useEffect } from 'react';
import { getDB } from '@/lib/mockData';
import { Track } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import Link from 'next/link';

export default function SinglesArchivePage() {
  const [singles, setSingles] = useState<Track[]>([]);
  const { playTrack } = usePlayer();

  useEffect(() => {
    const all = getDB<Track[]>('db_tracks', []);
    setSingles(all.filter(t => t.releaseType === 'SINGLE' || !t.albumId));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Singles Archive</h1>
        <p className="text-xs text-neutral-400">Stream standalone single tracks released directly by artists.</p>
      </div>

      <div className="space-y-2">
        {singles.map(track => (
          <div key={track.id} className="flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition">
            <div className="flex items-center space-x-4">
              <img src={track.coverUrl} className="w-12 h-12 rounded object-cover" />
              <div>
                <h4 className="text-sm font-bold text-white">{track.title}</h4>
                <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                  <Link href={`/artist/${track.artistId}`} className="hover:text-white underline">{track.artistName}</Link>
                  <span>•</span>
                  <span className="text-green-400 font-semibold">{track.fileFormat || 'MP3'}</span>
                </div>
              </div>
            </div>
            <button onClick={() => playTrack(track, singles)} className="px-5 py-1.5 bg-green-500 text-black font-bold text-xs rounded-full hover:bg-green-400 transition shadow">
              Play Single
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}