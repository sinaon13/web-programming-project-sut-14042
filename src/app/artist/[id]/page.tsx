'use client';
import React, { useState, useEffect } from 'react';
import { musicAPI, authAPI } from '@/lib/api';
import { User, Track, Album } from '@/lib/types';
import { adaptPublicUser, adaptTrack, adaptAlbum } from '@/lib/adapters';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/context/LanguageContext';
import { usePlayer } from '@/context/PlayerContext';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { BackendOfflineBanner } from '@/components/ui/BackendOfflineBanner';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ArtistProfilePage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const { playTrack } = usePlayer();
  const [following, setFollowing] = useState(false);
  const [artist, setArtist] = useState<User | null>(null);
  const [artistTracks, setArtistTracks] = useState<Track[]>([]);
  const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);
  const [backendOffline, setBackendOffline] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const load = async () => {
      try {
        const u = await authAPI.getPublicUser(id as string);
        const parsedUser = adaptPublicUser(u);
        setArtist(parsedUser);
        setFollowing(parsedUser.isFollowing || false);
        
        const trRes = await musicAPI.getTracks({ artist: id as string });
        const trks = (trRes as any).results || (Array.isArray(trRes) ? trRes : []);
        setArtistTracks(trks.map(adaptTrack));
        
        const alRes = await musicAPI.getAlbums({ artist: id as string });
        const albs = (alRes as any).results || (Array.isArray(alRes) ? alRes : []);
        setArtistAlbums(albs.map(adaptAlbum));
        
        setBackendOffline(false);
      } catch (err: any) {
        if (err?.message?.includes("fetch") || err?.message?.includes("Network")) setBackendOffline(true);
      }
    };
    load();
  }, [id]);

  const handleFollowToggle = async () => {
    if (!artist) return;
    try {
      if (following) {
        await authAPI.unfollowUser(artist.id);
        setFollowing(false);
      } else {
        await authAPI.followUser(artist.id);
        setFollowing(true);
      }
    } catch (err: any) {
      showToast('Failed to update follow status.', 'error');
    }
  };

  if (!artist) return <div className="text-center py-16 text-neutral-400">Artist profile not found.</div>;

  return (
    <div className="space-y-8">
      <BackendOfflineBanner show={backendOffline} />
      <div className="p-8 bg-gradient-to-b from-neutral-800 to-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-6 truncate">
          <img src={artist.avatar} className="w-24 h-24 rounded-full object-cover border-2 border-green-500 shadow-md flex-shrink-0" />
          <div className="px-3 truncate">
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 truncate">
              <span className="truncate">{artist.name}</span>
              {artist.status === 'APPROVED' && (
                <span className="text-blue-400 text-xs font-bold bg-blue-500/20 border border-blue-500/40 px-3 py-1 rounded-full shadow flex items-center gap-1 flex-shrink-0" title="Verified Artist">
                  {t.verifiedBadge}
                </span>
              )}
            </h1>
            <p className="text-xs text-neutral-400 mt-1.5">{artist.followersCount + (following && !artist.isFollowing ? 1 : (!following && artist.isFollowing ? -1 : 0))} Followers</p>
          </div>
        </div>
        <button onClick={handleFollowToggle} className={`px-6 py-2.5 rounded-full font-bold text-xs transition shadow flex-shrink-0 ${following ? 'bg-neutral-800 text-white border border-neutral-600' : 'bg-green-500 text-black hover:bg-green-400'}`}>
          {following ? t.followingArtist : t.followArtist}
        </button>
      </div>

      {artist.bio && (
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow">
          <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">{t.aboutBio}</h3>
          <p className="text-sm text-neutral-300 leading-relaxed">{artist.bio}</p>
        </div>
      )}

      {currentUser?.tier === 'GOLD' && (
        <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex justify-around text-center shadow">
          <div><span className="block text-lg font-bold text-amber-400">{(artist.totalStreams || 0).toLocaleString()}</span><span className="text-[10px] text-neutral-400 uppercase">{t.streams}</span></div>
          <div><span className="block text-lg font-bold text-amber-400">{artist.tracksCount || 0}</span><span className="text-[10px] text-neutral-400 uppercase">{t.tracksCount}</span></div>
        </div>
      )}

      {artistAlbums.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">{t.releasedAlbums}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {artistAlbums.map(alb => (
              <Link key={alb.id} href={`/albums/${alb.id}`} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl hover:border-neutral-700 transition block group shadow-md">
                <img src={alb.coverUrl} className="w-full aspect-square rounded-lg object-cover mb-3 group-hover:scale-[1.02] transition" />
                <h4 className="text-sm font-bold text-white truncate group-hover:text-green-400">{alb.title}</h4>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-white mb-4">{t.completeDiscography}</h2>
        <div className="space-y-2">
          {artistTracks.map(tItem => (
            <div key={tItem.id} className="flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition">
              <div className="truncate pr-2">
                <h4 className="text-sm font-bold text-white truncate">{tItem.title}</h4>
                <div className="text-xs text-neutral-400 truncate mt-0.5">
                  {tItem.artistName} {tItem.collaborators && <span className="text-neutral-500 font-normal">ft. {tItem.collaborators}</span>}
                </div>
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0">
                {currentUser?.tier === 'GOLD' && (
                  <span className="text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded hidden sm:inline-block">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="inline-block mr-1 -mt-0.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    {(tItem.totalStreams || tItem.listenersCount * 2).toLocaleString()} {t.streams} • 👤 {tItem.listenersCount.toLocaleString()} {t.unique}
                  </span>
                )}
                <DownloadButton track={tItem} />
                <button onClick={() => playTrack(tItem, artistTracks)} className="px-5 py-1.5 bg-green-500/20 text-green-400 font-bold text-xs rounded-full hover:bg-green-500 hover:text-black transition shadow">{t.play}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}