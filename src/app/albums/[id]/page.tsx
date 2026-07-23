'use client';
import React, { useState, useEffect } from 'react';
import { getDB } from '@/lib/mockData';
import { Album, Track } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { PlaylistMenu } from '@/components/ui/PlaylistMenu';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AlbumDetailPage() {
  const { id } = useParams();
  const { playTrack } = usePlayer();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    const allAlbums = getDB<Album[]>('db_albums', []);
    const foundAlb = allAlbums.find(a => a.id === id);
    if (foundAlb) {
      setAlbum(foundAlb);
      const allTracks = getDB<Track[]>('db_tracks', []);
      setTracks(allTracks.filter(tItem => tItem.albumId === id || (tItem.album && tItem.album.toLowerCase() === foundAlb.title.toLowerCase())));
    }
  }, [id]);

  if (!album) return <div className="text-center py-16 text-neutral-400">Album not found.</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="p-8 bg-gradient-to-b from-neutral-800 to-neutral-900 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-center gap-6 shadow-xl">
        <img src={album.coverUrl} className="w-48 h-48 rounded-xl object-cover shadow-2xl border border-neutral-700 flex-shrink-0" />
        <div className="text-center sm:text-left space-y-2">
          <span className="text-xs uppercase tracking-widest text-green-400 font-bold">Album Release</span>
          <h1 className="text-3xl font-extrabold text-white">{album.title}</h1>
          <Link href={`/artist/${album.artistId}`} className="text-sm text-neutral-300 hover:text-white underline block font-semibold">{album.artistName}</Link>
          <div className="flex items-center gap-3 text-xs text-neutral-400 pt-2">
            <span>📅 {album.releaseDate}</span>
            <span>•</span>
            <span>🎵 {tracks.length} tracks</span>
            {album.genre && <><span>•</span><span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">{album.genre}</span></>}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white mb-4">Album Tracklist</h3>
        {tracks.map((track, idx) => (
          <div key={track.id} className="flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition">
            <div className="flex items-center space-x-4 truncate">
              <span className="text-xs font-mono text-neutral-500 w-6 text-right">{idx + 1}</span>
              <div className="truncate">
                <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
                <div className="text-xs text-neutral-400 truncate mt-0.5">
                  {track.artistName} {track.collaborators && <span className="text-neutral-500 font-normal">ft. {track.collaborators}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 flex-shrink-0">
              {currentUser?.tier === 'GOLD' && (
                <span className="text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded hidden sm:inline-block">
                  ▶ {(track.totalStreams || track.listenersCount * 2).toLocaleString()} {t.streams}
                </span>
              )}
              <PlaylistMenu trackId={track.id} />
              <DownloadButton track={track} />
              <button onClick={() => playTrack(track, tracks)} className="px-5 py-1.5 bg-green-500 text-black font-bold text-xs rounded-full hover:bg-green-400 transition shadow">
                {t.play}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}