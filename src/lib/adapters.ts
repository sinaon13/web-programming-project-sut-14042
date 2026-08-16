/**
 * Data Adapters — Transform Django REST Framework responses into frontend types.
 *
 * Django serializers return snake_case with nested objects.
 * React components expect camelCase flat fields.
 * These pure functions bridge the gap.
 */

import { Track, Album, Playlist, Ticket, AppNotification, User } from './types';

// ---------------------------------------------------------------------------
// Track Adapter
// ---------------------------------------------------------------------------

export function adaptTrack(raw: any): Track {
  const artist = raw.artist || {};
  return {
    id: String(raw.id),
    title: raw.title || '',
    artistId: String(artist.id || raw.artist_id || ''),
    artistName: artist.display_name || artist.username || raw.artist_name || '',
    album: raw.album_title || (raw.album && typeof raw.album === 'object' ? raw.album.title : '') || '',
    albumId: raw.album && typeof raw.album === 'object' ? String(raw.album.id) : (raw.album ? String(raw.album) : undefined),
    coverUrl: (raw.cover || raw.coverUrl) 
      ? ((raw.cover || raw.coverUrl).startsWith('/media/') ? `http://127.0.0.1:8000${raw.cover || raw.coverUrl}` : (raw.cover || raw.coverUrl))
      : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300',
    audioUrl: (raw.audio_file || raw.audioUrl)
      ? ((raw.audio_file || raw.audioUrl).startsWith('/media/') ? `http://127.0.0.1:8000${raw.audio_file || raw.audioUrl}` : (raw.audio_file || raw.audioUrl))
      : 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    listenersCount: raw.listeners_count ?? raw.listenersCount ?? 0,
    totalStreams: raw.total_streams ?? raw.totalStreams ?? 0,
    releaseDate: raw.release_date || raw.releaseDate || '',
    isEarlyAccess: raw.is_early_access ?? raw.isEarlyAccess ?? false,
    lyrics: raw.lyrics || '',
    genre: raw.genre || '',
    releaseType: raw.release_type || raw.releaseType || 'SINGLE',
    releaseYear: raw.release_year || raw.releaseYear,
    collaborators: raw.collaborators || '',
    fileFormat: raw.file_format || raw.fileFormat || 'MP3',
  };
}

// ---------------------------------------------------------------------------
// Album Adapter
// ---------------------------------------------------------------------------

export function adaptAlbum(raw: any): Album {
  const artist = raw.artist || {};
  return {
    id: String(raw.id),
    title: raw.title || '',
    artistId: String(artist.id || raw.artist_id || ''),
    artistName: artist.display_name || artist.username || raw.artist_name || '',
    coverUrl: (raw.cover || raw.coverUrl)
      ? ((raw.cover || raw.coverUrl).startsWith('/media/') ? `http://127.0.0.1:8000${raw.cover || raw.coverUrl}` : (raw.cover || raw.coverUrl))
      : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300',
    releaseDate: raw.release_date || raw.releaseDate || '',
    genre: raw.genre || '',
  };
}

// ---------------------------------------------------------------------------
// Playlist Adapter
// ---------------------------------------------------------------------------

export function adaptPlaylist(raw: any): Playlist {
  // Django returns playlist_tracks as nested objects with {track: id, ...}
  let trackIds: string[] = [];
  if (Array.isArray(raw.playlist_tracks)) {
    trackIds = raw.playlist_tracks.map((pt: any) => String(pt.track));
  } else if (Array.isArray(raw.track_ids)) {
    trackIds = raw.track_ids.map(String);
  } else if (Array.isArray(raw.trackIds)) {
    trackIds = raw.trackIds.map(String);
  }

  return {
    id: String(raw.id),
    name: raw.title || raw.name || '',
    ownerId: String(raw.owner || raw.ownerId || ''),
    trackIds,
  };
}

// ---------------------------------------------------------------------------
// Ticket Adapter
// ---------------------------------------------------------------------------

export function adaptTicket(raw: any): Ticket {
  const messages = (raw.messages || []).map((m: any) => ({
    sender: m.sender_role === 'ADMIN' || m.sender_role === 'SUPPORT' ? 'Support / Admin' : (m.sender_display || m.sender_name || m.sender || 'User'),
    text: m.body || m.text || '',
    time: m.created_at || m.time || '',
  }));

  return {
    id: String(raw.id),
    ticketNumber: raw.ticket_number || raw.ticketNumber || `#${raw.id}`,
    userId: String(raw.user || raw.userId || ''),
    userName: raw.user_display || raw.userName || '',
    subject: raw.subject || '',
    status: raw.status || 'OPEN',
    createdAt: raw.created_at || raw.createdAt || '',
    messages,
  };
}

// ---------------------------------------------------------------------------
// Notification Adapter
// ---------------------------------------------------------------------------

export function adaptNotification(raw: any): AppNotification {
  return {
    id: String(raw.id),
    userId: String(raw.recipient || raw.userId || ''),
    title: raw.title || '',
    message: raw.message || '',
    isRead: raw.is_read ?? raw.isRead ?? false,
    timestamp: raw.created_at || raw.timestamp || '',
    targetUrl: raw.link || raw.targetUrl,
  };
}

// ---------------------------------------------------------------------------
// User Adapter (for public profiles, artist pages)
// ---------------------------------------------------------------------------

export function adaptPublicUser(raw: any): User {
  return {
    id: String(raw.id),
    email: raw.email || '',
    name: raw.display_name || raw.username || raw.name || '',
    role: raw.role || 'LISTENER',
    tier: raw.tier || 'BASIC',
    avatar: raw.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    followersCount: raw.followers_count || raw.followersCount || 0,
    followingCount: raw.following_count || raw.followingCount || 0,
    isFollowing: raw.is_following ?? raw.isFollowing ?? false,
    dailyStreams: raw.dailyStreams || 0,
    birthDate: raw.birth_date || raw.birthDate,
    gender: raw.gender,
    status: raw.artist_status || raw.status,
    rejectionReason: raw.rejection_reason || raw.rejectionReason,
    portfolioUrl: raw.portfolio_url || raw.portfolioUrl,
    bio: raw.bio,
    subscriptionExpiresAt: raw.subscription_expires_at || raw.subscriptionExpiresAt,
    subscriptionDaysLeft: raw.subscription_days_left ?? raw.subscriptionDaysLeft,
    isMonetized: raw.is_monetized || raw.isMonetized,
    totalEarnings: raw.total_earnings || raw.totalEarnings ? parseFloat(raw.total_earnings || raw.totalEarnings) : 0,
  };
}
