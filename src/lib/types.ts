export type Role = 'LISTENER' | 'ARTIST' | 'SUPPORT' | 'ADMIN';
export type Tier = 'BASIC' | 'SILVER' | 'GOLD';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tier: Tier;
  subscriptionExpiresAt?: string;
  subscriptionDaysLeft?: number;
  isMonetized?: boolean;
  totalEarnings?: number;
  avatar: string;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  dailyStreams: number;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  portfolioUrl?: string;
  bio?: string;
  payoutStatus?: 'PENDING' | 'SETTLED';
  totalStreams?: number;
  tracksCount?: number;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  artistAvatar?: string;
  album: string;
  albumId?: string;
  albumTitle?: string;
  coverUrl?: string;
  audioUrl?: string;
  audioUrl128?: string;
  listenersCount: number;
  totalStreams: number;
  releaseDate: string;
  releaseType: 'SINGLE' | 'ALBUM';
  isEarlyAccess: boolean;
  lyrics?: string;
  genre?: string;
  releaseYear?: number;
  collaborators?: string;
  fileFormat?: 'MP3' | 'WAV' | 'FLAC';
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  coverUrl: string;
  releaseDate: string;
  genre?: string;
  trackCount?: number;
}

export interface Playlist {
  id: string;
  name: string;
  ownerId: string;
  trackIds: string[];
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  timestamp: string;
  targetUrl?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  subject: string;
  status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  createdAt: string;
  messages: { sender: string; text: string; time: string }[];
}