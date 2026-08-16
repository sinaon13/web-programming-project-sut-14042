'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { musicAPI, authAPI } from '@/lib/api';
import { Track, User, Album } from '@/lib/types';
import { adaptTrack } from '@/lib/adapters';
import { useLanguage } from '@/context/LanguageContext';
import { BackendOfflineBanner } from '@/components/ui/BackendOfflineBanner';

export default function ArtistPortalPage() {
  const { currentUser, updateUser } = useAuth();
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [album, setAlbum] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [genre, setGenre] = useState('Pop');
  const [releaseType, setReleaseType] = useState<'SINGLE' | 'ALBUM'>('SINGLE');
  const [releaseYear, setReleaseYear] = useState<number>(2026);
  const [fileFormat, setFileFormat] = useState<'MP3' | 'WAV' | 'FLAC'>('MP3');
  const [collaborators, setCollaborators] = useState('');
  const [isEarlyAccess, setIsEarlyAccess] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [bio, setBio] = useState('');
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [backendOffline, setBackendOffline] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    const load = async () => {
      try {
        const trRes = await musicAPI.getTracks();
        const allTracks = ((trRes as any).results || (Array.isArray(trRes) ? trRes : [])).map(adaptTrack);
        setMyTracks(allTracks.filter((tItem: Track) => tItem.artistId === currentUser.id));
        setBackendOffline(false);
      } catch (err: any) {
        if (err?.message?.includes("fetch") || err?.message?.includes("Network")) setBackendOffline(true);
      }
    };
    load();

    authAPI.getMe().then(freshUser => {
      const freshStatus = (freshUser as any).artist_status || (freshUser as any).status;
      const freshReason = (freshUser as any).rejection_reason || (freshUser as any).rejectionReason;
      
      if (freshUser && freshStatus !== currentUser.status) {
        updateUser({ status: freshStatus, rejectionReason: freshReason });
      }
      setBio((freshUser as any).bio || currentUser.bio || '');
    }).catch(console.error);
  }, [currentUser]);

  if (currentUser?.role !== 'ARTIST') return <div className="p-4 bg-red-900/20 text-red-400 rounded">Access Restricted to Verified Artists</div>;
  
  if (currentUser.status === 'REJECTED') {
    return (
      <div className="max-w-xl mx-auto p-8 bg-red-950/40 border-2 border-red-500 rounded-2xl text-center space-y-4 shadow-2xl">
        <h2 className="text-xl font-bold text-red-400">⛔ Artist Application Rejected</h2>
        <p className="text-xs text-neutral-300">Your application to publish music on this platform was reviewed and declined by administrative staff.</p>
        <div className="p-4 bg-black/50 border border-red-500/40 rounded-xl text-left">
          <span className="block text-[11px] text-red-400 font-bold uppercase mb-1">Reason for Rejection:</span>
          <p className="text-sm text-white font-mono">{currentUser.rejectionReason || 'No specific reason provided by staff.'}</p>
        </div>
      </div>
    );
  }

  if (currentUser.status === 'PENDING') return <div className="p-6 bg-amber-500/10 border border-amber-500 text-amber-300 rounded text-sm">Your artist application is currently under staff review. You will be notified once approved.</div>;

  const refreshMyTracks = async () => {
    const trRes = await musicAPI.getTracks();
    const allTracks = ((trRes as any).results || (Array.isArray(trRes) ? trRes : [])).map(adaptTrack);
    setMyTracks(allTracks.filter((tItem: Track) => tItem.artistId === currentUser.id));
  };

  const handlePublishOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Title is required');
    if (!editingTrackId && !audioFile) return alert('Audio file is required for new tracks');

    try {
      const formData = new FormData();
      formData.append('title', title);
      if (album) formData.append('album_title', album);
      if (coverFile) formData.append('cover', coverFile);
      formData.append('lyrics', lyrics);
      formData.append('genre', genre);
      formData.append('release_type', releaseType);
      formData.append('release_date', `${releaseYear}-01-01`);
      formData.append('release_year', releaseYear.toString());
      formData.append('collaborators', collaborators);
      formData.append('file_format', fileFormat);
      formData.append('is_early_access', isEarlyAccess ? 'true' : 'false');
      if (audioFile) formData.append('audio_file', audioFile);

      if (editingTrackId) {
        // PATCH existing track — no audio_file required for update
        await musicAPI.updateTrack(editingTrackId, formData);
        setEditingTrackId(null);
        alert('✅ Track updated successfully!');
      } else {
        // POST new track — audio_file required
        await musicAPI.uploadTrack(formData);
        alert('✅ Track published to database!');
      }

      await refreshMyTracks();
      setTitle(''); setAlbum(''); setCoverFile(null); setLyrics(''); setCollaborators(''); setIsEarlyAccess(false); setAudioFile(null);
    } catch (err: any) {
      alert(`Failed to publish: ${err.message || 'Unknown error'}`);
    }
  };

  const handleStartEdit = (tItem: Track) => {
    setTitle(tItem.title);
    setAlbum(tItem.album || '');
    setCoverFile(null); // Clear previous file since we don't have the File object for it
    setLyrics(tItem.lyrics || '');
    setGenre(tItem.genre || 'Pop');
    setReleaseType(tItem.releaseType || 'SINGLE');
    setReleaseYear(tItem.releaseYear || 2026);
    setFileFormat(tItem.fileFormat || 'MP3');
    setCollaborators(tItem.collaborators || '');
    setIsEarlyAccess(tItem.isEarlyAccess || false);
    setEditingTrackId(tItem.id);
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingTrackId(null);
    setTitle(''); setAlbum(''); setCoverFile(null); setLyrics(''); setCollaborators(''); setIsEarlyAccess(false); setAudioFile(null);
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Delete this track from the platform?')) return;
    try {
      await musicAPI.deleteTrack(trackId);
      alert('✅ Track deleted from the platform.');
      if (editingTrackId === trackId) cancelEdit();
      await refreshMyTracks();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message || 'Unknown error'}`);
    }
  };

  const handleUpdateBio = async () => {
    try {
      await authAPI.updateMe({ bio });
      updateUser({ bio });
      alert('Biography updated successfully!');
    } catch (err: any) {
      alert('Failed to update bio. Is the backend offline?');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <BackendOfflineBanner show={backendOffline} />
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4 shadow-xl">
        <h3 className="font-bold text-white text-md">{t.bioSettings}</h3>
        <textarea rows={3} placeholder={t.bioPlaceholder} value={bio} onChange={e => setBio(e.target.value)} className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
        <button onClick={handleUpdateBio} className="px-5 py-2 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400">{t.saveBio}</button>
      </div>

      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-lg mt-6">
        <h3 className="text-lg font-bold text-white mb-2">Monetization & Earnings</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 uppercase font-semibold">Total Payouts Earned</span>
            <span className="block text-3xl font-extrabold text-amber-400 mt-1">{currentUser.totalEarnings?.toLocaleString() || 0} IRR</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-neutral-400 uppercase font-semibold block mb-1">Status</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentUser.isMonetized ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {currentUser.isMonetized ? 'Enabled (Active)' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      <div className={`p-6 bg-neutral-900 border rounded-xl shadow-xl transition ${editingTrackId ? 'border-amber-500/80 bg-amber-950/10' : 'border-neutral-800'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <span>{editingTrackId ? '✏️ Editing Published Track' : t.artistStudioTitle}</span>
            {currentUser.status === 'APPROVED' && (
              <span className="text-blue-400 text-xs font-bold bg-blue-500/20 border border-blue-500/40 px-3 py-1 rounded-full shadow">
                {t.verifiedBadge}
              </span>
            )}
          </h2>
          {editingTrackId && <button onClick={cancelEdit} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded">{t.cancelEdit}</button>}
        </div>

        <form onSubmit={handlePublishOrUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.trackTitle}</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-medium" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.releaseType}</label>
              <select value={releaseType} onChange={e => setReleaseType(e.target.value as any)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white">
                <option value="SINGLE">{t.singleOption}</option>
                <option value="ALBUM">{t.albumOption}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.audioFormat}</label>
              <select value={fileFormat} onChange={e => setFileFormat(e.target.value as any)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm font-bold text-green-400">
                <option value="MP3">MP3 (320kbps)</option>
                <option value="WAV">WAV (Lossless)</option>
                <option value="FLAC">FLAC (High Res)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">Audio File</label>
            <input type="file" onChange={e => setAudioFile(e.target.files?.[0] || null)} className="w-full p-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
            {editingTrackId && <p className="text-[10px] text-neutral-500 mt-1">Leave empty to keep current audio file.</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.genre}</label>
              <input type="text" value={genre} onChange={e => setGenre(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.releaseYear}</label>
              <input type="number" value={releaseYear} onChange={e => setReleaseYear(Number(e.target.value))} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.collaborators}</label>
              <input type="text" placeholder="Optional co-artists..." value={collaborators} onChange={e => setCollaborators(e.target.value)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {releaseType === 'ALBUM' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.albumName}</label>
                <input type="text" value={album} onChange={e => setAlbum(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-medium" />
              </div>
            )}
            <div className={releaseType === 'SINGLE' ? 'md:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.coverUrlLabel} (Image File)</label>
              <input type="file" onChange={e => setCoverFile(e.target.files?.[0] || null)} className="w-full p-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
              {editingTrackId && <p className="text-[10px] text-neutral-500 mt-1">Leave empty to keep current cover image.</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.lyrics}</label>
            <textarea rows={3} value={lyrics} onChange={e => setLyrics(e.target.value)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input type="checkbox" checked={isEarlyAccess} onChange={e => setIsEarlyAccess(e.target.checked)} className="accent-amber-500" />
            <span className="text-xs text-amber-400 font-semibold">{t.vipExclusive}</span>
          </div>

          <button type="submit" className={`w-full py-2.5 font-bold text-sm rounded transition shadow ${editingTrackId ? 'bg-amber-400 hover:bg-amber-300 text-black' : 'bg-green-500 hover:bg-green-400 text-black'}`}>
            {editingTrackId ? t.updateBtn : t.publishBtn}
          </button>
        </form>
      </div>

      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4">{t.publishedWorks}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-xs text-neutral-400">
                <th className="pb-3">{t.colTitle}</th>
                <th className="pb-3">{t.colFormat}</th>
                <th className="pb-3">{t.colListeners}</th>
                <th className="pb-3">{t.colStreams}</th>
                <th className="pb-3">{t.colRevenue}</th>
                <th className="pb-3">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-sm">
              {myTracks.map(tItem => (
                <tr key={tItem.id} className={`hover:bg-neutral-800/30 transition ${editingTrackId === tItem.id ? 'bg-amber-500/10' : ''}`}>
                  <td className="py-3 font-bold text-white">{tItem.title}</td>
                  <td className="py-3 text-xs text-green-400 font-bold">{tItem.fileFormat || 'MP3'}</td>
                  <td className="py-3 text-neutral-300">{tItem.listenersCount.toLocaleString()}</td>
                  <td className="py-3 text-neutral-300">{tItem.totalStreams?.toLocaleString() || tItem.listenersCount * 2}</td>
                  <td className="py-3 font-mono text-amber-400 font-bold">{((tItem.totalStreams || tItem.listenersCount * 2) * 200).toLocaleString()} IRR</td>
                  <td className="py-3 space-x-2">
                    <button onClick={() => handleStartEdit(tItem)} className="px-2.5 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded text-xs font-bold">{t.editBtn}</button>
                    <button onClick={() => handleDeleteTrack(tItem.id)} className="px-2.5 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded text-xs font-bold flex items-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      {t.deleteBtn}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}