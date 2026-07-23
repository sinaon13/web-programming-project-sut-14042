
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDB, setDB } from '@/lib/mockData';
import { Ticket, AppNotification } from '@/lib/types';

export default function SupportTicketsPage() {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (currentUser) {
      const all = getDB<Ticket[]>('db_tickets', []);
      setTickets(all.filter(t => t.userId === currentUser.id));
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tNum = `#TK-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: Ticket = {
      id: 'tk_' + Date.now(),
      ticketNumber: tNum,
      userId: currentUser.id,
      userName: currentUser.name,
      subject,
      status: 'OPEN',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      messages: [{ sender: currentUser.name, text: message, time: 'Just now' }]
    };
    const updated = [newTicket, ...tickets];
    setTickets(updated);
    const all = getDB<Ticket[]>('db_tickets', []);
    setDB('db_tickets', [newTicket, ...all]);

    // FIX 5: Automatically generate notification for Admin & Support staff
    const notifs = getDB<AppNotification[]>('db_notifications', []);
    const adminNotif: AppNotification = {
      id: 'n_' + Date.now(),
      userId: 'admin_support', // Targeted to staff
      title: `🎧 New Support Ticket Submitted (${tNum})`,
      message: `User ${currentUser.name}: "${subject}"`,
      isRead: false,
      timestamp: 'Just now',
      targetUrl: '/admin'
    };
    setDB('db_notifications', [adminNotif, ...notifs]);

    setSubject(''); setMessage('');
    alert('✅ Support ticket submitted successfully! Staff has been notified.');
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
        <h2 className="text-lg font-bold text-white mb-2">Submit New Support Ticket</h2>
        <p className="text-xs text-neutral-400 mb-4">Report playback errors, verification inquiries, or billing questions.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">Issue Subject</label>
            <input type="text" placeholder="e.g., Audio buffering error..." value={subject} onChange={e => setSubject(e.target.value)} required className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-medium" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">Message Description</label>
            <textarea rows={3} placeholder="Describe your issue in detail..." value={message} onChange={e => setMessage(e.target.value)} required className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-medium" />
          </div>
          <button type="submit" className="px-6 py-2.5 bg-green-500 hover:bg-green-400 text-black font-bold rounded text-sm transition shadow">Submit Ticket</button>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-4">My Ticket History</h3>
        <div className="space-y-4">
          {tickets.length === 0 ? <p className="text-neutral-500 text-sm">No support tickets created yet.</p> : tickets.map(t => (
            <div key={t.id} className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3 shadow-md">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-green-400 mr-2">{t.ticketNumber}</span>
                  <span className="font-bold text-white text-sm">{t.subject}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-neutral-400">{t.createdAt}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${t.status === 'OPEN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>{t.status}</span>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                {t.messages.map((m, idx) => (
                  <div key={idx} className="text-xs bg-black/40 p-3 rounded-lg border border-neutral-800/60">
                    <span className="font-bold text-green-400">{m.sender}: </span><span className="text-neutral-300">{m.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
