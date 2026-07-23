
'use client';
import React from 'react';
import { Track } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export const DownloadButton: React.FC<{ track: Track }> = ({ track }) => {
  const { currentUser } = useAuth();
  const router = useRouter();

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser?.tier !== 'GOLD') {
      if (confirm('🔒 Song downloading is strictly exclusive to Gold VIP subscribers!\n\nWould you like to go to Settings to upgrade your tier now?')) {
        router.push('/settings');
      }
      return;
    }
    
    // Simulate real file download
    const link = document.createElement('a');
    link.href = track.audioUrl;
    link.download = `${track.artistName} - ${track.title}.mp3`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`⬇️ Downloading: "${track.title}" by ${track.artistName}`);
  };

  return (
    <button
      onClick={handleDownload}
      title={currentUser?.tier === 'GOLD' ? 'Download Track' : 'Gold VIP Exclusive - Upgrade to Download'}
      className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition text-sm flex items-center justify-center"
    >
      ⬇️
    </button>
  );
};
