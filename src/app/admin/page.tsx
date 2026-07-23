'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDB, setDB } from '@/lib/mockData';
import { User, Ticket, AppNotification, Track } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function AdminPortalPage() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<'VERIFY' | 'TICKETS' | 'ACCOUNTING' | 'PRICING'>('VERIFY');
  const [pendingArtists, setPendingArtists] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [allArtists, setAllArtists] = useState<User[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [silverPrice, setSilverPrice] = useState(50000);
  const [goldPrice, setGoldPrice] = useState(120000);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const users = getDB<User[]>('db_users', []);
    setAllUsers(users);
    setPendingArtists(users.filter(u => u.role === 'ARTIST' && u.status === 'PENDING'));
    setAllArtists(users.filter(u => u.role === 'ARTIST'));
    setTickets(getDB<Ticket[]>('db_tickets', []));
    setAllTracks(getDB<Track[]>('db_tracks', []));
    const prices = getDB<'db_prices', { SILVER: number; GOLD: number }>('db_prices', { SILVER: 50000, GOLD: 120000 });
    setSilverPrice(prices.SILVER);
    setGoldPrice(prices.GOLD);
  }, []);

  if (currentUser?.role !== 'SUPPORT' && currentUser?.role !== 'ADMIN') return <div className="p-4 bg-red-900/20 text-red-400 rounded">Access Denied</div>;

  const handleArtistAction = (id: string, status: 'APPROVED' | 'REJECTED') => {
    let reason = '';
    if (status === 'REJECTED') {
      reason = prompt('Enter mandatory reason for artist rejection:') || 'Does not meet platform quality standards.';
    }
    
    const users = getDB<User[]>('db_users', []).map(u => u.id === id ? { ...u, status, rejectionReason: reason || undefined } : u);
    setDB('db_users', users);
    setAllUsers(users);
    setPendingArtists(users.filter(u => u.role === 'ARTIST' && u.status === 'PENDING'));
    setAllArtists(users.filter(u => u.role === 'ARTIST'));

    const notifs = getDB<AppNotification[]>('db_notifications', []);
    const newNotif: AppNotification = {
      id: 'n_' + Date.now(),
      userId: id,
      title: status === 'APPROVED' ? '🎉 Artist Application Approved!' : '⛔ Artist Application Rejected',
      message: status === 'APPROVED' ? 'You can now publish music in your Artist Studio.' : `Reason: ${reason}`,
      isRead: false,
      timestamp: 'Just now',
      targetUrl: '/artist-portal'
    };
    setDB('db_notifications', [newNotif, ...notifs]);
    alert(`Artist successfully ${status.toLowerCase()}! Automated notification sent.`);
  };

  const handleReplyTicket = (ticketId: string) => {
    if (!replyText.trim()) return;
    const updated = tickets.map(t => t.id === ticketId ? {
      ...t, status: 'ANSWERED' as const, messages: [...t.messages, { sender: currentUser.name, text: replyText, time: 'Just now' }]
    } : t);
    setTickets(updated);
    setDB('db_tickets', updated);
    setReplyText('');
  };

  const handleSettleArtist = (artistId: string) => {
    const users = getDB<User[]>('db_users', []).map(u => u.id === artistId ? { ...u, payoutStatus: 'SETTLED' as const } : u);
    setDB('db_users', users);
    setAllArtists(users.filter(u => u.role === 'ARTIST'));
    alert('Artist payout marked as SETTLED!');
  };

  const handleUpdatePrices = (e: React.FormEvent) => {
    e.preventDefault();
    setDB('db_prices', { SILVER: silverPrice, GOLD: goldPrice });
    alert('System pricing adjusted successfully without code deployment!');
  };

  const tierData = [
    { name: 'Basic (Free)', value: allUsers.filter(u => u.tier === 'BASIC').length, color: '#9ca3af' },
    { name: 'Silver Plan', value: allUsers.filter(u => u.tier === 'SILVER').length, color: '#60a5fa' },
    { name: 'Gold VIP', value: allUsers.filter(u => u.tier === 'GOLD').length, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex border-b border-neutral-800 space-x-6 overflow-x-auto">
        <button onClick={() => setTab('VERIFY')} className={`pb-3 font-bold text-sm ${tab === 'VERIFY' ? 'text-green-500 border-b-2 border-green-500' : 'text-neutral-500'}`}>Verifications ({pendingArtists.length})</button>
        <button onClick={() => setTab('TICKETS')} className={`pb-3 font-bold text-sm ${tab === 'TICKETS' ? 'text-green-500 border-b-2 border-green-500' : 'text-neutral-500'}`}>Support Tickets ({tickets.length})</button>
        <button onClick={() => setTab('ACCOUNTING')} className={`pb-3 font-bold text-sm ${tab === 'ACCOUNTING' ? 'text-green-500 border-b-2 border-green-500' : 'text-neutral-500'}`}>Financial Accounting</button>
        {currentUser.role === 'ADMIN' && (
          <button onClick={() => setTab('PRICING')} className={`pb-3 font-bold text-sm ${tab === 'PRICING' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-neutral-500'}`}>Revenue Charts & Pricing</button>
        )}
      </div>

      {tab === 'VERIFY' && (
        <div className="space-y-3">
          {pendingArtists.length === 0 ? <p className="text-neutral-500 text-sm">No pending applications.</p> : pendingArtists.map(artist => (
            <div key={artist.id} className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex justify-between items-center shadow-md">
              <div>
                <h4 className="font-bold text-white text-sm">{artist.name}</h4>
                <p className="text-xs text-amber-400 font-mono my-0.5">Email: {artist.email}</p>
                <a href={artist.portfolioUrl || '#'} target="_blank" className="text-xs text-blue-400 hover:underline">View Portfolio Sample</a>
              </div>
              <div className="space-x-2">
                <button onClick={() => handleArtistAction(artist.id, 'APPROVED')} className="px-4 py-1.5 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400">Approve</button>
                <button onClick={() => handleArtistAction(artist.id, 'REJECTED')} className="px-4 py-1.5 bg-red-600 text-white font-bold text-xs rounded hover:bg-red-500">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'TICKETS' && (
        <div className="space-y-4">
          {tickets.map(t => (
            <div key={t.id} className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3 shadow-md">
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <div>
                  <span className="font-mono text-xs font-bold text-green-400 mr-2">{t.ticketNumber}</span>
                  <span className="font-bold text-white text-sm">{t.subject} (By: {t.userName})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-neutral-400">Sent: {t.createdAt}</span>
                  <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">{t.status}</span>
                </div>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {t.messages.map((m, idx) => (
                  <div key={idx} className="text-xs bg-black/40 p-2 rounded">
                    <span className="font-bold text-green-400">{m.sender}: </span><span className="text-neutral-300">{m.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <input type="text" placeholder="Type staff reply..." value={replyText} onChange={e => setReplyText(e.target.value)} className="flex-1 p-1.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-white" />
                <button onClick={() => handleReplyTicket(t.id)} className="px-4 py-1.5 bg-green-500 text-black font-bold text-xs rounded">Send Reply</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'ACCOUNTING' && (
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
          {/* FIX: Removed Section text */}
          <h3 className="text-lg font-bold text-white mb-4">Monthly Financial Accounting & Artist Payouts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-xs text-neutral-400">
                  <th className="pb-3">Artist Name & ID</th>
                  <th className="pb-3">Unique Monthly Listeners</th>
                  <th className="pb-3">Total Registered Streams</th>
                  <th className="pb-3">Calculated Payout (25 IRR/Stream)</th>
                  <th className="pb-3">Payment Status</th>
                  <th className="pb-3">Action (Admin Only)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-sm">
                {allArtists.map(art => {
                  const artTracks = allTracks.filter(t => t.artistId === art.id);
                  const totalStreams = artTracks.reduce((sum, t) => sum + (t.totalStreams || t.listenersCount * 2), 0);
                  const uniqueListeners = Math.floor(totalStreams * 0.7);
                  const payoutAmount = totalStreams * 25;
                  return (
                    <tr key={art.id} className="hover:bg-neutral-800/30">
                      <td className="py-3 font-bold text-white">{art.name} <span className="text-[10px] text-neutral-500 block">({art.id})</span></td>
                      <td className="py-3 text-neutral-300">{uniqueListeners.toLocaleString()}</td>
                      <td className="py-3 text-neutral-300">{totalStreams.toLocaleString()}</td>
                      <td className="py-3 font-mono text-amber-400 font-bold">{payoutAmount.toLocaleString()} Toman</td>
                      <td className="py-3">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${art.payoutStatus === 'SETTLED' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {art.payoutStatus === 'SETTLED' ? 'Settled' : 'In Pending'}
                        </span>
                      </td>
                      <td className="py-3">
                        {currentUser.role === 'ADMIN' && art.payoutStatus !== 'SETTLED' && (
                          <button onClick={() => handleSettleArtist(art.id)} className="px-3 py-1 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400">Confirm Settlement</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'PRICING' && currentUser.role === 'ADMIN' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl text-center shadow-lg">
              <span className="text-xs text-neutral-400 uppercase font-semibold">Total Subscription Revenue</span>
              <span className="block text-2xl font-extrabold text-green-400 mt-2">{(allUsers.filter(u => u.tier === 'GOLD').length * goldPrice + allUsers.filter(u => u.tier === 'SILVER').length * silverPrice).toLocaleString()} IRR</span>
            </div>
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl text-center shadow-lg">
              <span className="text-xs text-neutral-400 uppercase font-semibold">Active Gold VIP Users</span>
              <span className="block text-2xl font-extrabold text-amber-400 mt-2">{allUsers.filter(u => u.tier === 'GOLD').length} Subscribers</span>
            </div>
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl text-center shadow-lg">
              <span className="text-xs text-neutral-400 uppercase font-semibold">Active Silver Users</span>
              <span className="block text-2xl font-extrabold text-blue-400 mt-2">{allUsers.filter(u => u.tier === 'SILVER').length} Subscribers</span>
            </div>
          </div>

          <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
            {/* FIX: Removed Section text */}
            <h3 className="text-lg font-bold text-white mb-6">User Subscription Tier Distribution</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tierData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {tierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#3f3f46', borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <form onSubmit={handleUpdatePrices} className="max-w-md p-6 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4 shadow-xl">
            <h3 className="font-bold text-white text-md">Dynamic Pricing Controls</h3>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Silver Tier Price (IRR)</label>
              <input type="number" value={silverPrice} onChange={e => setSilverPrice(Number(e.target.value))} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Gold VIP Tier Price (IRR)</label>
              <input type="number" value={goldPrice} onChange={e => setGoldPrice(Number(e.target.value))} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-amber-400 text-black font-bold text-xs rounded hover:bg-amber-300 transition shadow">Update Live System Prices</button>
          </form>
        </div>
      )}
    </div>
  );
}