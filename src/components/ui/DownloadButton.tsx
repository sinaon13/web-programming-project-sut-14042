'use client';
import React, { useState } from 'react';
import { Track } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { musicAPI } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/context/LanguageContext';

export const DownloadButton: React.FC<{ track: Track }> = ({ track }) => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser?.tier === 'BASIC') {
      setShowModal(true);
      return;
    }
    
    try {
      await musicAPI.downloadTrack(track.id);
    } catch (error: any) {
      showToast(`${t.downloadFailed}: ${error.message}`, 'error');
    }
  };

  return (
    <>
      <button
        onClick={handleDownload}
        title={currentUser?.tier !== 'BASIC' ? 'Download Track' : 'VIP Exclusive - Upgrade to Download'}
        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition text-sm flex items-center justify-center"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-default" onClick={(e) => { e.stopPropagation(); setShowModal(false); }}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-bold text-white mb-2">{t.premiumFeature || 'Premium Feature'}</h3>
            <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
              {t.downloadBasicRestricted || 'Song downloading is strictly exclusive to Silver and Gold VIP subscribers! Would you like to upgrade your tier now?'}
            </p>
            <div className="flex flex-col space-y-2">
              <button
                onClick={(e) => { e.stopPropagation(); router.push('/settings'); }}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition"
              >
                {t.upgradeGold || 'Upgrade to VIP'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowModal(false); }}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg transition"
              >
                {t.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
