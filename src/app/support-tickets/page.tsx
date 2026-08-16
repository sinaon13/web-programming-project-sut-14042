'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supportAPI } from '@/lib/api';
import { Ticket, AppNotification } from '@/lib/types';
import { adaptTicket } from '@/lib/adapters';
import { useLanguage } from '@/context/LanguageContext';
import { BackendOfflineBanner } from '@/components/ui/BackendOfflineBanner';

export default function SupportTicketsPage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [backendOffline, setBackendOffline] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    const load = async () => {
      try {
        const res = await supportAPI.getTickets();
        const results = (res as any).results || (Array.isArray(res) ? res : []);
        setTickets(results.map(adaptTicket));
        setBackendOffline(false);
      } catch {
        setBackendOffline(true);
      }
    };
    load();
  }, [currentUser]);

  if (!currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supportAPI.createTicket(subject, message);
      const res = await supportAPI.getTickets();
      const results = (res as any).results || (Array.isArray(res) ? res : []);
      setTickets(results.map(adaptTicket));
      
      setSubject(''); setMessage('');
      setBackendOffline(false);
      alert('✅ Support ticket submitted successfully! Staff has been notified.');
    } catch {
      alert('Backend offline. Cannot submit ticket.');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <BackendOfflineBanner show={backendOffline} />
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
        <h2 className="text-lg font-bold text-white mb-2">{t.supportTicketsTitle}</h2>
        <p className="text-xs text-neutral-400 mb-4">{t.supportTicketsDesc}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.issueSubject}</label>
            <input type="text" placeholder={t.issueSubjectPlaceholder} value={subject} onChange={e => setSubject(e.target.value)} required className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-medium" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.msgDesc}</label>
            <textarea rows={3} placeholder={t.msgDescPlaceholder} value={message} onChange={e => setMessage(e.target.value)} required className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-medium" />
          </div>
          <button type="submit" className="px-6 py-2.5 bg-green-500 hover:bg-green-400 text-black font-bold rounded text-sm transition shadow">{t.submitTicketBtn}</button>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-4">{t.myTicketHistory}</h3>
        <div className="space-y-4">
          {tickets.length === 0 ? <p className="text-neutral-500 text-sm">{t.noTickets}</p> : tickets.map(tItem => (
            <div key={tItem.id} className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3 shadow-md">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-green-400 mr-2">{tItem.ticketNumber}</span>
                  <span className="font-bold text-white text-sm">{tItem.subject}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-neutral-400">{t.sentAt} {tItem.createdAt}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${tItem.status === 'OPEN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>{tItem.status}</span>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                {tItem.messages.map((m, idx) => (
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