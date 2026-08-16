'use client';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Track } from '@/lib/types';
import { musicAPI } from '@/lib/api';

type RepeatMode = 'OFF' | 'PLAYLIST' | 'TRACK';
type AudioQuality = 'LOW' | 'HIGH';

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
  // Advanced player features (bonus)
  audioQuality: AudioQuality;
  crossfadeEnabled: boolean;
  accentColor: string;
  playTrack: (track: Track, list?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  stopAndClosePlayer: () => void;
  setAudioQuality: (q: AudioQuality) => void;
  toggleCrossfade: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

/**
 * Extract a dominant color from an image URL using a canvas.
 * Returns an HSL string for use as an accent color.
 */
function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve('#22c55e'); return; }
        canvas.width = 8;
        canvas.height = 8;
        ctx.drawImage(img, 0, 0, 8, 8);
        const data = ctx.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Skip near-black and near-white pixels
          if (data[i] + data[i+1] + data[i+2] < 60) continue;
          if (data[i] + data[i+1] + data[i+2] > 700) continue;
          r += data[i]; g += data[i+1]; b += data[i+2]; count++;
        }
        if (count === 0) { resolve('#22c55e'); return; }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        // Boost saturation for a more vibrant accent
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 510;
        let s = 0, h = 0;
        if (max !== min) {
          s = l > 0.5 ? (max - min) / (510 - max - min) : (max - min) / (max + min);
          if (max === r) h = ((g - b) / (max - min)) * 60;
          else if (max === g) h = (2 + (b - r) / (max - min)) * 60;
          else h = (4 + (r - g) / (max - min)) * 60;
          if (h < 0) h += 360;
        }
        resolve(`hsl(${Math.round(h)}, ${Math.round(Math.min(s * 100, 80))}%, ${Math.round(Math.min(l * 100 + 15, 65))}%)`);
      } catch {
        resolve('#22c55e');
      }
    };
    img.onerror = () => resolve('#22c55e');
    img.src = imageUrl;
  });
}

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
  // Advanced player state
  const [audioQuality, setAudioQualityState] = useState<AudioQuality>('HIGH');
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(false);
  const [accentColor, setAccentColor] = useState('#22c55e');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const crossfadeAudioRef = useRef<HTMLAudioElement | null>(null);
  const crossfadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;
    crossfadeAudioRef.current = new Audio();
    crossfadeAudioRef.current.volume = 0;

    const handleTimeUpdate = () => {
      if (audioRef.current) setProgress(audioRef.current.currentTime);
    };
    const handleLoadedMetadata = () => {
      if (audioRef.current) setDuration(audioRef.current.duration || 100);
    };
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);

    const handleLogoutShutdown = () => {
      stopAndClosePlayer();
    };
    window.addEventListener('auth_logout', handleLogoutShutdown);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.onended = null;
      }
      if (crossfadeAudioRef.current) {
        crossfadeAudioRef.current.pause();
      }
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
      }
      window.removeEventListener('auth_logout', handleLogoutShutdown);
    };
  }, []);

  // Crossfade: monitor time remaining and start fading when < 5 seconds left
  useEffect(() => {
    if (!crossfadeEnabled || !audioRef.current) return;

    const checkCrossfade = () => {
      if (!audioRef.current || !currentTrack) return;
      const timeLeft = (audioRef.current.duration || 0) - audioRef.current.currentTime;

      if (timeLeft > 0 && timeLeft <= 5 && !crossfadeIntervalRef.current) {
        // Find the next track
        const currentIdx = playlist.findIndex(t => t.id === currentTrack.id);
        let nextIdx = -1;
        if (isShuffle) {
          nextIdx = Math.floor(Math.random() * playlist.length);
        } else if (currentIdx < playlist.length - 1) {
          nextIdx = currentIdx + 1;
        } else if (repeatMode === 'PLAYLIST') {
          nextIdx = 0;
        }

        if (nextIdx >= 0 && crossfadeAudioRef.current) {
          const nextT = playlist[nextIdx];
          crossfadeAudioRef.current.src = nextT.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
          crossfadeAudioRef.current.volume = 0;
          crossfadeAudioRef.current.play().catch(() => {});

          // 5-second crossfade with exactly 5 steps (100, 80, 60, 40, 20, 0)
          const fadeSteps = 5;
          let step = 0;
          crossfadeIntervalRef.current = setInterval(() => {
            step++;
            const ratio = step / fadeSteps; // 0.2, 0.4, 0.6, 0.8, 1.0
            if (audioRef.current) audioRef.current.volume = Math.max(0, volume * (1 - ratio));
            if (crossfadeAudioRef.current) crossfadeAudioRef.current.volume = Math.min(volume, volume * ratio);
            
            if (step >= fadeSteps) {
              if (crossfadeIntervalRef.current) clearInterval(crossfadeIntervalRef.current);
              crossfadeIntervalRef.current = null;
            }
          }, 1000); // Trigger every 1 second
        }
      }
    };

    const interval = setInterval(checkCrossfade, 500);
    return () => clearInterval(interval);
  }, [crossfadeEnabled, currentTrack, playlist, isShuffle, repeatMode, volume]);

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  };

  const setAudioQuality = (q: AudioQuality) => {
    setAudioQualityState(q);
    // In a real app, this would switch the audio source URL to a different bitrate version.
    // Since we don't have separate files, we simulate the change by briefly pausing/resuming
    // to indicate the quality has changed. The UI will reflect the selection immediately.
    if (audioRef.current && currentTrack) {
      const currentTime = audioRef.current.currentTime;
      // Re-set the source (in production this would be a different URL per quality)
      audioRef.current.src = currentTrack.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      audioRef.current.currentTime = currentTime;
      if (isPlaying) audioRef.current.play().catch(() => {});
    }
  };

  const toggleCrossfade = () => {
    setCrossfadeEnabled(prev => !prev);
    // Clean up any active crossfade
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    if (crossfadeAudioRef.current) {
      crossfadeAudioRef.current.pause();
      crossfadeAudioRef.current.volume = 0;
    }
  };

  const stopAndClosePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (crossfadeAudioRef.current) {
      crossfadeAudioRef.current.pause();
    }
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setProgress(0);
    setDuration(0);
    setPlaylist([]);
    setQueue([]);
    setAccentColor('#22c55e');
  };

  // ROBUST PLAY TRACK & QUEUE SYNC ENGINE
  const playTrack = useCallback((track: Track, list: Track[] = []) => {
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
      const qIdx = queue.findIndex(t => t.id === track.id);
      if (qIdx !== -1) {
        setQueue(queue.slice(qIdx + 1));
      } else {
        setQueue([]);
      }
    }

    // If crossfade was active, swap the incoming audio to primary
    if (crossfadeEnabled && crossfadeAudioRef.current && crossfadeAudioRef.current.src && !crossfadeAudioRef.current.paused) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = crossfadeAudioRef.current.src;
        audioRef.current.currentTime = crossfadeAudioRef.current.currentTime;
        audioRef.current.volume = volume;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
      crossfadeAudioRef.current.pause();
      crossfadeAudioRef.current.volume = 0;
    } else if (audioRef.current) {
      audioRef.current.src = track.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => setIsPlaying(false));
    }

    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }

    setCurrentTrack(track);
    setIsPlaying(true);

    // Extract accent color from cover art
    if (track.coverUrl) {
      extractDominantColor(track.coverUrl).then(setAccentColor).catch(() => setAccentColor('#22c55e'));
    }

    // 1. Send Stream Log to Django Backend (enforces daily stream limits & increments denormalized counters)
    musicAPI.streamTrack(track.id).catch(err => {
      console.warn('Failed to log stream:', err.message);
    });
  }, [playlist, queue, crossfadeEnabled, volume]);

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

  const handleTrackEnd = useCallback(() => {
    nextTrack();
  }, [nextTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = handleTrackEnd;
    }
  }, [handleTrackEnd]);

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
      audioQuality,
      crossfadeEnabled,
      accentColor,
      playTrack,
      togglePlay,
      nextTrack,
      prevTrack,
      seek,
      setVolume,
      toggleRepeat,
      toggleShuffle,
      stopAndClosePlayer,
      setAudioQuality,
      toggleCrossfade
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
