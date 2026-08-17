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
  queue: Track[]; // Exposed to UI (explicitQueue + contextQueue)
  playlist: Track[]; // Deprecated semantic name, mapped to contextList
  audioQuality: AudioQuality;
  crossfadeEnabled: boolean;
  accentColor: string;
  playTrack: (track: Track, list?: Track[]) => void;
  addToQueue: (track: Track) => void;
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
          if (data[i] + data[i+1] + data[i+2] < 60) continue;
          if (data[i] + data[i+1] + data[i+2] > 700) continue;
          r += data[i]; g += data[i+1]; b += data[i+2]; count++;
        }
        if (count === 0) { resolve('#22c55e'); return; }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
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

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('OFF');
  const [isShuffle, setIsShuffle] = useState(false);
  
  // Spotify Queue Logic
  const [contextList, setContextList] = useState<Track[]>([]);
  const [contextQueue, setContextQueue] = useState<Track[]>([]);
  const [explicitQueue, setExplicitQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);

  const [audioQuality, setAudioQualityState] = useState<AudioQuality>('HIGH');
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(false);
  const [accentColor, setAccentColor] = useState('#22c55e');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const crossfadeAudioRef = useRef<HTMLAudioElement | null>(null);
  const crossfadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFadingRef = useRef<boolean>(false);
  const fadingTrackRef = useRef<Track | null>(null);
  const volumeRef = useRef<number>(0.8);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Helper to get correct audio URL
  const getAudioUrl = useCallback((track: Track | null, quality: AudioQuality): string => {
    if (!track) return '';
    let url = track.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    let queryParams = [];
    if (quality === 'LOW') queryParams.push('quality=low');
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) queryParams.push(`token=${token}`);
    }
    if (queryParams.length > 0 && url.includes('/api/music/tracks/')) {
      url += '?' + queryParams.join('&');
    }
    return url;
  }, []);

  const syncAudioState = useCallback(() => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      if (!isNaN(cur) && isFinite(cur)) {
        setProgress(cur);
      }
      if (!isNaN(dur) && isFinite(dur) && dur > 0) {
        setDuration(dur);
      }
    }
  }, []);

  const attachAudioListeners = useCallback((audio: HTMLAudioElement) => {
    audio.addEventListener('timeupdate', syncAudioState);
    audio.addEventListener('loadedmetadata', syncAudioState);
    audio.addEventListener('durationchange', syncAudioState);
    audio.addEventListener('canplay', syncAudioState);
    audio.addEventListener('canplaythrough', syncAudioState);
    audio.addEventListener('progress', syncAudioState);
  }, [syncAudioState]);

  const detachAudioListeners = useCallback((audio: HTMLAudioElement) => {
    audio.removeEventListener('timeupdate', syncAudioState);
    audio.removeEventListener('loadedmetadata', syncAudioState);
    audio.removeEventListener('durationchange', syncAudioState);
    audio.removeEventListener('canplay', syncAudioState);
    audio.removeEventListener('canplaythrough', syncAudioState);
    audio.removeEventListener('progress', syncAudioState);
    audio.onended = null;
  }, [syncAudioState]);

  const stopAndClosePlayer = useCallback(() => {
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    isFadingRef.current = false;
    fadingTrackRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    if (crossfadeAudioRef.current) {
      crossfadeAudioRef.current.pause();
      crossfadeAudioRef.current.currentTime = 0;
      crossfadeAudioRef.current.src = '';
      crossfadeAudioRef.current.volume = 0;
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setProgress(0);
    setDuration(0);
    setContextList([]);
    setContextQueue([]);
    setExplicitQueue([]);
    setHistory([]);
    setAccentColor('#22c55e');
  }, []);

  // Initialize audio elements once
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volumeRef.current;
    crossfadeAudioRef.current = new Audio();
    crossfadeAudioRef.current.volume = 0;

    const curAudio = audioRef.current;
    attachAudioListeners(curAudio);

    const handleLogoutShutdown = () => {
      stopAndClosePlayer();
    };
    window.addEventListener('auth_logout', handleLogoutShutdown);

    return () => {
      if (curAudio) {
        curAudio.pause();
        detachAudioListeners(curAudio);
      }
      if (crossfadeAudioRef.current) {
        crossfadeAudioRef.current.pause();
        detachAudioListeners(crossfadeAudioRef.current);
      }
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
      }
      window.removeEventListener('auth_logout', handleLogoutShutdown);
    };
  }, [attachAudioListeners, detachAudioListeners, stopAndClosePlayer]);

  // Clean transition to play a new track directly
  const _playNewTrack = useCallback((track: Track) => {
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    isFadingRef.current = false;
    fadingTrackRef.current = null;

    if (crossfadeAudioRef.current) {
      crossfadeAudioRef.current.pause();
      crossfadeAudioRef.current.volume = 0;
      crossfadeAudioRef.current.src = '';
    }

    if (audioRef.current) {
      audioRef.current.src = getAudioUrl(track, audioQuality);
      audioRef.current.volume = volumeRef.current;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }

    setCurrentTrack(track);
    setProgress(0);
    setDuration(0);
    setIsPlaying(true);

    if (track.coverUrl) {
      extractDominantColor(track.coverUrl).then(setAccentColor).catch(() => setAccentColor('#22c55e'));
    }

    musicAPI.streamTrack(track.id).catch(err => {
      console.warn('Failed to log stream:', err.message);
    });
  }, [audioQuality, getAudioUrl]);

  // Next Track Logic
  const nextTrack = useCallback((forceNext = true) => {
    if (!currentTrack) return;

    // Handle repeat TRACK if naturally ended
    if (!forceNext && repeatMode === 'TRACK') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      return;
    }

    // Check if crossfade is currently active and fading into fadingTrackRef
    if (isFadingRef.current && fadingTrackRef.current && crossfadeAudioRef.current) {
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
        crossfadeIntervalRef.current = null;
      }

      const nextT = fadingTrackRef.current;
      isFadingRef.current = false;
      fadingTrackRef.current = null;

      // Stop old audio
      const oldAudio = audioRef.current;
      if (oldAudio) {
        oldAudio.pause();
        oldAudio.volume = 0;
        detachAudioListeners(oldAudio);
      }

      // Swap refs so the new audio becomes primary
      const newAudio = crossfadeAudioRef.current;
      newAudio.volume = volumeRef.current;
      attachAudioListeners(newAudio);

      audioRef.current = newAudio;
      crossfadeAudioRef.current = oldAudio;

      // Advance queues
      if (explicitQueue.length > 0 && explicitQueue[0].id === nextT.id) {
        setExplicitQueue(prev => prev.slice(1));
      } else if (contextQueue.length > 0 && contextQueue[0].id === nextT.id) {
        setContextQueue(prev => prev.slice(1));
      } else if (repeatMode === 'PLAYLIST' && contextList.length > 0) {
        const list = isShuffle ? shuffleArray(contextList) : [...contextList];
        setContextQueue(list.slice(1));
      }

      setHistory(prev => [...prev, currentTrack].slice(-50));
      setCurrentTrack(nextT);
      setIsPlaying(true);
      if (nextT.coverUrl) {
        extractDominantColor(nextT.coverUrl).then(setAccentColor).catch(() => setAccentColor('#22c55e'));
      }
      musicAPI.streamTrack(nextT.id).catch(() => {});
      return;
    }

    // Regular Next track resolution
    let nextT: Track | null = null;
    let newExplicitQueue = [...explicitQueue];
    let newContextQueue = [...contextQueue];

    if (newExplicitQueue.length > 0) {
      nextT = newExplicitQueue.shift()!;
      setExplicitQueue(newExplicitQueue);
    } else if (newContextQueue.length > 0) {
      nextT = newContextQueue.shift()!;
      setContextQueue(newContextQueue);
    } else if (repeatMode === 'PLAYLIST' && contextList.length > 0) {
      const list = isShuffle ? shuffleArray(contextList) : [...contextList];
      nextT = list.shift()!;
      setContextQueue(list);
    }

    if (nextT) {
      setHistory(prev => [...prev, currentTrack].slice(-50));
      _playNewTrack(nextT);
    } else {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [currentTrack, repeatMode, explicitQueue, contextQueue, contextList, isShuffle, attachAudioListeners, detachAudioListeners, _playNewTrack]);

  // Hook onended to primary audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => nextTrack(false);
    }
  }, [nextTrack]);

  // Active Crossfade Monitoring Engine (5s overlap before end of song)
  useEffect(() => {
    if (!crossfadeEnabled || !audioRef.current || !currentTrack || !isPlaying) return;

    const interval = setInterval(() => {
      if (!audioRef.current || !currentTrack || isFadingRef.current) return;
      const cur = audioRef.current.currentTime;
      const dur = audioRef.current.duration;

      // When track is within 5 seconds of the end
      if (dur && isFinite(dur) && dur > 6 && cur >= dur - 5 && cur < dur - 0.2) {
        // Resolve upcoming track
        let nextT: Track | null = null;
        if (repeatMode === 'TRACK') {
          nextT = currentTrack;
        } else if (explicitQueue.length > 0) {
          nextT = explicitQueue[0];
        } else if (contextQueue.length > 0) {
          nextT = contextQueue[0];
        } else if (repeatMode === 'PLAYLIST' && contextList.length > 0) {
          nextT = isShuffle ? shuffleArray(contextList)[0] : contextList[0];
        }

        if (nextT && crossfadeAudioRef.current) {
          isFadingRef.current = true;
          fadingTrackRef.current = nextT;

          crossfadeAudioRef.current.src = getAudioUrl(nextT, audioQuality);
          crossfadeAudioRef.current.currentTime = 0;
          crossfadeAudioRef.current.volume = 0;
          crossfadeAudioRef.current.play().catch(() => {});

          let step = 0;
          const totalSteps = 100; // 100 steps * 50ms = 5000ms
          if (crossfadeIntervalRef.current) clearInterval(crossfadeIntervalRef.current);

          crossfadeIntervalRef.current = setInterval(() => {
            step++;
            const ratio = Math.min(1, step / totalSteps);
            const targetVol = volumeRef.current;

            if (audioRef.current) {
              audioRef.current.volume = Math.max(0, targetVol * (1 - ratio));
            }
            if (crossfadeAudioRef.current) {
              crossfadeAudioRef.current.volume = Math.min(targetVol, targetVol * ratio);
            }

            if (ratio >= 1) {
              if (crossfadeIntervalRef.current) {
                clearInterval(crossfadeIntervalRef.current);
                crossfadeIntervalRef.current = null;
              }
            }
          }, 50);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [crossfadeEnabled, currentTrack, isPlaying, explicitQueue, contextQueue, contextList, isShuffle, repeatMode, audioQuality, getAudioUrl]);

  const playTrack = useCallback((track: Track, list: Track[] = []) => {
    let newContextList = contextList;
    if (list.length > 0) {
      newContextList = list;
      setContextList(list);
    }
    
    // Clear explicit queue when user forces a new context/track directly
    setExplicitQueue([]);

    if (currentTrack) {
      setHistory(prev => [...prev, currentTrack].slice(-50));
    }

    // Determine upcoming context queue
    const trackIndex = newContextList.findIndex(t => t.id === track.id);
    let remainingTracks = trackIndex !== -1 ? newContextList.slice(trackIndex + 1) : [];

    if (isShuffle) {
      setContextQueue(shuffleArray(remainingTracks));
    } else {
      setContextQueue(remainingTracks);
    }

    _playNewTrack(track);
  }, [contextList, currentTrack, isShuffle, _playNewTrack]);

  const addToQueue = useCallback((track: Track) => {
    setExplicitQueue(prev => [...prev, track]);
  }, []);

  const togglePlay = useCallback(() => {
    if (!currentTrack || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      if (isFadingRef.current && crossfadeAudioRef.current) {
        crossfadeAudioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        if (isFadingRef.current && crossfadeAudioRef.current) {
          crossfadeAudioRef.current.play().catch(() => {});
        }
      }).catch(() => setIsPlaying(false));
    }
  }, [currentTrack, isPlaying]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      // If seeking during crossfade, cancel fade and restore volume
      if (isFadingRef.current) {
        if (crossfadeIntervalRef.current) {
          clearInterval(crossfadeIntervalRef.current);
          crossfadeIntervalRef.current = null;
        }
        if (crossfadeAudioRef.current) {
          crossfadeAudioRef.current.pause();
          crossfadeAudioRef.current.volume = 0;
        }
        isFadingRef.current = false;
        fadingTrackRef.current = null;
        audioRef.current.volume = volumeRef.current;
      }
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    volumeRef.current = vol;
    if (audioRef.current && !isFadingRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const setAudioQuality = (q: AudioQuality) => {
    setAudioQualityState(q);
    if (audioRef.current && currentTrack) {
      const currentTime = audioRef.current.currentTime;
      audioRef.current.src = getAudioUrl(currentTrack, q);
      audioRef.current.currentTime = currentTime;
      if (isPlaying) audioRef.current.play().catch(() => {});
    }
  };

  const toggleCrossfade = () => {
    setCrossfadeEnabled(prev => {
      const nextVal = !prev;
      if (!nextVal) {
        if (crossfadeIntervalRef.current) {
          clearInterval(crossfadeIntervalRef.current);
          crossfadeIntervalRef.current = null;
        }
        if (crossfadeAudioRef.current) {
          crossfadeAudioRef.current.pause();
          crossfadeAudioRef.current.volume = 0;
        }
        isFadingRef.current = false;
        fadingTrackRef.current = null;
        if (audioRef.current) {
          audioRef.current.volume = volumeRef.current;
        }
      }
      return nextVal;
    });
  };

  const toggleRepeat = useCallback(() => {
    const modes: RepeatMode[] = ['OFF', 'PLAYLIST', 'TRACK'];
    setRepeatMode(prev => modes[(modes.indexOf(prev) + 1) % modes.length]);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prevShuffle => {
      const newShuffle = !prevShuffle;
      if (newShuffle) {
        setContextQueue(prevQueue => shuffleArray(prevQueue));
      } else {
        if (currentTrack) {
          const trackIndex = contextList.findIndex(t => t.id === currentTrack.id);
          setContextQueue(trackIndex !== -1 ? contextList.slice(trackIndex + 1) : []);
        }
      }
      return newShuffle;
    });
  }, [currentTrack, contextList]);

  const prevTrack = useCallback(() => {
    if (!currentTrack || !audioRef.current) return;

    if (audioRef.current.currentTime > 3 || history.length === 0) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }

    const newHistory = [...history];
    const previousSong = newHistory.pop()!;
    setHistory(newHistory);
    
    setContextQueue(prev => [currentTrack, ...prev]);
    _playNewTrack(previousSong);
  }, [currentTrack, history, isPlaying, _playNewTrack]);

  // Expose combined queue for UI
  const queue = [...explicitQueue, ...contextQueue];
  const playlist = contextList; // For backwards compatibility

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
      addToQueue,
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
