'use client';
import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '@/lib/api';
import { AppNotification } from '@/lib/types';
import { adaptNotification } from '@/lib/adapters';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/context/LanguageContext';
import { BackendOfflineBanner } from '@/components/ui/BackendOfflineBanner';
import Link from 'next/link';

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [backendOffline, setBackendOffline] = useState(false);

  const translateNotification = (title: string, message: string) => {
    if (language === 'en') return { title, message };
    
    let tTitle = title;
    let tMessage = message;

    // Tickets
    if (title === 'Ticket Created') tTitle = 'تیکت ایجاد شد';
    if (message.includes('has been submitted')) tMessage = 'تیکت شما با موفقیت ثبت شد.';
    if (title.includes('New Reply on Ticket')) tTitle = 'پاسخ جدید در تیکت';
    if (message.includes('Support has replied')) tMessage = 'پشتیبانی به تیکت شما پاسخ داد.';

    // Artist
    if (title === 'Artist Application Approved') tTitle = 'درخواست هنرمندی تایید شد';
    if (message.includes('Congratulations! Your artist application has been approved')) tMessage = 'تبریک! درخواست هنرمندی شما تایید شد.';
    if (title === 'Artist Application Rejected') tTitle = 'درخواست هنرمندی رد شد';
    if (message.includes('Your artist application was rejected')) tMessage = 'درخواست هنرمندی شما رد شد. ' + message.split('Reason:')[1];

    // Subscriptions
    if (title === 'Subscription Expired') tTitle = 'انقضای اشتراک';
    if (message.includes('Your premium subscription has expired')) tMessage = 'اشتراک ویژه شما منقضی شده است.';
    
    // Payouts
    if (title === 'Monthly Payout Processed') tTitle = 'پرداخت ماهانه انجام شد';
    if (message.includes('You earned')) {
      const match = message.match(/You earned (\d+) IRR from (\d+) streams/);
      if (match) tMessage = `شما مبلغ ${match[1]} ریال از ${match[2]} استریم در این ماه درآمد داشتید!`;
    }
    
    // Monetization
    if (title === 'Monetization Status') tTitle = 'وضعیت درآمدزایی';
    if (message.includes('were not monetized')) tMessage = 'استریم‌های شما درآمدزایی نداشتند. لطفا درخواست درآمدزایی بدهید.';
    if (title === 'Monetization Monetized') tTitle = 'درآمدزایی فعال شد';
    if (message.includes('Admin has confirmed your monetization')) tMessage = 'مدیریت درآمدزایی شما را تایید کرد.';
    if (title === 'Monetization Revoked') tTitle = 'درآمدزایی لغو شد';
    if (message.includes('Admin has revoked your monetization')) tMessage = 'مدیریت درآمدزایی شما را لغو کرد.';

    return { title: tTitle, message: tMessage };
  };


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
      showToast(t.backendOffline, 'error');
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
      showToast(t.backendOffline, 'error');
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      await notificationsAPI.deleteNotification(id);
      setNotifs(notifs.filter(n => n.id !== id));
    } catch (err: any) {
      showToast('Error deleting notification.', 'error');
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
                <h4 className="text-sm font-bold text-white">{translateNotification(n.title, n.message).title}</h4>
                <span className="text-[10px] text-neutral-400">{n.timestamp}</span>
              </div>
              <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{translateNotification(n.title, n.message).message}</p>
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