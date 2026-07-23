'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { getDB } from '@/lib/mockData';
import { AppNotification } from '@/lib/types';

export const Navigation: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);

  // Check for unread notifications on mount and whenever route changes
  useEffect(() => {
    if (!currentUser) return;
    const all = getDB<AppNotification[]>('db_notifications', []);
    const unread = all.some(n => 
      !n.isRead && 
      (
        n.userId === currentUser.id || 
        n.userId === 'all' || 
        (n.userId === 'admin_support' && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPPORT'))
      )
    );
    setHasUnreadNotifs(unread);
  }, [currentUser, pathname]);

  if (!currentUser) return null;

  const linkClass = (path: string) => `p-2.5 rounded text-sm font-medium transition flex items-center justify-between ${pathname === path ? 'bg-neutral-800 text-green-400 font-bold' : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'}`;

  return (
    <aside className="w-full md:w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between p-4 flex-shrink-0">
      <div>
        <div className="flex items-center space-x-3 mb-8 p-2 border-b border-neutral-800 pb-4">
          <img src={currentUser.avatar} alt="Avatar" className="w-11 h-11 rounded-full border-2 border-green-500 object-cover" />
          <div className="truncate px-2">
            <h3 className="font-bold text-white text-sm truncate">{currentUser.name}</h3>
            <span className="text-[11px] text-green-400 font-semibold uppercase block">{currentUser.role} • {currentUser.tier}</span>
          </div>
        </div>

        <nav className="space-y-1.5 flex flex-col">
          <Link href="/" className={linkClass('/')}><span>{t.home}</span></Link>
          <Link href="/browse" className={linkClass('/browse')}><span>{t.browse}</span></Link>
          <Link href="/albums" className={linkClass('/albums')}><span>{t.albums}</span></Link>
          <Link href="/singles" className={linkClass('/singles')}><span>{t.singles}</span></Link>
          <Link href="/playlists" className={linkClass('/playlists')}><span>{t.playlists}</span></Link>
          <Link href={`/profile/${currentUser.id}`} className={linkClass(`/profile/${currentUser.id}`)}><span>{t.profile}</span></Link>
          <Link href="/support-tickets" className={linkClass('/support-tickets')}><span>{t.tickets}</span></Link>
          
          {/* NOTIFICATIONS LINK WITH PULSING BLUE BADGE */}
          <Link href="/notifications" className={linkClass('/notifications')}>
            <span className="flex items-center justify-between w-full">
              <span>{t.notifications}</span>
              {hasUnreadNotifs && (
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-500/50 flex-shrink-0 mr-1"></span>
              )}
            </span>
          </Link>

          <Link href="/settings" className={linkClass('/settings')}><span>{t.settings}</span></Link>

          {currentUser.role === 'ARTIST' && (
            <Link href="/artist-portal" className="p-2.5 mt-4 bg-amber-500/10 border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 rounded text-sm font-bold flex items-center justify-between">
              <span>{t.artistStudio}</span>
              <span className="text-xs">⚡</span>
            </Link>
          )}

          {(currentUser.role === 'SUPPORT' || currentUser.role === 'ADMIN') && (
            <Link href="/admin" className="p-2.5 mt-4 bg-purple-500/10 border border-purple-500/40 text-purple-400 hover:bg-purple-500/20 rounded text-sm font-bold flex items-center justify-between">
              <span>{t.adminDashboard}</span>
              <span className="text-xs">🛡️</span>
            </Link>
          )}
        </nav>
      </div>

      <button onClick={logout} className="w-full mt-6 p-2.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-sm font-semibold text-left transition flex items-center justify-between">
        <span>{t.logout}</span>
        <span>➡️</span>
      </button>
    </aside>
  );
};