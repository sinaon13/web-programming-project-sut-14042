export type Role = 'LISTENER' | 'ARTIST' | 'SUPPORT' | 'ADMIN';
export type Tier = 'BASIC' | 'SILVER' | 'GOLD';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tier: Tier;
  avatar: string;
  followersCount: number;
  followingCount: number;
  dailyStreams: number;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  portfolioUrl?: string;
  bio?: string;
  payoutStatus?: 'PENDING' | 'SETTLED';
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  album: string;
  albumId?: string;
  coverUrl: string;
  audioUrl: string;
  listenersCount: number;
  totalStreams: number;
  releaseDate: string;
  isEarlyAccess: boolean;
  lyrics?: string;
  genre?: string;
  releaseType?: 'SINGLE' | 'ALBUM';
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