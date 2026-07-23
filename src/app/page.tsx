'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';
import { getDB } from '@/lib/mockData';
import { Track, Album, Playlist } from '@/lib/types';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { PlaylistMenu } from '@/components/ui/PlaylistMenu';
import Link from 'next/link';

export default function HomePage() {
  const { currentUser } = useAuth();
  const { playTrack } = usePlayer();
  const { t } = useLanguage();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [recentPlaylists, setRecentPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (currentUser) {
      setTracks(getDB<Track[]>('db_tracks', []));
      setAlbums(getDB<Album[]>('db_albums', []));
      
      const allPl = getDB<Playlist[]>('db_playlists', []);
      const myPlaylists = allPl.filter(p => p.ownerId === currentUser.id);
      
      const userRecentKey = `db_recent_playlists_${currentUser.id}`;
      const recentIds = getDB<string[]>(userRecentKey, []);
      const foundRecent = recentIds.map(id => myPlaylists.find(p => p.id === id)).filter(Boolean) as Playlist[];
      
      setRecentPlaylists(foundRecent.length > 0 ? foundRecent : myPlaylists.slice(0, 4));
    }
  }, [currentUser]);

  if (!currentUser) return <div className="text-center py-12"><Link href="/login" className="text-green-400 font-bold underline">Log in to continue</Link></div>;

  const standardTracks = tracks.filter(tItem => !tItem.isEarlyAccess);
  const earlyAccessTracks = tracks.filter(tItem => tItem.isEarlyAccess);

  const handlePlaylistClick = (pl: Playlist) => {
    const userRecentKey = `db_recent_playlists_${currentUser.id}`;
    const recent = getDB<string[]>(userRecentKey, []);
    const updated = [pl.id, ...recent.filter(id => id !== pl.id)].slice(0, 6);
    localStorage.setItem(userRecentKey, JSON.stringify(updated));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">{t.welcomeBack}, {currentUser.name}</h1>
        <p className="text-xs text-neutral-400">{t.discoverText}</p>
      </div>

      {recentPlaylists.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">{t.recentPlaylists}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {recentPlaylists.map(pl => (
              <Link
                key={pl.id}
                href="/playlists"
                onClick={() => handlePlaylistClick(pl)}
                className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700/60 p-4 rounded-xl hover:border-green-500/50 transition block group shadow-md"
              >
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400 font-bold mb-3 group-hover:scale-110 transition">🎵</div>
                <h4 className="text-sm font-bold text-white truncate group-hover:text-green-400">{pl.name}</h4>
                <span className="text-xs text-neutral-400 block mt-1">{pl.trackIds.length} {t.tracksCount}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {currentUser.tier === 'GOLD' && earlyAccessTracks.length > 0 && (
        <div className="p-6 bg-gradient-to-r from-amber-500/20 to-neutral-900 border border-amber-500/40 rounded-xl shadow-lg">
          <h2 className="text-md font-bold text-amber-400 mb-4 flex items-center gap-2">{t.vipExclusive}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {earlyAccessTracks.map(track => (
              <div key={track.id} className="flex items-center justify-between p-3 bg-black/40 border border-amber-500/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <img src={track.coverUrl} className="w-12 h-12 rounded object-cover" />
                  <div className="px-2 truncate">
                    <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
                    <Link href={`/artist/${track.artistId}`} className="text-xs text-amber-300 hover:underline block truncate">
                      {track.artistName} {track.collaborators && <span className="text-neutral-400 font-normal">ft. {track.collaborators}</span>}
                    </Link>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <PlaylistMenu trackId={track.id} />
                  <DownloadButton track={track} />
                  <button onClick={() => playTrack(track, tracks)} className="px-4 py-1.5 bg-amber-400 text-black font-bold text-xs rounded-full hover:bg-amber-300 shadow">{t.playVip}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-white mb-4">{t.popularReleases}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {standardTracks.map(track => (
            <div key={track.id} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl hover:border-neutral-700 transition flex flex-col justify-between">
              <div>
                <img src={track.coverUrl} className="w-full aspect-square rounded-lg object-cover mb-3" />
                <div className="flex justify-between items-start">
                  <div className="truncate pr-2">
                    <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
                    <Link href={`/artist/${track.artistId}`} className="text-xs text-neutral-400 hover:text-white hover:underline block truncate mt-0.5">
                      {track.artistName} {track.collaborators && <span className="text-neutral-500 font-normal">ft. {track.collaborators}</span>}
                    </Link>
                  </div>
                  <div className="flex items-center space-x-1">
                    <PlaylistMenu trackId={track.id} />
                    <DownloadButton track={track} />
                  </div>
                </div>
              </div>
              <button onClick={() => playTrack(track, tracks)} className="w-full mt-3 py-1.5 bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-black font-bold text-xs rounded transition">
                {t.playTrack}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white mb-4">{t.featuredAlbums}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {albums.map(alb => (
            <Link key={alb.id} href={`/albums/${alb.id}`} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl hover:border-neutral-700 transition block group">
              <img src={alb.coverUrl} className="w-full aspect-square rounded-lg object-cover mb-3 group-hover:scale-[1.02] transition" />
              <h4 className="text-sm font-bold text-white truncate group-hover:text-green-400">{alb.title}</h4>
              <span className="text-xs text-neutral-400 block truncate">{alb.artistName}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}