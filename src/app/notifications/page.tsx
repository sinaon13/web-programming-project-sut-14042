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
      setNotifs(all.filter(n => n.userId === currentUser.id || n.userId === 'all'));
    }
  }, [currentUser]);

  const markAllRead = () => {
    const updated = notifs.map(n => ({ ...n, isRead: true }));
    setNotifs(updated);
    setDB('db_notifications', updated);
  };

  const deleteNotif = (id: string) => {
    const updated = notifs.filter(n => n.id !== id);
    setNotifs(updated);
    setDB('db_notifications', updated);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">System Notifications</h2>
        <button onClick={markAllRead} className="text-xs text-green-400 font-bold hover:underline">Mark All as Read</button>
      </div>

      {notifs.length === 0 ? (
        <div className="p-12 text-center bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 text-sm">No system notifications.</div>
      ) : (
        notifs.map(n => (
          <div key={n.id} className={`p-4 rounded-xl border flex justify-between items-start transition shadow-md ${n.isRead ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-800/90 border-green-500/60'}`}>
            <div>
              <div className="flex items-center space-x-2">
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                <h4 className="text-sm font-bold text-white">{n.title}</h4>
                <span className="text-[10px] text-neutral-400">{n.timestamp}</span>
              </div>
              <p className="text-xs text-neutral-300 mt-1">{n.message}</p>
              {n.targetUrl && <Link href={n.targetUrl} className="text-[11px] text-green-400 font-bold hover:underline block mt-2">View Details ➡️</Link>}
            </div>
            <button onClick={() => deleteNotif(n.id)} className="text-xs text-neutral-500 hover:text-red-400">Delete</button>
          </div>
        ))
      )}
    </div>
  );
}