'use client';
import React, { useState, useEffect } from 'react';
import { getDB } from '@/lib/mockData';
import { Album } from '@/lib/types';
import Link from 'next/link';

export default function AlbumsArchivePage() {
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    setAlbums(getDB<Album[]>('db_albums', []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Albums Archive</h1>
        <p className="text-xs text-neutral-400">Explore full discography releases from verified platform artists.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {albums.map(alb => (
          <Link key={alb.id} href={`/album/${alb.id}`} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl hover:border-neutral-700 transition block group shadow-md">
            <img src={alb.coverUrl} className="w-full aspect-square rounded-lg object-cover mb-3 group-hover:scale-[1.02] transition" />
            <h4 className="text-sm font-bold text-white truncate group-hover:text-green-400">{alb.title}</h4>
            <span className="text-xs text-neutral-400 block truncate mt-0.5">{alb.artistName}</span>
            {alb.genre && <span className="inline-block mt-2 text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">{alb.genre}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}