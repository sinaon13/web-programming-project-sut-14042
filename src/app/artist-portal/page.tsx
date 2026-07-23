'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDB, setDB } from '@/lib/mockData';
import { Track, User, Album } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';

export default function ArtistPortalPage() {
  const { currentUser, updateUser } = useAuth();
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [album, setAlbum] = useState('');
  const [coverUrl, setCoverUrl] = useState(''); // NEW: Custom cover photo URL
  const [lyrics, setLyrics] = useState('');
  const [genre, setGenre] = useState('Pop');
  const [releaseType, setReleaseType] = useState<'SINGLE' | 'ALBUM'>('SINGLE');
  const [releaseYear, setReleaseYear] = useState(2026);
  const [fileFormat, setFileFormat] = useState<'MP3' | 'WAV' | 'FLAC'>('MP3');
  const [collaborators, setCollaborators] = useState('');
  const [isEarlyAccess, setIsEarlyAccess] = useState(false);
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [bio, setBio] = useState('');
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      const allUsers = getDB<User[]>('db_users', []);
      const freshUser = allUsers.find(u => u.id === currentUser.id);
      if (freshUser && freshUser.status !== currentUser.status) {
        updateUser({ status: freshUser.status, rejectionReason: freshUser.rejectionReason });
      }
      setBio(freshUser?.bio || currentUser.bio || '');
      
      const allTracks = getDB<Track[]>('db_tracks', []);
      setMyTracks(allTracks.filter(tItem => tItem.artistId === currentUser.id));
    }
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

  const handlePublishOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const allTracks = getDB<Track[]>('db_tracks', []);
    const defaultCover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300';
    const finalCover = coverUrl.trim() || defaultCover;

    // DYNAMIC ALBUM GENERATION ENGINE: Guarantee album exists in db_albums!
    let targetAlbumId = '';
    if (releaseType === 'ALBUM') {
      const allAlbums = getDB<Album[]>('db_albums', []);
      const albumNameStr = album.trim() || 'Untitled Album';
      let existingAlbum = allAlbums.find(a => a.title.toLowerCase() === albumNameStr.toLowerCase() && a.artistId === currentUser.id);
      
      if (!existingAlbum) {
        existingAlbum = {
          id: 'alb_' + Date.now(),
          title: albumNameStr,
          artistId: currentUser.id,
          artistName: currentUser.name,
          coverUrl: finalCover,
          releaseDate: new Date().toISOString().split('T')[0],
          genre
        };
        setDB('db_albums', [existingAlbum, ...allAlbums]);
      } else if (coverUrl.trim() && coverUrl.trim() !== existingAlbum.coverUrl) {
        existingAlbum.coverUrl = finalCover;
        setDB('db_albums', allAlbums.map(a => a.id === existingAlbum!.id ? existingAlbum! : a));
      }
      targetAlbumId = existingAlbum.id;
    }

    if (editingTrackId) {
      const updated = allTracks.map(tItem => {
        if (tItem.id !== editingTrackId) return tItem;
        return {
          ...tItem,
          title,
          album: releaseType === 'ALBUM' ? (album || 'Untitled Album') : 'Single Release',
          albumId: targetAlbumId || undefined,
          coverUrl: finalCover,
          isEarlyAccess,
          lyrics,
          genre,
          releaseType,
          releaseYear,
          collaborators,
          fileFormat
        };
      });
      setDB('db_tracks', updated);
      setMyTracks(updated.filter(tItem => tItem.artistId === currentUser.id));
      alert('✅ Track updated successfully!');
      setEditingTrackId(null);
    } else {
      const newTrack: Track = {
        id: 't_' + Date.now(),
        title,
        artistId: currentUser.id,
        artistName: currentUser.name,
        album: releaseType === 'ALBUM' ? (album || 'Untitled Album') : 'Single Release',
        albumId: targetAlbumId || undefined,
        coverUrl: finalCover,
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        listenersCount: 1,
        totalStreams: 1,
        releaseDate: new Date().toISOString().split('T')[0],
        isEarlyAccess,
        lyrics,
        genre,
        releaseType,
        releaseYear,
        collaborators,
        fileFormat
      };
      const updated = [newTrack, ...allTracks];
      setDB('db_tracks', updated);
      setMyTracks([newTrack, ...myTracks]);
      alert('✅ Track published successfully! Available across all archives.');
    }

    setTitle(''); setAlbum(''); setCoverUrl(''); setLyrics(''); setCollaborators(''); setIsEarlyAccess(false);
  };

  const handleStartEdit = (tItem: Track) => {
    setTitle(tItem.title);
    setAlbum(tItem.album || '');
    setCoverUrl(tItem.coverUrl || '');
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
    setTitle(''); setAlbum(''); setCoverUrl(''); setLyrics(''); setCollaborators(''); setIsEarlyAccess(false);
  };

  const handleDeleteTrack = (trackId: string) => {
    if (!confirm('Delete this track from the platform?')) return;
    const allTracks = getDB<Track[]>('db_tracks', []).filter(tItem => tItem.id !== trackId);
    setDB('db_tracks', allTracks);
    setMyTracks(myTracks.filter(tItem => tItem.id !== trackId));
    if (editingTrackId === trackId) cancelEdit();
  };

  const handleUpdateBio = () => {
    updateUser({ bio });
    alert('Biography updated successfully!');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4 shadow-xl">
        <h3 className="font-bold text-white text-md">{t.bioSettings}</h3>
        <textarea rows={3} placeholder={t.bioPlaceholder} value={bio} onChange={e => setBio(e.target.value)} className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
        <button onClick={handleUpdateBio} className="px-5 py-2 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400">{t.saveBio}</button>
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
              <label className="block text-xs font-semibold text-neutral-400 mb-1">{t.coverUrlLabel}</label>
              <input type="url" placeholder={t.coverUrlPlaceholder} value={coverUrl} onChange={e => setCoverUrl(e.target.value)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-mono" />
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
                  <td className="py-3 font-mono text-amber-400 font-bold">{((tItem.totalStreams || tItem.listenersCount * 2) * 25).toLocaleString()} Toman</td>
                  <td className="py-3 space-x-2">
                    <button onClick={() => handleStartEdit(tItem)} className="px-2.5 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded text-xs font-bold">{t.editBtn}</button>
                    <button onClick={() => handleDeleteTrack(tItem.id)} className="px-2.5 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded text-xs font-bold">{t.deleteBtn}</button>
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