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
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="inline-block mr-1 -mt-0.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  {(currentTrack.totalStreams || currentTrack.listenersCount * 2).toLocaleString()} {t.streams} • 👤 {currentTrack.listenersCount.toLocaleString()} {t.unique}
                </div>
              )}
            </div>
          </div>

          <button onClick={() => setIsFullScreen(true)} className="md:hidden text-xs font-bold px-3 py-1.5 rounded border transition" style={{ backgroundColor: `${accentColor}20`, color: accentColor, borderColor: `${accentColor}50` }}>
            {t.expandPlayer}
          </button>
        </div>

        <div className="flex flex-col items-center w-full md:w-2/4">
          <div className="flex items-center space-x-4 mb-2">
            <button onClick={toggleShuffle} className={`p-1.5 transition rounded-full ${isShuffle ? 'bg-white/10' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`} style={isShuffle ? { color: accentColor } : {}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
            </button>
            <button onClick={prevTrack} className="p-1.5 text-neutral-400 hover:text-white transition rounded-full hover:bg-white/5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></line></svg>
            </button>
            <button onClick={togglePlay} className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition transform active:scale-95" style={{ backgroundColor: accentColor || '#1db954', color: '#000' }}>
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              )}
            </button>
            <button onClick={nextTrack} className="p-1.5 text-neutral-400 hover:text-white transition rounded-full hover:bg-white/5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></line></svg>
            </button>
            <button onClick={toggleRepeat} className={`p-1.5 transition rounded-full flex items-center ${repeatMode !== 'OFF' ? 'bg-white/10' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`} style={repeatMode !== 'OFF' ? { color: accentColor } : {}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
              {repeatMode === 'ONE' && <span className="absolute text-[8px] font-bold mt-0.5" style={{ marginLeft: '6px' }}>1</span>}
            </button>
            <div className="ml-2 scale-90 opacity-80 hover:opacity-100 transition"><DownloadButton track={currentTrack} /></div>
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
          <button onClick={() => setShowQueue(!showQueue)} className={`text-xs px-2.5 py-1 rounded border font-bold transition flex items-center gap-1.5 ${showQueue ? 'text-black' : 'bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700'}`} style={showQueue ? { backgroundColor: accentColor, borderColor: accentColor } : {}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
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
        <div className="fixed inset-0 z-50 flex flex-col justify-between p-6 md:p-12 overflow-y-auto animate-fadeIn bg-neutral-950" style={{ background: accentColor ? `linear-gradient(to bottom, ${accentColor}30, #171717, #000)` : undefined }}>
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
              <button onClick={toggleShuffle} className={`p-3 transition rounded-full ${isShuffle ? 'bg-white/10' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`} style={isShuffle ? { color: accentColor } : {}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
              </button>
              <button onClick={prevTrack} className="p-3 text-neutral-300 hover:text-white transition rounded-full hover:bg-white/5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></line></svg>
              </button>
              <button onClick={togglePlay} className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition transform active:scale-95" style={{ backgroundColor: accentColor || '#1db954', color: '#000' }}>
                {isPlaying ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '4px' }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                )}
              </button>
              <button onClick={nextTrack} className="p-3 text-neutral-300 hover:text-white transition rounded-full hover:bg-white/5">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></line></svg>
              </button>
              <button onClick={toggleRepeat} className={`p-3 transition rounded-full flex items-center justify-center relative ${repeatMode !== 'OFF' ? 'bg-white/10' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`} style={repeatMode !== 'OFF' ? { color: accentColor } : {}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                {repeatMode === 'ONE' && <span className="absolute text-[10px] font-bold" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>1</span>}
              </button>
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