'use client';
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Track } from '@/lib/types';

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
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (vol: number) => void;
  seek: (time: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
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
  const [queue, setQueue] = useState<Track[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef({ repeatMode, isShuffle, queue });
  
  useEffect(() => {
    stateRef.current = { repeatMode, isShuffle, queue };
  }, [repeatMode, isShuffle, queue]);

  const safePlay = () => {
    if (!audioRef.current) return;
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        if (error.name !== 'AbortError') console.error("Playback error:", error);
      });
    }
  };

  const nextTrack = () => {
    const { repeatMode: rep, isShuffle: shuf, queue: q } = stateRef.current;
    if (rep === 'TRACK' && audioRef.current) {
      audioRef.current.currentTime = 0;
      safePlay();
      return;
    }
    if (q.length > 0) {
      const nextIndex = shuf ? Math.floor(Math.random() * q.length) : 0;
      const next = q[nextIndex];
      setQueue(q.filter((_, idx) => idx !== nextIndex));
      if (audioRef.current) {
        audioRef.current.src = next.audioUrl;
        audioRef.current.volume = volume;
        safePlay();
        setCurrentTrack(next);
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(false);
    }
  };

  const nextTrackRef = useRef(nextTrack);
  useEffect(() => { nextTrackRef.current = nextTrack; });

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.volume = volume;
    audio.ontimeupdate = () => setProgress(audio.currentTime);
    audio.onloadedmetadata = () => setDuration(audio.duration || 180);
    audio.onended = () => { nextTrackRef.current(); };
    return () => { audio.pause(); };
  }, []);

  const playTrack = (track: Track, newQueue: Track[] = []) => {
    if (!audioRef.current) return;
    if (newQueue.length) setQueue(newQueue);
    audioRef.current.src = track.audioUrl;
    audioRef.current.volume = volume;
    safePlay();
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) audioRef.current.pause();
    else safePlay();
    setIsPlaying(!isPlaying);
  };

  const prevTrack = () => {
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const toggleRepeat = () => {
    const modes: RepeatMode[] = ['OFF', 'PLAYLIST', 'TRACK'];
    setRepeatMode(modes[(modes.indexOf(repeatMode) + 1) % modes.length]);
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);

  return (
    <PlayerContext.Provider value={{
      currentTrack, isPlaying, progress, duration, volume, repeatMode, isShuffle, queue,
      playTrack, togglePlay, nextTrack, prevTrack, setVolume, seek, toggleRepeat, toggleShuffle
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