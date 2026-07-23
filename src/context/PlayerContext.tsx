'use client';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Track } from '@/lib/types';
import { getDB, setDB } from '@/lib/mockData';

type RepeatMode = 'OFF' | 'PLAYLIST' | 'TRACK';

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  queue: Track[];
  playlist: Track[];
  playTrack: (track: Track, list?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  stopAndClosePlayer: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('OFF');
  const [isShuffle, setIsShuffle] = useState(false);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;

    const handleTimeUpdate = () => {
      if (audioRef.current) setProgress(audioRef.current.currentTime);
    };
    const handleLoadedMetadata = () => {
      if (audioRef.current) setDuration(audioRef.current.duration || 100);
    };
    const handleEnded = () => {
      handleTrackEnd();
    };

    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioRef.current.addEventListener('ended', handleEnded);

    const handleLogoutShutdown = () => {
      stopAndClosePlayer();
    };
    window.addEventListener('auth_logout', handleLogoutShutdown);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.removeEventListener('ended', handleEnded);
      }
      window.removeEventListener('auth_logout', handleLogoutShutdown);
    };
  }, []);

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  };

  const stopAndClosePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setProgress(0);
    setDuration(0);
    setPlaylist([]);
    setQueue([]);
  };

  // ROBUST PLAY TRACK & QUEUE SYNC ENGINE
  const playTrack = (track: Track, list: Track[] = []) => {
    let activePlaylist = playlist;
    if (list.length > 0) {
      activePlaylist = list;
      setPlaylist(list);
    }

    // Find index in activePlaylist
    const idx = activePlaylist.findIndex(t => t.id === track.id);
    if (idx !== -1) {
      setQueue(activePlaylist.slice(idx + 1));
    } else {
      // If track is clicked from queue, find it in the current queue and update upcoming queue accordingly
      const qIdx = queue.findIndex(t => t.id === track.id);
      if (qIdx !== -1) {
        setQueue(queue.slice(qIdx + 1));
      } else {
        // Fallback: If not found anywhere, keep existing queue or set empty
        setQueue([]);
      }
    }

    setCurrentTrack(track);
    setIsPlaying(true);

    if (audioRef.current) {
      audioRef.current.src = track.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      audioRef.current.play().catch(() => setIsPlaying(false));
    }

    // Register analytics stream count
    const allTracks = getDB<Track[]>('db_tracks', []);
    const updatedTracks = allTracks.map(t => {
      if (t.id === track.id) {
        return {
          ...t,
          totalStreams: (t.totalStreams || t.listenersCount * 2) + 1,
          listenersCount: t.listenersCount + 1
        };
      }
      return t;
    });
    setDB('db_tracks', updatedTracks);
  };

  const togglePlay = () => {
    if (!currentTrack || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const toggleRepeat = () => {
    const modes: RepeatMode[] = ['OFF', 'PLAYLIST', 'TRACK'];
    const nextIdx = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIdx]);
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const nextTrack = () => {
    if (!currentTrack || playlist.length === 0) return;

    if (repeatMode === 'TRACK') {
      seek(0);
      if (audioRef.current) audioRef.current.play();
      return;
    }

    if (isShuffle) {
      const randomIdx = Math.floor(Math.random() * playlist.length);
      playTrack(playlist[randomIdx], playlist);
      return;
    }

    const currentIdx = playlist.findIndex(t => t.id === currentTrack.id);
    if (currentIdx < playlist.length - 1) {
      playTrack(playlist[currentIdx + 1], playlist);
    } else if (repeatMode === 'PLAYLIST') {
      playTrack(playlist[0], playlist);
    } else {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    }
  };

  const prevTrack = () => {
    if (!currentTrack || !audioRef.current) return;

    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }

    if (playlist.length === 0) return;

    const currentIdx = playlist.findIndex(t => t.id === currentTrack.id);
    const prevIdx = currentIdx <= 0 ? playlist.length - 1 : currentIdx - 1;
    const previousSong = playlist[prevIdx];

    playTrack(previousSong, playlist);
  };

  const handleTrackEnd = () => {
    nextTrack();
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      progress,
      duration,
      volume,
      repeatMode,
      isShuffle,
      queue,
      playlist,
      playTrack,
      togglePlay,
      nextTrack,
      prevTrack,
      seek,
      setVolume,
      toggleRepeat,
      toggleShuffle,
      stopAndClosePlayer
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider');
  return context;
};