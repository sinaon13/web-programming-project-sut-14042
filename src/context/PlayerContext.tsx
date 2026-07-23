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

  // Initialize native HTMLAudioElement
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

    // UPGRADED: Listen for logout signal from AuthContext to shut down player!
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

  // Sync volume changes
  const setVolume = (vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  };

  // FULL SHUTDOWN: Pauses audio and hides player bar completely
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

  // Play Track & Register Analytics
  const playTrack = (track: Track, list: Track[] = []) => {
    if (list.length > 0) {
      setPlaylist(list);
      const idx = list.findIndex(t => t.id === track.id);
      const upcoming = idx !== -1 ? list.slice(idx + 1) : [];
      setQueue(upcoming);
    }

    setCurrentTrack(track);
    setIsPlaying(true);

    if (audioRef.current) {
      audioRef.current.src = track.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      audioRef.current.play().catch(() => setIsPlaying(false));
    }

    // Increment stream count in mock database
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

  // Smart Next Track Engine
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

  // UPGRADED BACK BUTTON: 3-Second double-click rule!
  const prevTrack = () => {
    if (!currentTrack || !audioRef.current) return;

    // Rule 1: If song played for more than 3 seconds, pressing Back once restarts the current song!
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }

    // Rule 2: If under 3 seconds (double click), jump to the PREVIOUS song in the list!
    if (playlist.length === 0) return;

    const currentIdx = playlist.findIndex(t => t.id === currentTrack.id);
    // If on the first track, smartly loop around to the last track in the album/playlist!
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