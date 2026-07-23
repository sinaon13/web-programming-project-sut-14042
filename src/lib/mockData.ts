import { User, Track, Album, Playlist, AppNotification, Ticket } from './types';

const INITIAL_USERS: User[] = [
  { id: 'u1', email: 'user@test.com', name: 'Ali Reza', role: 'LISTENER', tier: 'GOLD', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', followersCount: 12, followingCount: 4, dailyStreams: 15, birthDate: '1998-04-12', gender: 'MALE' },
  { id: 'a1', email: 'artist@test.com', name: 'Salar Aghili', role: 'ARTIST', tier: 'GOLD', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', followersCount: 45000, followingCount: 10, dailyStreams: 120000, status: 'APPROVED', bio: 'Renowned traditional Persian vocal master with over 20 years of classical performance experience.', payoutStatus: 'PENDING' },
  { id: 'a2', email: 'pending@test.com', name: 'Novice Singer', role: 'ARTIST', tier: 'BASIC', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150', followersCount: 0, followingCount: 0, dailyStreams: 0, status: 'PENDING', portfolioUrl: 'https://soundcloud.com/sample', bio: 'Aspiring pop singer from Tehran.' },
  { id: 'a3', email: 'rejected@test.com', name: 'Low Quality Audio', role: 'ARTIST', tier: 'BASIC', avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150', followersCount: 0, followingCount: 0, dailyStreams: 0, status: 'REJECTED', rejectionReason: 'Audio sample bitrate is below platform minimum requirements (must be at least 320kbps MP3 or WAV).', portfolioUrl: 'https://soundcloud.com/bad-audio' },
  { id: 's1', email: 'support@test.com', name: 'Support Agent', role: 'SUPPORT', tier: 'GOLD', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', followersCount: 0, followingCount: 0, dailyStreams: 0 },
  { id: 'admin1', email: 'admin@test.com', name: 'System Admin', role: 'ADMIN', tier: 'GOLD', avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150', followersCount: 100, followingCount: 100, dailyStreams: 50 }
];

const INITIAL_ALBUMS: Album[] = [
  { id: 'alb1', title: 'Tradition & Heritage', artistId: 'a1', artistName: 'Salar Aghili', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300', releaseDate: '2026-05-10', genre: 'Traditional Persian' }
];

const INITIAL_TRACKS: Track[] = [
  { id: 't1', title: 'Persian Gulf', artistId: 'a1', artistName: 'Salar Aghili', album: 'Tradition & Heritage', albumId: 'alb1', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', listenersCount: 84000, totalStreams: 210000, releaseDate: '2026-05-10', isEarlyAccess: false, lyrics: 'O Persian Gulf, eternal heritage...', releaseType: 'ALBUM', releaseYear: 2026, genre: 'Traditional', fileFormat: 'FLAC' },
  { id: 't2', title: 'Midnight Shiraz (VIP Only)', artistId: 'a1', artistName: 'Salar Aghili', album: 'Tradition & Heritage', albumId: 'alb1', coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', listenersCount: 1200, totalStreams: 3400, releaseDate: '2026-07-01', isEarlyAccess: true, lyrics: 'Under the starlit sky of Shiraz...', releaseType: 'ALBUM', releaseYear: 2026, genre: 'Traditional', fileFormat: 'WAV' },
  { id: 't3', title: 'Tehran Nights (Single)', artistId: 'a1', artistName: 'Salar Aghili', album: 'Single Release', coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', listenersCount: 15400, totalStreams: 42000, releaseDate: '2026-06-15', isEarlyAccess: false, releaseType: 'SINGLE', releaseYear: 2026, genre: 'Pop Classical', fileFormat: 'MP3' }
];

export function initDB() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem('db_users')) localStorage.setItem('db_users', JSON.stringify(INITIAL_USERS));
  if (!localStorage.getItem('db_albums')) localStorage.setItem('db_albums', JSON.stringify(INITIAL_ALBUMS));
  if (!localStorage.getItem('db_playlists')) localStorage.setItem('db_playlists', JSON.stringify([]));
  if (!localStorage.getItem('db_prices')) localStorage.setItem('db_prices', JSON.stringify({ SILVER: 50000, GOLD: 120000 }));
  
  if (!localStorage.getItem('db_notifications')) {
    localStorage.setItem('db_notifications', JSON.stringify([
      { id: 'n1', userId: 'u1', title: 'New Release!', message: 'Salar Aghili released Midnight Shiraz.', isRead: false, timestamp: '10 mins ago', targetUrl: '/browse' }
    ]));
  }
  if (!localStorage.getItem('db_tickets')) {
    localStorage.setItem('db_tickets', JSON.stringify([
      { id: 'tk1', ticketNumber: '#TK-8492', userId: 'u1', userName: 'Ali Reza', subject: 'Audio buffering issue', status: 'OPEN', createdAt: '2026-07-20 14:30', messages: [{ sender: 'Ali Reza', text: 'Songs pause after 10 seconds.', time: '14:30' }] }
    ]));
  }

  if (!localStorage.getItem('db_tracks')) {
    localStorage.setItem('db_tracks', JSON.stringify(INITIAL_TRACKS));
  }

  // UNCONDITIONAL AUTO-SYNC SWEEP: Guarantees 100% identical artwork across albums on every refresh!
  const storedTracks = localStorage.getItem('db_tracks');
  const storedAlbums = localStorage.getItem('db_albums');
  if (storedTracks && storedAlbums) {
    let tracks: Track[] = JSON.parse(storedTracks);
    let albums: Album[] = JSON.parse(storedAlbums);
    let albumsModified = false;
    let tracksModified = false;

    // Step 1: If tracks belong to an album name that isn't in db_albums yet, create the album automatically!
    tracks.forEach(tItem => {
      if (tItem.releaseType === 'ALBUM' && tItem.album && tItem.album !== 'Single Release') {
        const found = albums.find(a => a.id === tItem.albumId || (a.title.toLowerCase() === tItem.album!.toLowerCase() && a.artistId === tItem.artistId));
        if (!found) {
          const newAlb: Album = {
            id: 'alb_' + Date.now() + Math.floor(Math.random() * 1000),
            title: tItem.album,
            artistId: tItem.artistId,
            artistName: tItem.artistName,
            coverUrl: tItem.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300',
            releaseDate: tItem.releaseDate || new Date().toISOString().split('T')[0],
            genre: tItem.genre || 'Pop'
          };
          albums.push(newAlb);
          albumsModified = true;
        }
      }
    });

    // Step 2: Force every single track to inherit its official Album's cover image and ID!
    tracks = tracks.map(tItem => {
      if (tItem.releaseType === 'ALBUM' || tItem.albumId || (tItem.album && tItem.album !== 'Single Release')) {
        const officialAlbum = albums.find(a => a.id === tItem.albumId || (a.title.toLowerCase() === (tItem.album || '').toLowerCase() && a.artistId === tItem.artistId));
        if (officialAlbum && (tItem.coverUrl !== officialAlbum.coverUrl || tItem.albumId !== officialAlbum.id)) {
          tracksModified = true;
          return { ...tItem, coverUrl: officialAlbum.coverUrl, albumId: officialAlbum.id, album: officialAlbum.title };
        }
      }
      return tItem;
    });

    if (albumsModified) localStorage.setItem('db_albums', JSON.stringify(albums));
    if (tracksModified || albumsModified) localStorage.setItem('db_tracks', JSON.stringify(tracks));
  }
}

export const getDB = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : fallback;
};

export const setDB = <T>(key: string, data: T): void => {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(data));
};