'use client';
import React, { useState, useEffect } from 'react';
import { getDB } from '@/lib/mockData';
import { Album, Track } from '@/lib/types';
import { usePlayer } from '@/context/PlayerContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AlbumDetailPage() {
  const { id } = useParams();
  const { playTrack } = usePlayer();
  const [album, setAlbum] = useState<Album | null>(null);
  const [albumTracks, setAlbumTracks] = useState<Track[]>([]);

  useEffect(() => {
    const albums = getDB<Album[]>('db_albums', []);
    const found = albums.find(a => a.id === id);
    if (found) {
      setAlbum(found);
      const allTracks = getDB<Track[]>('db_tracks', []);
      setAlbumTracks(allTracks.filter(t => t.albumId === id || t.album === found.title));
    }
  }, [id]);

  if (!album) return <div className="text-center py-16 text-neutral-400">Album not found.</div>;

  return (
    <div className="space-y-8">
      <div className="p-8 bg-gradient-to-b from-neutral-800 to-neutral-900 border border-neutral-800 rounded-2xl flex flex-col md:flex-row items-center gap-8 shadow-xl">
        <img src={album.coverUrl} className="w-48 h-48 rounded-xl object-cover shadow-2xl border border-neutral-700" />
        <div className="text-center md:text-left">
          <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Album Release</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white my-2">{album.title}</h1>
          <p className="text-sm text-neutral-300">By <Link href={`/artist/${album.artistId}`} className="text-white hover:underline font-bold">{album.artistName}</Link></p>
          <div className="flex items-center justify-center md:justify-start gap-4 mt-4 text-xs text-neutral-400">
            <span>Released: {album.releaseDate}</span>
            <span>•</span>
            <span>{albumTracks.length} Tracks</span>
            {album.genre && <><span>•</span><span className="bg-neutral-800 px-2.5 py-0.5 rounded text-neutral-300">{album.genre}</span></>}
          </div>
          {albumTracks.length > 0 && (
            <button onClick={() => playTrack(albumTracks[0], albumTracks)} className="mt-6 px-8 py-3 bg-green-500 text-black font-extrabold text-sm rounded-full hover:bg-green-400 transition shadow-lg">
              ▶ Play Full Album
            </button>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white mb-4">Tracklist</h2>
        <div className="space-y-2">
          {albumTracks.length === 0 ? <p className="text-neutral-500 text-sm">No tracks uploaded to this album yet.</p> : albumTracks.map((track, idx) => (
            <div key={track.id} className="flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition">
              <div className="flex items-center space-x-4">
                <span className="text-xs text-neutral-500 w-4 font-bold">{idx + 1}</span>
                <div>
                  <h4 className="text-sm font-bold text-white">{track.title}</h4>
                  <span className="text-xs text-neutral-400">{track.artistName}</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded">{track.fileFormat || 'MP3'}</span>
                <button onClick={() => playTrack(track, albumTracks)} className="px-4 py-1.5 bg-white text-black font-bold text-xs rounded-full hover:bg-green-400 transition">Play</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}