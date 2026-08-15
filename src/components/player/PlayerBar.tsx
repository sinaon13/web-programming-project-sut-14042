'use client';
import React, { useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { DownloadButton } from '@/components/ui/DownloadButton';
import Link from 'next/link';

export const PlayerBar: React.FC = () => {
  const {
    currentTrack, isPlaying, togglePlay, nextTrack, prevTrack,
    progress, duration, seek, volume, setVolume, repeatMode,
    toggleRepeat, isShuffle, toggleShuffle, queue, playTrack,
    audioQuality, setAudioQuality, crossfadeEnabled, toggleCrossfade, accentColor
  } = usePlayer();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (!currentTrack) return null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Dynamic accent style from cover art color
  const accentStyle = { '--player-accent': accentColor } as React.CSSProperties;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 p-3 px-6 flex flex-col md:flex-row items-center justify-between z-40 shadow-2xl" style={accentStyle}>
        <div className="flex items-center justify-between w-full md:w-1/4 mb-2 md:mb-0">
          <div className="flex items-center space-x-3 truncate">
            {/* Cover art with accent border synced to dominant color */}
            <img src={currentTrack.coverUrl} alt="Cover" className="w-12 h-12 rounded object-cover flex-shrink-0" style={{ borderWidth: 2, borderStyle: 'solid', borderColor: accentColor }} />
            <div className="truncate px-2">
              <h4 className="text-sm font-bold text-white truncate">{currentTrack.title}</h4>
              <div className="text-xs text-neutral-400 truncate flex items-center gap-1">
                <Link href={`/artist/${currentTrack.artistId}`} className="hover:text-white underline">{currentTrack.artistName}</Link>
                <span>•</span>
                {currentTrack.albumId ? <Link href={`/albums/${currentTrack.albumId}`} className="hover:text-white underline">{currentTrack.album}</Link> : <span>{currentTrack.album}</span>}
              </div>
              {currentUser?.tier === 'GOLD' && (
                <div className="text-[10px] text-amber-400 font-mono mt-0.5 truncate hidden sm:block">
                  ▶ {(currentTrack.totalStreams || currentTrack.listenersCount * 2).toLocaleString()} {t.streams} • 👤 {currentTrack.listenersCount.toLocaleString()} {t.unique}
                </div>
              )}
            </div>
          </div>

          <button onClick={() => setIsFullScreen(true)} className="md:hidden text-xs font-bold px-3 py-1.5 rounded border transition" style={{ backgroundColor: `${accentColor}20`, color: accentColor, borderColor: `${accentColor}50` }}>
            {t.expandPlayer}
          </button>
        </div>

        <div className="flex flex-col items-center w-full md:w-2/4">
          <div className="flex items-center space-x-3 mb-1">
            <button onClick={toggleShuffle} className={`text-xs font-bold px-1 ${isShuffle ? '' : 'text-neutral-400 hover:text-white'}`} style={isShuffle ? { color: accentColor } : {}}>{t.shuffle}</button>
            <button onClick={prevTrack} className="text-neutral-400 hover:text-white">⏮</button>
            <button onClick={togglePlay} className="w-9 h-9 rounded-full flex items-center justify-center font-bold shadow hover:scale-105 transition" style={{ backgroundColor: accentColor, color: '#000' }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={nextTrack} className="text-neutral-400 hover:text-white">⏭</button>
            <button onClick={toggleRepeat} className={`text-xs font-bold px-1 ${repeatMode !== 'OFF' ? '' : 'text-neutral-400 hover:text-white'}`} style={repeatMode !== 'OFF' ? { color: accentColor } : {}}>{t.rep} [{repeatMode}]</button>
            <DownloadButton track={currentTrack} />
          </div>

          <div className="flex items-center space-x-2 w-full max-w-md">
            <span className="text-[10px] text-neutral-400 w-8 text-center font-mono">{formatTime(progress)}</span>
            <input
              type="range" min="0" max={duration || 100} value={progress}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor }}
            />
            <span className="text-[10px] text-neutral-400 w-8 text-center font-mono">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-end space-x-2 w-1/4">
          {/* Advanced Player Controls */}
          <button
            onClick={toggleCrossfade}
            title={crossfadeEnabled ? 'Crossfade: ON (5s)' : 'Crossfade: OFF'}
            className={`text-[10px] px-2 py-0.5 rounded border font-bold transition ${crossfadeEnabled ? 'text-black' : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'}`}
            style={crossfadeEnabled ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
          >
            ✕fade {crossfadeEnabled ? 'ON' : 'OFF'}
          </button>
          <select
            value={audioQuality}
            onChange={(e) => setAudioQuality(e.target.value as 'LOW' | 'HIGH')}
            title="Audio Quality"
            className="text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700 rounded px-1.5 py-0.5 cursor-pointer hover:bg-neutral-700 transition"
          >
            <option value="LOW">128kbps</option>
            <option value="HIGH">320kbps</option>
          </select>
          <button onClick={() => setIsFullScreen(true)} className="text-xs font-bold px-2.5 py-1 rounded border transition" style={{ backgroundColor: `${accentColor}20`, color: accentColor, borderColor: `${accentColor}50` }}>
            {t.expandPlayer}
          </button>
          <button onClick={() => setShowQueue(!showQueue)} className={`text-xs px-2.5 py-1 rounded border font-bold transition ${showQueue ? 'text-black' : 'bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700'}`} style={showQueue ? { backgroundColor: accentColor, borderColor: accentColor } : {}}>
            {t.queue} ({queue.length})
          </button>
          {currentTrack.lyrics && (
            <button onClick={() => setShowLyrics(true)} className="text-xs bg-neutral-800 px-2.5 py-1 rounded text-neutral-300 hover:text-white border border-neutral-700">{t.lyrics}</button>
          )}
          <span className="text-xs text-neutral-400 px-1">{t.vol}</span>
          <input
            type="range" min="0" max="1" step="0.05" value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1"
            style={{ accentColor }}
          />
        </div>
      </div>

      {isFullScreen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between p-6 md:p-12 overflow-y-auto animate-fadeIn" style={{ background: `linear-gradient(to bottom, ${accentColor}30, #171717, #000)` }}>
          <div className="flex justify-between items-center w-full max-w-2xl mx-auto border-b border-neutral-800 pb-4">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>Now Playing in Full Screen</span>
            <button onClick={() => setIsFullScreen(false)} className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full font-bold text-xs border border-neutral-700 transition">
              {t.collapsePlayer}
            </button>
          </div>

          <div className="flex flex-col items-center justify-center my-auto py-8 text-center max-w-md mx-auto w-full">
            <img src={currentTrack.coverUrl} className="w-64 h-64 sm:w-80 sm:h-80 rounded-2xl object-cover shadow-2xl mb-6" style={{ borderWidth: 3, borderStyle: 'solid', borderColor: accentColor }} />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">{currentTrack.title}</h2>
            <Link href={`/artist/${currentTrack.artistId}`} onClick={() => setIsFullScreen(false)} className="text-sm hover:underline font-bold mb-4 block" style={{ color: accentColor }}>
              {currentTrack.artistName}
            </Link>

            <div className="flex items-center space-x-2 w-full mb-6">
              <span className="text-xs text-neutral-400 w-10 font-mono">{formatTime(progress)}</span>
              <input
                type="range" min="0" max={duration || 100} value={progress}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor }}
              />
              <span className="text-xs text-neutral-400 w-10 font-mono">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-center space-x-6 mb-8">
              <button onClick={toggleShuffle} className={`text-sm font-bold ${isShuffle ? '' : 'text-neutral-400 hover:text-white'}`} style={isShuffle ? { color: accentColor } : {}}>{t.shuffle}</button>
              <button onClick={prevTrack} className="text-2xl text-neutral-300 hover:text-white">⏮</button>
              <button onClick={togglePlay} className="w-16 h-16 rounded-full flex items-center justify-center font-extrabold text-2xl shadow-xl hover:scale-105 transition" style={{ backgroundColor: accentColor, color: '#000' }}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button onClick={nextTrack} className="text-2xl text-neutral-300 hover:text-white">⏭</button>
              <button onClick={toggleRepeat} className={`text-sm font-bold ${repeatMode !== 'OFF' ? '' : 'text-neutral-400 hover:text-white'}`} style={repeatMode !== 'OFF' ? { color: accentColor } : {}}>{t.rep} [{repeatMode}]</button>
            </div>

            {/* Advanced controls in fullscreen */}
            <div className="flex items-center justify-center gap-4 mb-6 w-full border-t border-neutral-800 pt-5">
              <button
                onClick={toggleCrossfade}
                className={`px-4 py-2 text-xs font-bold rounded-full border transition ${crossfadeEnabled ? 'text-black' : 'bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700'}`}
                style={crossfadeEnabled ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
              >
                Crossfade {crossfadeEnabled ? '5s ON' : 'OFF'}
              </button>
              <select
                value={audioQuality}
                onChange={(e) => setAudioQuality(e.target.value as 'LOW' | 'HIGH')}
                className="text-xs bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-full px-4 py-2 cursor-pointer hover:bg-neutral-700 transition font-bold"
              >
                <option value="LOW">Quality: 128kbps</option>
                <option value="HIGH">Quality: 320kbps</option>
              </select>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">{t.vol}</span>
                <input
                  type="range" min="0" max="1" step="0.05" value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-24 h-1"
                  style={{ accentColor }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full border-t border-neutral-800 pt-6">
              <DownloadButton track={currentTrack} />
              <button onClick={() => { setIsFullScreen(false); setShowQueue(true); }} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-full border border-neutral-700">
                {t.queue} ({queue.length})
              </button>
              {currentTrack.lyrics && (
                <button onClick={() => { setIsFullScreen(false); setShowLyrics(true); }} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-full border border-neutral-700">
                  {t.lyrics}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showQueue && (
        <div className="fixed bottom-16 right-6 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-4 z-50 text-left max-h-96 flex flex-col">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-3">
            <h4 className="text-sm font-bold text-white">{t.upNext} ({queue.length})</h4>
            <button onClick={() => setShowQueue(false)} className="text-neutral-500 hover:text-white text-xs">✕</button>
          </div>

          {queue.length === 0 ? (
            <p className="text-xs text-neutral-500 py-6 text-center">{t.emptyQueue}</p>
          ) : (
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {queue.map((tItem, idx) => (
                <div key={tItem.id + idx} className="flex items-center justify-between p-2 bg-black/40 rounded border border-neutral-800/60 hover:border-neutral-700 transition">
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold text-white truncate">{idx + 1}. {tItem.title}</p>
                    <span className="text-[10px] text-neutral-400">{tItem.artistName}</span>
                  </div>
                  <button onClick={() => playTrack(tItem)} className="text-[11px] font-bold px-2 py-0.5 rounded transition" style={{ backgroundColor: `${accentColor}30`, color: accentColor }}>
                    {t.play}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showLyrics && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl max-w-md w-full text-center shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">{currentTrack.title}</h3>
            <p className="text-xs text-neutral-400 mb-6">By {currentTrack.artistName}</p>
            <div className="bg-black/50 p-4 rounded-lg border border-neutral-800 max-h-60 overflow-y-auto text-neutral-300 text-sm whitespace-pre-wrap leading-relaxed">
              {currentTrack.lyrics}
            </div>
            <button onClick={() => setShowLyrics(false)} className="mt-6 px-6 py-2 text-black font-bold rounded text-sm hover:opacity-80 transition" style={{ backgroundColor: accentColor }}>{t.closeLyrics}</button>
          </div>
        </div>
      )}
    </>
  );
};