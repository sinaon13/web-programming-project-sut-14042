import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DownloadButton } from '@/components/ui/DownloadButton';
import { Track } from '@/lib/types';

// FIX: Mock Next.js App Router to prevent "expected app router to be mounted" crash
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
}));

const sampleTrack: Track = {
  id: 'test-2',
  title: 'VIP Exclusive Track',
  artistId: 'a1',
  artistName: 'Gold Artist',
  album: 'Gold Album',
  coverUrl: '/images/cover.jpg',
  audioUrl: '/audio/song.mp3',
  listenersCount: 100,
  totalStreams: 200,
  releaseDate: '2026-05-01',
  isEarlyAccess: true
};

const UserSimulator = () => {
  const { login, register } = useAuth();
  return (
    <div>
      <button onClick={() => login('user@test.com')}>Login Gold VIP</button>
      <button onClick={() => register('Free User', 'free@test.com', 'LISTENER')}>Register Basic Free</button>
      <DownloadButton track={sampleTrack} />
    </div>
  );
};

describe('VIP Gold Download Restriction Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('9. renders download button with appropriate Gold tooltip', () => {
    render(<AuthProvider><UserSimulator /></AuthProvider>);
    act(() => { screen.getByText('Login Gold VIP').click(); });
    const dlBtn = screen.getByText('⬇️');
    expect(dlBtn).toHaveAttribute('title', 'Download Track');
  });

  it('10. allows file downloading for Gold VIP subscribers without blocking', () => {
    render(<AuthProvider><UserSimulator /></AuthProvider>);
    act(() => { screen.getByText('Login Gold VIP').click(); });
    act(() => { screen.getByText('⬇️').click(); });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Downloading: "VIP Exclusive Track"'));
  });

  it('11. intercepts download attempt for Basic Free tier users and prompts tier upgrade', () => {
    render(<AuthProvider><UserSimulator /></AuthProvider>);
    act(() => { screen.getByText('Register Basic Free').click(); });
    act(() => { screen.getByText('⬇️').click(); });
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Song downloading is strictly exclusive to Gold VIP subscribers!'));
  });
});