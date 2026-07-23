'use client';
import React, { useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { DownloadButton } from '@/components/ui/DownloadButton';
import Link from 'next/link';

export const PlayerBar: React.FC = () => {
  const { currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, progress, duration, seek, volume, setVolume, repeatMode, toggleRepeat, isShuffle, toggleShuffle, queue, playTrack } = usePlayer();
  const { currentUser } = useAuth();
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

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
        <div className="flex items-center space-x-3 w-full md:w-1/4 mb-2 md:mb-0">
          <img src={currentTrack.coverUrl} alt="Cover" className="w-12 h-12 rounded object-cover border border-neutral-700" />
          <div className="truncate">
            <h4 className="text-sm font-bold text-white truncate">{currentTrack.title}</h4>
            <div className="text-xs text-neutral-400 truncate flex items-center gap-1">
              <Link href={`/artist/${currentTrack.artistId}`} className="hover:text-white underline">{currentTrack.artistName}</Link>
              <span>•</span>
              {/* Strictly plural /albums/${currentTrack.albumId} */}
              {currentTrack.albumId ? <Link href={`/albums/${currentTrack.albumId}`} className="hover:text-white underline">{currentTrack.album}</Link> : <span>{currentTrack.album}</span>}
            </div>
            {currentUser?.tier === 'GOLD' && (
              <div className="text-[10px] text-amber-400 font-mono mt-0.5 truncate">
                ▶ {(currentTrack.totalStreams || currentTrack.listenersCount * 2).toLocaleString()} streams • 👤 {currentTrack.listenersCount.toLocaleString()} unique
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center w-full md:w-2/4">
          <div className="flex items-center space-x-3 mb-1">
            <button onClick={toggleShuffle} className={`text-xs font-bold ${isShuffle ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}>SHUFFLE</button>
            <button onClick={prevTrack} className="text-neutral-400 hover:text-white">⏮</button>
            <button onClick={togglePlay} className="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center font-bold shadow hover:scale-105 transition">
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={nextTrack} className="text-neutral-400 hover:text-white">⏭</button>
            <button onClick={toggleRepeat} className={`text-xs font-bold ${repeatMode !== 'OFF' ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}>REP [{repeatMode}]</button>
            <DownloadButton track={currentTrack} />
          </div>

          <div className="flex items-center space-x-2 w-full max-w-md">
            <span className="text-[10px] text-neutral-400 w-8 text-right">{formatTime(progress)}</span>
            <input
              type="range" min="0" max={duration || 100} value={progress}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <span className="text-[10px] text-neutral-400 w-8">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-end space-x-3 w-1/4">
          {/* Section 9.2 Requirement: Queue Management Drawer Button */}
          <button onClick={() => setShowQueue(!showQueue)} className={`text-xs px-2.5 py-1 rounded border font-bold transition ${showQueue ? 'bg-green-500 text-black border-green-500' : 'bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700'}`}>
            📑 Queue ({queue.length})
          </button>
          {currentTrack.lyrics && (
            <button onClick={() => setShowLyrics(true)} className="text-xs bg-neutral-800 px-2.5 py-1 rounded text-neutral-300 hover:text-white border border-neutral-700">Lyrics</button>
          )}
          <span className="text-xs text-neutral-400">Vol</span>
          <input
            type="range" min="0" max="1" step="0.05" value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 accent-green-500"
          />
        </div>
      </div>

      {/* Section 9.2 Requirement: Up Next Playback Queue Drawer */}
      {showQueue && (
        <div className="fixed bottom-16 right-6 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-4 z-50 text-left max-h-96 flex flex-col">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-3">
            <h4 className="text-sm font-bold text-white">Up Next in Queue ({queue.length})</h4>
            <button onClick={() => setShowQueue(false)} className="text-neutral-500 hover:text-white text-xs">✕</button>
          </div>

          {queue.length === 0 ? (
            <p className="text-xs text-neutral-500 py-6 text-center">Your queue is currently empty.</p>
          ) : (
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {queue.map((t, idx) => (
                <div key={t.id + idx} className="flex items-center justify-between p-2 bg-black/40 rounded border border-neutral-800/60 hover:border-neutral-700 transition">
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold text-white truncate">{idx + 1}. {t.title}</p>
                    <span className="text-[10px] text-neutral-400">{t.artistName}</span>
                  </div>
                  <button onClick={() => playTrack(t, queue.slice(idx + 1))} className="text-[11px] bg-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded hover:bg-green-500 hover:text-black transition">
                    Play
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
            <button onClick={() => setShowLyrics(false)} className="mt-6 px-6 py-2 bg-green-500 text-black font-bold rounded text-sm hover:bg-green-400">Close Lyrics</button>
          </div>
        </div>
      )}
    </>
  );
}