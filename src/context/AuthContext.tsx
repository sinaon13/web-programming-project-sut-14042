'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '@/lib/types';
import { authAPI, getAccessToken, clearTokens } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, role: Role, birthDate?: string, gender?: 'MALE' | 'FEMALE' | 'OTHER', portfolioUrl?: string, password?: string) => Promise<void>;
  updateUser: (updated: Partial<User>) => Promise<void>;
  backendOnline: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Adapt a Django user response to the frontend User type */
function adaptDjangoUser(user: any): User {
  return {
    id: String(user.id),
    email: user.email,
    name: user.display_name || user.name || user.email.split('@')[0],
    role: user.role || 'LISTENER',
    tier: user.tier || 'BASIC',
    avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    followersCount: user.followers_count || user.followersCount || 0,
    followingCount: user.following_count || user.followingCount || 0,
    dailyStreams: user.dailyStreams || 0,
    birthDate: user.birth_date || user.birthDate,
    gender: user.gender,
    status: user.artist_status || user.status,
    portfolioUrl: user.portfolio_url || user.portfolioUrl,
    bio: user.bio,
    rejectionReason: user.rejection_reason || user.rejectionReason,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [backendOnline, setBackendOnline] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      authAPI.getMe()
        .then(user => {
          const adapted = adaptDjangoUser(user);
          setCurrentUser(adapted);
          setBackendOnline(true);
        })
        .catch(() => {
          // Token exists but backend unreachable — clear stale session
          setBackendOnline(false);
        });
    }
  }, []);

  const login = async (email: string, password = 'DefaultPassword123!'): Promise<boolean> => {
    // Always go through Django backend — no localStorage fallback
    try {
      await authAPI.login(email, password);
      const user = await authAPI.getMe();
      const adapted = adaptDjangoUser(user);
      setCurrentUser(adapted);
      setBackendOnline(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth_login'));
      }
      return true;
    } catch (err: any) {
      setBackendOnline(!err?.message?.includes('fetch'));
      throw err; // Let the login page display the error
    }
  };

  const logout = () => {
    setCurrentUser(null);
    clearTokens();
    
    // Clear user-specific language setting
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_lang');
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
      window.dispatchEvent(new Event('auth_logout'));
    }
    
    router.push('/login');
  };

  const register = async (
    name: string,
    email: string,
    role: Role,
    birthDate?: string,
    gender?: 'MALE' | 'FEMALE' | 'OTHER',
    portfolioUrl?: string,
    password = 'DefaultPassword123!'
  ): Promise<void> => {
    // Always go through Django backend — no localStorage fallback
    const cleanUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') + Math.floor(Math.random() * 1000);
    const payload: Record<string, any> = {
      email,
      username: cleanUsername,
      password,
      password_confirm: password,
      display_name: name,
    };
    if (birthDate && birthDate.trim() !== '') {
      payload.birth_date = birthDate;
    }
    if (gender && gender.trim() !== '') {
      payload.gender = gender;
    }
    if (role === 'ARTIST') {
      if (portfolioUrl && portfolioUrl.trim() !== '') {
        payload.portfolio_url = portfolioUrl;
      }
      await authAPI.registerArtist(payload as any);
    } else {
      await authAPI.registerListener(payload as any);
    }
    // Auto-login after successful registration
    await authAPI.login(email, password);
    const user = await authAPI.getMe();
    const adapted = adaptDjangoUser(user);
    setCurrentUser(adapted);
    setBackendOnline(true);
  };

  const updateUser = async (updated: Partial<User>): Promise<void> => {
    if (!currentUser) return;
    // Always go through Django backend
    const djangoPayload: Record<string, any> = {};
    if (updated.name) djangoPayload.display_name = updated.name;
    if (updated.bio) djangoPayload.bio = updated.bio;
    if (updated.avatar) djangoPayload.avatar = updated.avatar;

    await authAPI.updateMe(djangoPayload);
    const merged = { ...currentUser, ...updated };
    setCurrentUser(merged);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, register, updateUser, backendOnline }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
