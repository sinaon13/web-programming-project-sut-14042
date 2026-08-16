'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supportAPI, reportsAPI, subscriptionsAPI } from '@/lib/api';
import { User, Ticket } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BackendOfflineBanner } from '@/components/ui/BackendOfflineBanner';

export default function AdminPortalPage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<'VERIFY' | 'TICKETS' | 'ACCOUNTING' | 'PRICING'>('VERIFY');
  
  const [pendingArtists, setPendingArtists] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  
  const [silverPrice, setSilverPrice] = useState(50000);
  const [goldPrice, setGoldPrice] = useState(120000);
  
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [advanceTimeDays, setAdvanceTimeDays] = useState(30);
  const [backendOffline, setBackendOffline] = useState(false);

  const loadData = async () => {
    try {
      // 1. Fetch Subscription Plans
      const pricesResp = await subscriptionsAPI.getPlans();
      const pList = (pricesResp as any).results || (Array.isArray(pricesResp) ? pricesResp : []);
      setPlans(pList);
      const s = pList.find((p: any) => p.tier === 'SILVER')?.price || 50000;
      const g = pList.find((p: any) => p.tier === 'GOLD')?.price || 120000;
      setSilverPrice(s);
      setGoldPrice(g);

      // 2. Fetch Tickets
      const tktsResp = await supportAPI.getTickets();
      setTickets((tktsResp as any).results || (Array.isArray(tktsResp) ? tktsResp : []));

      // 3. Fetch Pending Artists
      const artistsResp = await supportAPI.getPendingArtists();
      setPendingArtists((artistsResp as any).results || (Array.isArray(artistsResp) ? artistsResp : []));

      // 4. Fetch Dashboard Stats (for Pricing)
      if (currentUser?.role === 'ADMIN') {
        const stats = await reportsAPI.getAdminDashboard();
        setDashboardStats(stats);

        // 5. Fetch Payouts (for Accounting)
        const payoutResp = await reportsAPI.getAdminPayouts();
        setPayouts(payoutResp?.payouts || []);
      }
      
      setBackendOffline(false);
    } catch (e) {
      console.error(e);
      setBackendOffline(true);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  if (currentUser?.role !== 'SUPPORT' && currentUser?.role !== 'ADMIN') return <div className="p-4 bg-red-900/20 text-red-400 rounded">Access Denied</div>;

  const handleArtistAction = async (id: string | number, status: 'APPROVED' | 'REJECTED') => {
    try {
      if (status === 'APPROVED') {
        await supportAPI.approveArtist(id);
      } else {
        const reason = prompt('Enter mandatory reason for artist rejection:') || 'Does not meet platform quality standards.';
        await supportAPI.rejectArtist(id, reason);
      }
      setPendingArtists(pendingArtists.filter(u => u.id !== id));
      alert(`Artist successfully ${status.toLowerCase()}! Automated notification sent.`);
    } catch {
      alert('Action failed. Is the backend offline?');
    }
  };

  const handleReplyTicket = async (ticketId: string | number) => {
    const text = replyTexts[ticketId];
    if (!text || !text.trim()) return;
    try {
      await supportAPI.addMessage(ticketId, text.trim());
      await loadData();
      setReplyTexts({ ...replyTexts, [ticketId]: '' });
    } catch {
      alert('Failed to send reply.');
    }
  };

  const handleSettleArtist = async (artistId: string | number) => {
    try {
      await reportsAPI.settlePayouts([artistId]);
      alert('Artist payout marked as SETTLED! Notification sent.');
      // Refresh payouts
      const payoutResp = await reportsAPI.getAdminPayouts();
      setPayouts(payoutResp?.payouts || []);
    } catch {
      alert('Failed to settle payout.');
    }
  };

  const handleUpdatePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sPlan = plans.find(p => p.tier === 'SILVER');
      const gPlan = plans.find(p => p.tier === 'GOLD');
      if (sPlan) await subscriptionsAPI.updatePlanPrice(sPlan.id, silverPrice);
      if (gPlan) await subscriptionsAPI.updatePlanPrice(gPlan.id, goldPrice);
      alert('System pricing adjusted successfully without code deployment!');
    } catch {
      alert('Failed to update prices.');
    }
  };

  const handleAdvanceTime = async () => {
    try {
      const res = await subscriptionsAPI.advanceTime(advanceTimeDays);
      alert((res as any).detail || 'Time advanced successfully!');
    } catch {
      alert('Failed to advance time.');
    }
  };

  const handleCloseTicket = async (ticketId: string | number) => {
    if (!confirm('Mark this support ticket as formally CLOSED?')) return;
    try {
      await supportAPI.updateTicketStatus(ticketId, 'CLOSED');
      await loadData();
      alert('Ticket closed successfully.');
    } catch {
      alert('Failed to close ticket.');
    }
  };

  let tierData: any[] = [];
  let totalSubRevenue = 0;
  let activeGold = 0;
  let activeSilver = 0;

  if (dashboardStats) {
    const colorMap: Record<string, string> = {
      'BASIC': '#9ca3af',
      'SILVER': '#60a5fa',
      'GOLD': '#f59e0b'
    };
    tierData = dashboardStats.tier_distribution.map((td: any) => ({
      name: `${td.plan__tier} Plan`,
      value: td.count,
      color: colorMap[td.plan__tier] || '#ffffff'
    }));
    totalSubRevenue = parseFloat(dashboardStats.total_revenue || '0');
    activeGold = dashboardStats.tier_distribution.find((td: any) => td.plan__tier === 'GOLD')?.count || 0;
    activeSilver = dashboardStats.tier_distribution.find((td: any) => td.plan__tier === 'SILVER')?.count || 0;
  }

  return (
    <div className="space-y-6">
      <BackendOfflineBanner show={backendOffline} />
      <div className="flex border-b border-neutral-800 space-x-6 overflow-x-auto">
        <button onClick={() => setTab('VERIFY')} className={`pb-3 font-bold text-sm ${tab === 'VERIFY' ? 'text-green-500 border-b-2 border-green-500' : 'text-neutral-500'}`}>{t.verificationsTab} ({pendingArtists.length})</button>
        <button onClick={() => setTab('TICKETS')} className={`pb-3 font-bold text-sm ${tab === 'TICKETS' ? 'text-green-500 border-b-2 border-green-500' : 'text-neutral-500'}`}>{t.ticketsTab} ({tickets.length})</button>
        {currentUser?.role === 'ADMIN' && (
          <>
            <button onClick={() => setTab('ACCOUNTING')} className={`pb-3 font-bold text-sm ${tab === 'ACCOUNTING' ? 'text-green-500 border-b-2 border-green-500' : 'text-neutral-500'}`}>{t.accountingTab}</button>
            <button onClick={() => setTab('PRICING')} className={`pb-3 font-bold text-sm ${tab === 'PRICING' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-neutral-500'}`}>{t.pricingTab}</button>
          </>
        )}
      </div>

      {tab === 'VERIFY' && (
        <div className="space-y-3">
          {pendingArtists.length === 0 ? <p className="text-neutral-500 text-sm">No pending applications.</p> : pendingArtists.map((artist: any) => (
            <div key={artist.id} className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex justify-between items-center shadow-md">
              <div>
                <h4 className="font-bold text-white text-sm">{artist.display_name || artist.username}</h4>
                <p className="text-xs text-amber-400 font-mono my-0.5">Email: {artist.email}</p>
                {artist.portfolio_url && <a href={artist.portfolio_url} target="_blank" className="text-xs text-blue-400 hover:underline">View Portfolio Sample</a>}
              </div>
              <div className="space-x-2">
                <button onClick={() => handleArtistAction(artist.id, 'APPROVED')} className="px-4 py-1.5 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400">{t.approveBtn}</button>
                <button onClick={() => handleArtistAction(artist.id, 'REJECTED')} className="px-4 py-1.5 bg-red-600 text-white font-bold text-xs rounded hover:bg-red-500">{t.rejectBtn}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'TICKETS' && (
        <div className="space-y-4">
          {tickets.map((tItem: any) => (
            <div key={tItem.id} className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3 shadow-md">
              <div className="flex justify-between border-b border-neutral-800 pb-2">
                <div>
                  <span className="font-mono text-xs font-bold text-green-400 mr-2">#{tItem.id}</span>
                  <span className="font-bold text-white text-sm">{tItem.subject}</span>
                  <span className="text-xs text-neutral-400 ml-2">by {tItem.user_display}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-neutral-400">Sent: {new Date(tItem.created_at).toLocaleDateString()}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${tItem.status === 'CLOSED' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>{tItem.status}</span>
                  {tItem.status !== 'CLOSED' && (
                    <button onClick={() => handleCloseTicket(tItem.id)} className="text-[10px] bg-neutral-800 hover:bg-red-600/30 text-neutral-300 hover:text-red-300 px-2 py-0.5 rounded border border-neutral-700 transition">
                      {t.closeTicket}
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {tItem.messages?.map((m: any, idx: number) => (
                  <div key={idx} className="text-xs bg-black/40 p-2 rounded">
                    <span className={`font-bold ${m.sender_role === 'ADMIN' || m.sender_role === 'SUPPORT' ? 'text-amber-400' : 'text-green-400'}`}>{m.sender_role === 'ADMIN' || m.sender_role === 'SUPPORT' ? 'Support / Admin' : (m.sender_display || 'User')}: </span><span className="text-neutral-300">{m.body}</span>
                  </div>
                ))}
              </div>
              {tItem.status !== 'CLOSED' ? (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder={t.typeReply}
                    value={replyTexts[tItem.id] || ''}
                    onChange={e => setReplyTexts({ ...replyTexts, [tItem.id]: e.target.value })}
                    className="flex-1 p-1.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-white"
                  />
                  <button onClick={() => handleReplyTicket(tItem.id)} className="px-4 py-1.5 bg-green-500 text-black font-bold text-xs rounded">{t.sendReply}</button>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 italic text-center py-1 bg-black/20 rounded">{t.closedTicketMsg}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'ACCOUNTING' && currentUser?.role === 'ADMIN' && (
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4">Monthly Financial Accounting & Artist Payouts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-xs text-neutral-400">
                  <th className="pb-3">Artist Name & ID</th>
                  <th className="pb-3">Total Registered Streams</th>
                  <th className="pb-3">Unpaid Streams</th>
                  <th className="pb-3">Calculated Payout</th>
                  <th className="pb-3">Monetization</th>
                  <th className="pb-3">Action (Admin Only)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-sm">
                {payouts.map((art: any) => (
                  <tr key={art.artist_id} className="hover:bg-neutral-800/30">
                    <td className="py-3 font-bold text-white">{art.artist_name} <span className="text-[10px] text-neutral-500 block">({art.artist_email})</span></td>
                    <td className="py-3 text-neutral-300">{art.stream_count.toLocaleString()}</td>
                    <td className="py-3 text-neutral-300">{art.unpaid_streams?.toLocaleString() || 0}</td>
                    <td className="py-3 font-mono text-amber-400 font-bold">{parseFloat(art.payout_amount).toLocaleString()} Rials</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${art.is_monetized ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{art.is_monetized ? 'Enabled' : 'Disabled'}</span>
                    </td>
                    <td className="py-3">
                      <button onClick={() => handleSettleArtist(art.artist_id)} className={`px-3 py-1 text-black font-bold text-xs rounded ${art.is_monetized ? 'bg-red-500 hover:bg-red-400' : 'bg-green-500 hover:bg-green-400'}`}>
                        {art.is_monetized ? 'Revoke Monetization' : 'Confirm Monetization'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'PRICING' && currentUser?.role === 'ADMIN' && dashboardStats && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl text-center shadow-lg">
              <span className="text-xs text-neutral-400 uppercase font-semibold">Total Subscription Revenue</span>
              <span className="block text-2xl font-extrabold text-green-400 mt-2">{totalSubRevenue.toLocaleString()} IRR</span>
            </div>
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl text-center shadow-lg">
              <span className="text-xs text-neutral-400 uppercase font-semibold">Active Gold VIP Users</span>
              <span className="block text-2xl font-extrabold text-amber-400 mt-2">{activeGold} Subscribers</span>
            </div>
            <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl text-center shadow-lg">
              <span className="text-xs text-neutral-400 uppercase font-semibold">Active Silver Users</span>
              <span className="block text-2xl font-extrabold text-blue-400 mt-2">{activeSilver} Subscribers</span>
            </div>
          </div>

          <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6">User Subscription Tier Distribution</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tierData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name} (${(((percent ?? 0) * 100)).toFixed(0)}%)`}>
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
            <button type="submit" className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition shadow-lg">{t.savePriceChanges}</button>
          </form>

          <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl mt-6">
            <h3 className="text-lg font-bold text-white mb-4">Time Travel (Testing & Debug)</h3>
            <p className="text-sm text-neutral-400 mb-4">
              Advance the global backend clock to test subscription expirations. Subscriptions that pass their expiration date will be automatically deactivated and users will be notified.
            </p>
            <div className="flex space-x-4">
              <input
                type="number"
                min="1"
                value={advanceTimeDays}
                onChange={e => setAdvanceTimeDays(parseInt(e.target.value))}
                className="w-32 bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white text-sm"
              />
              <button 
                onClick={handleAdvanceTime}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition shadow-lg"
              >
                Advance {advanceTimeDays} Days
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}