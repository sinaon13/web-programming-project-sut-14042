'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDB, setDB } from '@/lib/mockData';
import { Track, User } from '@/lib/types';

export default function ArtistPortalPage() {
  const { currentUser, updateUser } = useAuth();
  const [title, setTitle] = useState('');
  const [album, setAlbum] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [genre, setGenre] = useState('Pop');
  const [releaseType, setReleaseType] = useState<'SINGLE' | 'ALBUM'>('SINGLE');
  const [releaseYear, setReleaseYear] = useState(2026);
  const [fileFormat, setFileFormat] = useState<'MP3' | 'WAV' | 'FLAC'>('MP3');
  const [collaborators, setCollaborators] = useState('');
  const [isEarlyAccess, setIsEarlyAccess] = useState(false);
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [bio, setBio] = useState('');
  
  // Section 10.2 Requirement: Track Editing State
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
      setMyTracks(allTracks.filter(t => t.artistId === currentUser.id));
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

    if (editingTrackId) {
      // Update existing track
      const updated = allTracks.map(t => {
        if (t.id !== editingTrackId) return t;
        return {
          ...t,
          title,
          album: releaseType === 'ALBUM' ? (album || 'Untitled Album') : 'Single Release',
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
      setMyTracks(updated.filter(t => t.artistId === currentUser.id));
      alert('✅ Track updated successfully!');
      setEditingTrackId(null);
    } else {
      // Create new track
      const newTrack: Track = {
        id: 't_' + Date.now(),
        title,
        artistId: currentUser.id,
        artistName: currentUser.name,
        album: releaseType === 'ALBUM' ? (album || 'Untitled Album') : 'Single Release',
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300',
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
      alert('✅ Track published successfully!');
    }

    setTitle(''); setAlbum(''); setLyrics(''); setCollaborators(''); setIsEarlyAccess(false);
  };

  const handleStartEdit = (t: Track) => {
    setTitle(t.title);
    setAlbum(t.album || '');
    setLyrics(t.lyrics || '');
    setGenre(t.genre || 'Pop');
    setReleaseType(t.releaseType || 'SINGLE');
    setReleaseYear(t.releaseYear || 2026);
    setFileFormat(t.fileFormat || 'MP3');
    setCollaborators(t.collaborators || '');
    setIsEarlyAccess(t.isEarlyAccess || false);
    setEditingTrackId(t.id);
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingTrackId(null);
    setTitle(''); setAlbum(''); setLyrics(''); setCollaborators(''); setIsEarlyAccess(false);
  };

  const handleDeleteTrack = (trackId: string) => {
    if (!confirm('Delete this track from the platform?')) return;
    const allTracks = getDB<Track[]>('db_tracks', []).filter(t => t.id !== trackId);
    setDB('db_tracks', allTracks);
    setMyTracks(myTracks.filter(t => t.id !== trackId));
    if (editingTrackId === trackId) cancelEdit();
  };

  const handleUpdateBio = () => {
    updateUser({ bio });
    alert('Biography updated successfully!');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4 shadow-xl">
        <h3 className="font-bold text-white text-md">Artist Biography Settings</h3>
        <textarea rows={3} placeholder="Tell listeners about your musical background..." value={bio} onChange={e => setBio(e.target.value)} className="w-full p-2.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
        <button onClick={handleUpdateBio} className="px-5 py-2 bg-green-500 text-black font-bold text-xs rounded hover:bg-green-400">Save Biography</button>
      </div>

      <div className={`p-6 bg-neutral-900 border rounded-xl shadow-xl transition ${editingTrackId ? 'border-amber-500/80 bg-amber-950/10' : 'border-neutral-800'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">{editingTrackId ? '✏️ Editing Published Track' : 'Artist Studio & Upload Center'}</h2>
          {editingTrackId && <button onClick={cancelEdit} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1 rounded">Cancel Edit</button>}
        </div>

        <form onSubmit={handlePublishOrUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Track Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-medium" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Release Type</label>
              <select value={releaseType} onChange={e => setReleaseType(e.target.value as any)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white">
                <option value="SINGLE">Single</option>
                <option value="ALBUM">Album Track</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Audio File Format</label>
              <select value={fileFormat} onChange={e => setFileFormat(e.target.value as any)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm font-bold text-green-400">
                <option value="MP3">MP3 (320kbps)</option>
                <option value="WAV">WAV (Lossless)</option>
                <option value="FLAC">FLAC (High Res)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Genre</label>
              <input type="text" value={genre} onChange={e => setGenre(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Release Year</label>
              <input type="number" value={releaseYear} onChange={e => setReleaseYear(Number(e.target.value))} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Collaborating Artists</label>
              <input type="text" placeholder="Optional co-artists..." value={collaborators} onChange={e => setCollaborators(e.target.value)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
            </div>
          </div>

          {releaseType === 'ALBUM' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Album Name</label>
              <input type="text" value={album} onChange={e => setAlbum(e.target.value)} required className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white font-medium" />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">Lyrics</label>
            <textarea rows={3} value={lyrics} onChange={e => setLyrics(e.target.value)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white" />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input type="checkbox" checked={isEarlyAccess} onChange={e => setIsEarlyAccess(e.target.checked)} className="accent-amber-500" />
            <span className="text-xs text-amber-400 font-semibold">VIP Gold Early Access Release</span>
          </div>

          <button type="submit" className={`w-full py-2.5 font-bold text-sm rounded transition shadow ${editingTrackId ? 'bg-amber-400 hover:bg-amber-300 text-black' : 'bg-green-500 hover:bg-green-400 text-black'}`}>
            {editingTrackId ? 'Update Published Track ➡️' : 'Publish Track to Platform'}
          </button>
        </form>
      </div>

      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4">Published Works Management & Revenue Analytics</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-xs text-neutral-400">
                <th className="pb-3">Title</th>
                <th className="pb-3">Format</th>
                <th className="pb-3">Listeners</th>
                <th className="pb-3">Total Streams</th>
                <th className="pb-3">Est. Revenue (IRR)</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-sm">
              {myTracks.map(t => (
                <tr key={t.id} className={`hover:bg-neutral-800/30 transition ${editingTrackId === t.id ? 'bg-amber-500/10' : ''}`}>
                  <td className="py-3 font-bold text-white">{t.title}</td>
                  <td className="py-3 text-xs text-green-400 font-bold">{t.fileFormat || 'MP3'}</td>
                  <td className="py-3 text-neutral-300">{t.listenersCount.toLocaleString()}</td>
                  <td className="py-3 text-neutral-300">{t.totalStreams?.toLocaleString() || t.listenersCount * 2}</td>
                  <td className="py-3 font-mono text-amber-400 font-bold">{((t.totalStreams || t.listenersCount * 2) * 25).toLocaleString()} Toman</td>
                  <td className="py-3 space-x-2">
                    {/* Section 10.2 Requirement: Edit Track Button */}
                    <button onClick={() => handleStartEdit(t)} className="px-2.5 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded text-xs font-bold">✏️ Edit</button>
                    <button onClick={() => handleDeleteTrack(t.id)} className="px-2.5 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded text-xs font-bold">🗑️ Delete</button>
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