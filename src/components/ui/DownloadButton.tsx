
'use client';
import React from 'react';
import { Track } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { musicAPI } from '@/lib/api';

export const DownloadButton: React.FC<{ track: Track }> = ({ track }) => {
  const { currentUser } = useAuth();
  const router = useRouter();

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser?.tier === 'BASIC') {
      if (confirm('🔒 Song downloading is strictly exclusive to Silver and Gold VIP subscribers!\n\nWould you like to go to Settings to upgrade your tier now?')) {
        router.push('/settings');
      }
      return;
    }
    
    try {
      await musicAPI.downloadTrack(track.id);
    } catch (error: any) {
      alert(`Download failed: ${error.message}`);
    }
  };

  return (
    <button
      onClick={handleDownload}
      title={currentUser?.tier !== 'BASIC' ? 'Download Track' : 'VIP Exclusive - Upgrade to Download'}
      className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition text-sm flex items-center justify-center"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
    </button>
  );
};
