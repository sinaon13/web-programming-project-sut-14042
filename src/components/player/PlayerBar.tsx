'use client';
import React, { useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { DownloadButton } from '@/components/ui/DownloadButton';
import Link from 'next/link';

export const PlayerBar: React.FC = () => {
  const { currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, progress, duration, seek, volume, setVolume, repeatMode, toggleRepeat, isShuffle, toggleShuffle, queue, playTrack } = usePlayer();
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

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 p-3 px-6 flex flex-col md:flex-row items-center justify-between z-40 shadow-2xl">
        <div className="flex items-center justify-between w-full md:w-1/4 mb-2 md:mb-0">
          <div className="flex items-center space-x-3 truncate">
            <img src={currentTrack.coverUrl} alt="Cover" className="w-12 h-12 rounded object-cover border border-neutral-700 flex-shrink-0" />
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

          <button onClick={() => setIsFullScreen(true)} className="md:hidden text-xs bg-neutral-800 text-green-400 font-bold px-3 py-1.5 rounded border border-green-500/30">
            {t.expandPlayer}
          </button>
        </div>

        <div className="flex flex-col items-center w-full md:w-2/4">
          <div className="flex items-center space-x-3 mb-1">
            <button onClick={toggleShuffle} className={`text-xs font-bold px-1 ${isShuffle ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}>{t.shuffle}</button>
            <button onClick={prevTrack} className="text-neutral-400 hover:text-white">⏮</button>
            <button onClick={togglePlay} className="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center font-bold shadow hover:scale-105 transition">
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={nextTrack} className="text-neutral-400 hover:text-white">⏭</button>
            <button onClick={toggleRepeat} className={`text-xs font-bold px-1 ${repeatMode !== 'OFF' ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}>{t.rep} [{repeatMode}]</button>
            <DownloadButton track={currentTrack} />
          </div>

          <div className="flex items-center space-x-2 w-full max-w-md">
            <span className="text-[10px] text-neutral-400 w-8 text-center font-mono">{formatTime(progress)}</span>
            <input
              type="range" min="0" max={duration || 100} value={progress}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <span className="text-[10px] text-neutral-400 w-8 text-center font-mono">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-end space-x-3 w-1/4">
          <button onClick={() => setIsFullScreen(true)} className="text-xs bg-neutral-800 text-green-400 font-bold px-2.5 py-1 rounded border border-green-500/30 hover:bg-neutral-700 transition">
            {t.expandPlayer}
          </button>
          <button onClick={() => setShowQueue(!showQueue)} className={`text-xs px-2.5 py-1 rounded border font-bold transition ${showQueue ? 'bg-green-500 text-black border-green-500' : 'bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700'}`}>
            {t.queue} ({queue.length})
          </button>
          {currentTrack.lyrics && (
            <button onClick={() => setShowLyrics(true)} className="text-xs bg-neutral-800 px-2.5 py-1 rounded text-neutral-300 hover:text-white border border-neutral-700">{t.lyrics}</button>
          )}
          <span className="text-xs text-neutral-400 px-1">{t.vol}</span>
          <input
            type="range" min="0" max="1" step="0.05" value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 accent-green-500"
          />
        </div>
      </div>

      {isFullScreen && (
        <div className="fixed inset-0 bg-gradient-to-b from-neutral-800 via-neutral-900 to-black z-50 flex flex-col justify-between p-6 md:p-12 overflow-y-auto animate-fadeIn">
          <div className="flex justify-between items-center w-full max-w-2xl mx-auto border-b border-neutral-800 pb-4">
            <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Now Playing in Full Screen</span>
            <button onClick={() => setIsFullScreen(false)} className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full font-bold text-xs border border-neutral-700 transition">
              {t.collapsePlayer}
            </button>
          </div>

          <div className="flex flex-col items-center justify-center my-auto py-8 text-center max-w-md mx-auto w-full">
            <img src={currentTrack.coverUrl} className="w-64 h-64 sm:w-80 sm:h-80 rounded-2xl object-cover shadow-2xl border border-neutral-700 mb-6" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">{currentTrack.title}</h2>
            <Link href={`/artist/${currentTrack.artistId}`} onClick={() => setIsFullScreen(false)} className="text-sm text-green-400 hover:underline font-bold mb-4 block">
              {currentTrack.artistName}
            </Link>

            <div className="flex items-center space-x-2 w-full mb-6">
              <span className="text-xs text-neutral-400 w-10 font-mono">{formatTime(progress)}</span>
              <input
                type="range" min="0" max={duration || 100} value={progress}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <span className="text-xs text-neutral-400 w-10 font-mono">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-center space-x-6 mb-8">
              <button onClick={toggleShuffle} className={`text-sm font-bold ${isShuffle ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}>{t.shuffle}</button>
              <button onClick={prevTrack} className="text-2xl text-neutral-300 hover:text-white">⏮</button>
              <button onClick={togglePlay} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center font-extrabold text-2xl shadow-xl hover:scale-105 transition">
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button onClick={nextTrack} className="text-2xl text-neutral-300 hover:text-white">⏭</button>
              <button onClick={toggleRepeat} className={`text-sm font-bold ${repeatMode !== 'OFF' ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}>{t.rep} [{repeatMode}]</button>
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
                  {/* FIXED: Calls playTrack(tItem) cleanly without resetting playlist/queue index */}
                  <button onClick={() => playTrack(tItem)} className="text-[11px] bg-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded hover:bg-green-500 hover:text-black transition">
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
            <button onClick={() => setShowLyrics(false)} className="mt-6 px-6 py-2 bg-green-500 text-black font-bold rounded text-sm hover:bg-green-400">{t.closeLyrics}</button>
          </div>
        </div>
      )}
    </>
  );
};