// Central API Client for Django REST Framework Backend (Phase 2 Integration)
// Base URL points to Django dev server on port 8000
import { User, Role, Track, Album, Playlist, AppNotification, Ticket } from './types';

export const BASE_HOST = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : 'http://localhost:8000';
export const BASE_URL = `${BASE_HOST}/api`;

// ---------------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------------

export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
};

export const setTokens = (access: string, refresh: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

export const clearTokens = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_user');
};

// ---------------------------------------------------------------------------
// Core API Request Wrapper with Automatic Silent Token Refresh
// ---------------------------------------------------------------------------

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    if (data.access) {
      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      return data.access;
    }
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    clearTokens();
  }
  return null;
}

export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  // Do not set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  // Handle 401 Unauthorized -> Refresh Token and retry
  if (response.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
        cache: 'no-store',
        ...options,
        headers,
      });
      if (!retryResponse.ok) {
        const errorData = await retryResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `Request failed with status ${retryResponse.status}`);
      }
      return retryResponse.status === 204 ? ({} as T) : await retryResponse.json();
    } else {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth_logout'));
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || JSON.stringify(errorData) || `Request failed with status ${response.status}`);
  }

  return response.status === 204 ? ({} as T) : await response.json();
}

// ---------------------------------------------------------------------------
// 1. Accounts & Authentication Endpoints
// ---------------------------------------------------------------------------

export const authAPI = {
  login: async (email: string, password = 'DefaultPassword123!'): Promise<{ access: string; refresh: string }> => {
    const data = await apiCall<{ access: string; refresh: string }>(
      '/token/',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      false
    );
    setTokens(data.access, data.refresh);
    return data;
  },

  registerListener: async (payload: {
    email: string;
    username?: string;
    password: string;
    password_confirm: string;
    display_name?: string;
    birth_date?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
  }) => {
    return apiCall('/accounts/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  registerArtist: async (payload: {
    email: string;
    username?: string;
    password: string;
    password_confirm: string;
    display_name?: string;
    birth_date?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    bio?: string;
    portfolio_url?: string;
  }) => {
    return apiCall('/accounts/register/artist/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe: async (): Promise<User> => {
    return apiCall<User>('/accounts/me/');
  },

  updateMe: async (data: Partial<User>): Promise<User> => {
    return apiCall<User>('/accounts/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiCall<User>('/accounts/me/', {
      method: 'PATCH',
      body: formData,
    });
  },

  deleteAccount: async () => {
    return apiCall('/accounts/me/', { method: 'DELETE' });
  },

  getPublicUser: async (id: string | number) => {
    return apiCall(`/accounts/users/${id}/`);
  },

  followUser: async (id: string | number) => {
    return apiCall(`/accounts/users/${id}/follow/`, { method: 'POST' });
  },

  unfollowUser: async (id: string | number) => {
    return apiCall(`/accounts/users/${id}/follow/`, { method: 'DELETE' });
  },

  getPreferences: async (): Promise<{ language: 'en' | 'fa'; volume: number; notifications_enabled: boolean }> => {
    return apiCall('/accounts/preferences/');
  },

  updatePreferences: async (data: { language?: 'en' | 'fa'; volume?: number; notifications_enabled?: boolean }) => {
    return apiCall('/accounts/preferences/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  requestPasswordReset: async (email: string) => {
    return apiCall('/accounts/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

// ---------------------------------------------------------------------------
// 2. Music Catalog & Streaming Endpoints
// ---------------------------------------------------------------------------

export const musicAPI = {
  getTracks: async (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiCall<{ results: Track[] }>(`/music/tracks/${query}`);
  },

  getTrack: async (id: string | number): Promise<Track> => {
    return apiCall<Track>(`/music/tracks/${id}/`);
  },

  uploadTrack: async (formData: FormData) => {
    return apiCall('/music/tracks/', {
      method: 'POST',
      body: formData,
    });
  },

  updateTrack: async (id: string | number, formData: FormData): Promise<Track> => {
    return apiCall<Track>(`/music/tracks/${id}/`, {
      method: 'PATCH',
      body: formData,
    });
  },

  deleteTrack: async (id: string | number): Promise<void> => {
    return apiCall(`/music/tracks/${id}/`, { method: 'DELETE' });
  },

  downloadTrack: async (id: string | number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const url = `${BASE_URL}/music/tracks/${id}/download/`;
    
    // We fetch it explicitly so we can pass the auth header and handle the redirect/blob
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!res.ok) {
      let msg = 'Download failed';
      try {
        const errData = await res.json();
        msg = errData.detail || msg;
      } catch (e) {}
      throw new Error(msg);
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    // Extract filename from content-disposition or just use a default
    a.download = `track-${id}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  streamTrack: async (id: string | number) => {
    return apiCall(`/music/tracks/${id}/stream/`, { method: 'POST' });
  },

  getAlbums: async (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiCall<{ results: Album[] }>(`/music/albums/${query}`);
  },

  getAlbum: async (id: string | number): Promise<Album> => {
    return apiCall<Album>(`/music/albums/${id}/`);
  },

  createAlbum: async (data: Partial<Album>) => {
    return apiCall('/music/albums/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ---------------------------------------------------------------------------
// 3. Playlists Endpoints
// ---------------------------------------------------------------------------

export const playlistsAPI = {
  getPlaylists: async (type?: 'mine' | 'all') => {
    const query = type ? `?type=${type}` : '';
    return apiCall<{ results: Playlist[] }>(`/playlists/${query}`);
  },

  createPlaylist: async (title: string, description = '', is_public = true) => {
    return apiCall('/playlists/', {
      method: 'POST',
      body: JSON.stringify({ title, description, is_public }),
    });
  },

  getPlaylist: async (id: string | number) => {
    return apiCall(`/playlists/${id}/`);
  },

  updatePlaylist: async (id: string | number, data: Partial<Playlist>) => {
    return apiCall(`/playlists/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deletePlaylist: async (id: string | number) => {
    return apiCall(`/playlists/${id}/`, { method: 'DELETE' });
  },

  addTrack: async (playlistId: string | number, trackId: string | number, position = 0) => {
    return apiCall(`/playlists/${playlistId}/tracks/`, {
      method: 'POST',
      body: JSON.stringify({ track_id: trackId, position }),
    });
  },

  removeTrack: async (playlistId: string | number, trackId: string | number) => {
    return apiCall(`/playlists/${playlistId}/tracks/${trackId}/`, { method: 'DELETE' });
  },
};

// ---------------------------------------------------------------------------
// 4. Support Tickets & Artist Approval
// ---------------------------------------------------------------------------

export const supportAPI = {
  getTickets: async () => {
    return apiCall<{ results: Ticket[] }>('/support/tickets/');
  },

  createTicket: async (subject: string, description: string, priority = 'MEDIUM') => {
    return apiCall('/support/tickets/', {
      method: 'POST',
      body: JSON.stringify({ subject, description, priority }),
    });
  },

  getTicket: async (id: string | number) => {
    return apiCall(`/support/tickets/${id}/`);
  },

  addMessage: async (ticketId: string | number, body: string) => {
    return apiCall(`/support/tickets/${ticketId}/messages/`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },

  getPendingArtists: async () => {
    return apiCall('/support/artist-requests/');
  },

  approveArtist: async (userId: string | number) => {
    return apiCall(`/support/artist-requests/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'APPROVED' }),
    });
  },

  rejectArtist: async (userId: string | number, reason: string) => {
    return apiCall(`/support/artist-requests/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'REJECTED', reason }),
    });
  },

  updateTicketStatus: async (ticketId: string | number, ticketStatus: string) => {
    return apiCall(`/support/tickets/${ticketId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: ticketStatus }),
    });
  },
};

// ---------------------------------------------------------------------------
// 5. Subscriptions & Payments
// ---------------------------------------------------------------------------

export const subscriptionsAPI = {
  getPlans: async () => {
    return apiCall('/subscriptions/plans/');
  },

  updatePlanPrice: async (id: number, price: number) => {
    return apiCall(`/subscriptions/plans/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ price }),
    });
  },

  getMySubscription: async () => {
    return apiCall('/subscriptions/me/');
  },

  purchase: async (planId: number, months: number = 1) => {
    return apiCall('/subscriptions/purchase/', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, months }),
    });
  },

  verifyPayment: async (authority: string, status: string) => {
    return apiCall('/subscriptions/verify-payment/', {
      method: 'POST',
      body: JSON.stringify({ authority, status }),
    });
  },

  getTransactions: async () => {
    return apiCall('/subscriptions/transactions/');
  },

  advanceTime: async (days: number) => {
    return apiCall('/subscriptions/time-offsets/', {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
  },
};

// ---------------------------------------------------------------------------
// 6. Notifications
// ---------------------------------------------------------------------------

export const notificationsAPI = {
  getNotifications: async (params?: { is_read?: boolean }) => {
    const query = params && params.is_read !== undefined ? `?is_read=${params.is_read}` : '';
    return apiCall<{ results: AppNotification[] }>(`/notifications/${query}`);
  },

  markAsRead: async (id: string | number) => {
    return apiCall(`/notifications/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_read: true }),
    });
  },

  markAllRead: async () => {
    return apiCall('/notifications/mark-all-read/', { method: 'POST' });
  },

  getUnreadCount: async () => {
    return apiCall<{ unread_count: number }>('/notifications/unread-count/');
  },

  deleteNotification: async (id: string | number) => {
    return apiCall(`/notifications/${id}/`, { method: 'DELETE' });
  },
};

// ---------------------------------------------------------------------------
// 7. Aggregated Reports & Analytics
// ---------------------------------------------------------------------------

export const reportsAPI = {
  getAdminDashboard: async () => {
    return apiCall('/reports/admin/dashboard/');
  },

  getAdminPayouts: async () => {
    return apiCall('/reports/admin/payouts/');
  },

  settlePayouts: async (artistIds: (string | number)[]) => {
    return apiCall('/reports/admin/payouts/', {
      method: 'POST',
      body: JSON.stringify({ artist_ids: artistIds }),
    });
  },

  getArtistStats: async () => {
    return apiCall('/reports/artist/stats/');
  },
};
