import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlayerProvider, usePlayer } from '@/context/PlayerContext';
import { AuthProvider } from '@/context/AuthContext';
import { PlayerBar } from '@/components/player/PlayerBar';
import { Track } from '@/lib/types';

// FIX: Mock Next.js App Router to prevent "expected app router to be mounted" crash
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
}));

const sampleTrack: Track = {
  id: 'test-1',
  title: 'Test Symphony',
  artistId: 'a1',
  artistName: 'Test Artist',
  album: 'Test Album',
  coverUrl: '/images/cover.jpg',
  audioUrl: '/audio/song.mp3',
  listenersCount: 5000,
  totalStreams: 10000,
  releaseDate: '2026-01-01',
  isEarlyAccess: false,
  lyrics: 'These are test lyrics.'
};

const PlayerTrigger = () => {
  const { playTrack, toggleRepeat, toggleShuffle, repeatMode, isShuffle } = usePlayer();
  return (
    <div>
      <span data-testid="rep-mode">{repeatMode}</span>
      <span data-testid="shuf-mode">{isShuffle ? 'ON' : 'OFF'}</span>
      <button onClick={() => playTrack(sampleTrack, [sampleTrack])}>Play Track</button>
      <button onClick={toggleRepeat}>Toggle Repeat</button>
      <button onClick={toggleShuffle}>Toggle Shuffle</button>
    </div>
  );
};

describe('Audio Player Controls & UI Tests', () => {
  beforeEach(() => {
    window.HTMLAudioElement.prototype.play = jest.fn().mockResolvedValue(undefined);
    window.HTMLAudioElement.prototype.pause = jest.fn();
  });

  it('5. renders track metadata correctly when playback begins', () => {
    render(<AuthProvider><PlayerProvider><PlayerTrigger /><PlayerBar /></PlayerProvider></AuthProvider>);
    act(() => { screen.getByText('Play Track').click(); });
    expect(screen.getByText('Test Symphony')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('6. cycles through Repeat modes (OFF -> PLAYLIST -> TRACK)', () => {
    render(<AuthProvider><PlayerProvider><PlayerTrigger /></PlayerProvider></AuthProvider>);
    expect(screen.getByTestId('rep-mode')).toHaveTextContent('OFF');
    act(() => { screen.getByText('Toggle Repeat').click(); });
    expect(screen.getByTestId('rep-mode')).toHaveTextContent('PLAYLIST');
    act(() => { screen.getByText('Toggle Repeat').click(); });
    expect(screen.getByTestId('rep-mode')).toHaveTextContent('TRACK');
  });

  it('7. toggles Shuffle state on click', () => {
    render(<AuthProvider><PlayerProvider><PlayerTrigger /></PlayerProvider></AuthProvider>);
    expect(screen.getByTestId('shuf-mode')).toHaveTextContent('OFF');
    act(() => { screen.getByText('Toggle Shuffle').click(); });
    expect(screen.getByTestId('shuf-mode')).toHaveTextContent('ON');
  });

  it('8. opens and closes the Lyrics modal on demand', () => {
    render(<AuthProvider><PlayerProvider><PlayerTrigger /><PlayerBar /></PlayerProvider></AuthProvider>);
    act(() => { screen.getByText('Play Track').click(); });
    const lyricsBtn = screen.getByText('Lyrics');
    act(() => { lyricsBtn.click(); });
    expect(screen.getByText('These are test lyrics.')).toBeInTheDocument();
    act(() => { screen.getByText('Close Lyrics').click(); });
    expect(screen.queryByText('These are test lyrics.')).not.toBeInTheDocument();
  });
});