'use client';
import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '@/lib/api';
import { AppNotification } from '@/lib/types';
import { adaptNotification } from '@/lib/adapters';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { BackendOfflineBanner } from '@/components/ui/BackendOfflineBanner';
import Link from 'next/link';

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [backendOffline, setBackendOffline] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    const load = async () => {
      try {
        const res = await notificationsAPI.getNotifications();
        const results = (res as any).results || (Array.isArray(res) ? res : []);
        setNotifs(results.map(adaptNotification));
        setBackendOffline(false);
      } catch (err: any) {
        if (err?.message?.includes("fetch") || err?.message?.includes("Network")) setBackendOffline(true);
      }
    };
    load();
  }, [currentUser]);

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      const res = await notificationsAPI.getNotifications();
      const results = (res as any).results || (Array.isArray(res) ? res : []);
      setNotifs(results.map(adaptNotification));
      setBackendOffline(false);
    } catch (err: any) {
      alert('Backend offline. Cannot mark notifications as read.');
    }
  };

  const markSingleRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      const res = await notificationsAPI.getNotifications();
      const results = (res as any).results || (Array.isArray(res) ? res : []);
      setNotifs(results.map(adaptNotification));
      setBackendOffline(false);
    } catch (err: any) {
      alert('Backend offline. Cannot mark notification as read.');
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      await notificationsAPI.deleteNotification(id);
      setNotifs(notifs.filter(n => n.id !== id));
    } catch (err: any) {
      alert('Error deleting notification.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <BackendOfflineBanner show={backendOffline} />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">{t.sysNotificationsTitle}</h2>
        <button onClick={markAllRead} className="text-xs text-green-400 font-bold hover:underline">{t.markAllRead}</button>
      </div>

      {notifs.length === 0 ? (
        <div className="p-12 text-center bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 text-sm">{t.noNotifs}</div>
      ) : (
        notifs.map(n => (
          <div key={n.id} className={`p-4 rounded-xl border flex justify-between items-start transition shadow-md ${n.isRead ? 'bg-neutral-900 border-neutral-800 opacity-75' : 'bg-neutral-800/90 border-green-500/60'}`}>
            <div className="pr-4">
              <div className="flex items-center space-x-2">
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                <h4 className="text-sm font-bold text-white">{n.title}</h4>
                <span className="text-[10px] text-neutral-400">{n.timestamp}</span>
              </div>
              <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{n.message}</p>
              {n.targetUrl && <Link href={n.targetUrl} className="text-[11px] text-green-400 font-bold hover:underline block mt-2">{t.viewDetails}</Link>}
            </div>
            
            <div className="flex flex-col items-end space-y-2 flex-shrink-0">
              {!n.isRead && (
                <button onClick={() => markSingleRead(n.id)} className="text-[11px] bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black font-bold px-2 py-1 rounded transition">
                  {t.markReadBtn}
                </button>
              )}
              <button onClick={() => deleteNotif(n.id)} className="text-xs text-neutral-500 hover:text-red-400 transition">{t.deleteNotifBtn}</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}