'use client';
import React, { useState, useEffect } from 'react';
import { getDB } from '@/lib/mockData';
import { User, Track, Album } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ArtistProfilePage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const { playTrack } = usePlayer();
  const [following, setFollowing] = useState(false);
  const [artist, setArtist] = useState<User | null>(null);
  const [artistTracks, setArtistTracks] = useState<Track[]>([]);
  const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);

  useEffect(() => {
    const users = getDB<User[]>('db_users', []);
    const found = users.find(u => u.id === id && u.role === 'ARTIST');
    if (found) {
      setArtist(found);
      const tracks = getDB<Track[]>('db_tracks', []);
      setArtistTracks(tracks.filter(t => t.artistId === id));
      const albums = getDB<Album[]>('db_albums', []);
      setArtistAlbums(albums.filter(a => a.artistId === id));
    }
  }, [id]);

  if (!artist) return <div className="text-center py-16 text-neutral-400">Artist profile not found.</div>;

  return (
    <div className="space-y-8">
      <div className="p-8 bg-gradient-to-b from-neutral-800 to-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-6">
          <img src={artist.avatar} className="w-24 h-24 rounded-full object-cover border-2 border-green-500 shadow-md" />
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span>{artist.name}</span>
              {artist.status === 'APPROVED' && <span className="text-blue-400 text-xs font-bold bg-blue-500/20 border border-blue-500/40 px-2.5 py-1 rounded-full flex items-center gap-1" title="Verified Artist">✓ Verified</span>}
            </h1>
            <p className="text-xs text-neutral-400 mt-1.5">{artist.followersCount + (following ? 1 : 0)} Followers</p>
          </div>
        </div>
        <button onClick={() => setFollowing(!following)} className={`px-6 py-2.5 rounded-full font-bold text-xs transition shadow ${following ? 'bg-neutral-800 text-white border border-neutral-600' : 'bg-green-500 text-black hover:bg-green-400'}`}>
          {following ? 'Following' : 'Follow Artist'}
        </button>
      </div>

      {artist.bio && (
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl">
          <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">About / Biography</h3>
          <p className="text-sm text-neutral-300 leading-relaxed">{artist.bio}</p>
        </div>
      )}

      {currentUser?.tier === 'GOLD' && (
        <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex justify-around text-center">
          <div><span className="block text-lg font-bold text-amber-400">{artistTracks.reduce((sum, t) => sum + t.listenersCount, 0).toLocaleString()}</span><span className="text-[10px] text-neutral-400 uppercase">Total Stream Count</span></div>
          <div><span className="block text-lg font-bold text-amber-400">{artistTracks.length}</span><span className="text-[10px] text-neutral-400 uppercase">Published Works</span></div>
        </div>
      )}

      {artistAlbums.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Released Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {artistAlbums.map(alb => (
              <Link key={alb.id} href={`/album/${alb.id}`} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl hover:border-neutral-700 transition block group">
                <img src={alb.coverUrl} className="w-full aspect-square rounded-lg object-cover mb-3 group-hover:scale-[1.02] transition" />
                <h4 className="text-sm font-bold text-white truncate group-hover:text-green-400">{alb.title}</h4>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-white mb-4">Complete Discography</h2>
        <div className="space-y-2">
          {artistTracks.map(track => (
            <div key={track.id} className="flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition">
              <span className="text-sm font-semibold text-white">{track.title}</span>
              <button onClick={() => playTrack(track, artistTracks)} className="px-5 py-1.5 bg-green-500/20 text-green-400 font-bold text-xs rounded-full hover:bg-green-500 hover:text-black transition">Play</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}