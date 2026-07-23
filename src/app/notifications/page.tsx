
'use client';
import React, { useState, useEffect } from 'react';
import { getDB, setDB } from '@/lib/mockData';
import { AppNotification } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (currentUser) {
      const all = getDB<AppNotification[]>('db_notifications', []);
      setNotifs(all.filter(n => n.userId === currentUser.id || n.userId === 'all' || (n.userId === 'admin_support' && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPPORT'))));
    }
  }, [currentUser]);

  const markAllRead = () => {
    const all = getDB<AppNotification[]>('db_notifications', []);
    const updated = all.map(n => ({ ...n, isRead: true }));
    setDB('db_notifications', updated);
    setNotifs(notifs.map(n => ({ ...n, isRead: true })));
  };

  // FIX 5: Individual "Mark as Read" handler
  const markSingleRead = (id: string) => {
    const all = getDB<AppNotification[]>('db_notifications', []);
    const updated = all.map(n => n.id === id ? { ...n, isRead: true } : n);
    setDB('db_notifications', updated);
    setNotifs(notifs.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const deleteNotif = (id: string) => {
    const all = getDB<AppNotification[]>('db_notifications', []);
    const updated = all.filter(n => n.id !== id);
    setDB('db_notifications', updated);
    setNotifs(notifs.filter(n => n.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">System Notifications (Section 6.2)</h2>
        <button onClick={markAllRead} className="text-xs text-green-400 font-bold hover:underline">Mark All as Read</button>
      </div>

      {notifs.length === 0 ? (
        <div className="p-12 text-center bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 text-sm">No system notifications.</div>
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
              {n.targetUrl && <Link href={n.targetUrl} className="text-[11px] text-green-400 font-bold hover:underline block mt-2">View Details ➡️</Link>}
            </div>
            
            {/* FIX 5: Individual Mark as Read & Delete controls */}
            <div className="flex flex-col items-end space-y-2 flex-shrink-0">
              {!n.isRead && (
                <button onClick={() => markSingleRead(n.id)} className="text-[11px] bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black font-bold px-2 py-1 rounded transition">
                  ✓ Mark Read
                </button>
              )}
              <button onClick={() => deleteNotif(n.id)} className="text-xs text-neutral-500 hover:text-red-400 transition">Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
