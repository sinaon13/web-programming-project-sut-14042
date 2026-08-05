'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, AppNotification } from '@/lib/types';
import { getDB, setDB, initDB } from '@/lib/mockData';
import { authAPI, getAccessToken, clearTokens } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password?: string) => Promise<boolean> | boolean;
  logout: () => void;
  register: (name: string, email: string, role: Role, birthDate?: string, gender?: 'MALE' | 'FEMALE' | 'OTHER', portfolioUrl?: string, password?: string) => Promise<void> | void;
  updateUser: (updated: Partial<User>) => Promise<void> | void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    initDB();
    // 1. Check if JWT token exists in localStorage
    const token = getAccessToken();
    if (token) {
      authAPI.getMe()
        .then(user => {
          // Adapt Django user format to frontend User type if needed
          const adaptedUser: User = {
            id: String(user.id),
            email: user.email,
            name: (user as any).display_name || user.name || user.email.split('@')[0],
            role: user.role || 'LISTENER',
            tier: (user as any).tier || 'BASIC',
            avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            followersCount: user.followersCount || 0,
            followingCount: user.followingCount || 0,
            dailyStreams: user.dailyStreams || 0,
            birthDate: (user as any).birth_date || user.birthDate,
            gender: user.gender,
            status: (user as any).artist_status || user.status,
            portfolioUrl: (user as any).portfolio_url || user.portfolioUrl,
            bio: user.bio,
          };
          setCurrentUser(adaptedUser);
          setDB('auth_user', adaptedUser);
        })
        .catch(() => {
          // Fallback to local offline state if backend is unreachable
          const stored = getDB<User | null>('auth_user', null);
          if (stored) {
            setCurrentUser(stored);
          }
        });
    } else {
      // Fallback for mock/local development when offline
      const stored = getDB<User | null>('auth_user', null);
      if (stored) {
        const allUsers = getDB<User[]>('db_users', []);
        const freshUser = allUsers.find(u => u.id === stored.id) || stored;
        setCurrentUser(freshUser);
        setDB('auth_user', freshUser);
      }
    }
  }, []);

  const login = async (email: string, password = 'DefaultPassword123!') => {
    try {
      // Try Django backend authentication first
      await authAPI.login(email, password);
      const user = await authAPI.getMe();
      const adaptedUser: User = {
        id: String(user.id),
        email: user.email,
        name: (user as any).display_name || user.name || user.email.split('@')[0],
        role: user.role || 'LISTENER',
        tier: (user as any).tier || 'BASIC',
        avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
        dailyStreams: user.dailyStreams || 0,
        birthDate: (user as any).birth_date || user.birthDate,
        gender: user.gender,
        status: (user as any).artist_status || user.status,
        portfolioUrl: (user as any).portfolio_url || user.portfolioUrl,
        bio: user.bio,
      };
      setCurrentUser(adaptedUser);
      setDB('auth_user', adaptedUser);
      return true;
    } catch (err) {
      // Fallback to offline mock users if backend is not running
      const users = getDB<User[]>('db_users', []);
      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (found) {
        setCurrentUser(found);
        setDB('auth_user', found);
        return true;
      }
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    clearTokens();
    if (typeof window !== 'undefined') {
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
  ) => {
    try {
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
      await login(email, password);
    } catch (err) {
      // Offline fallback
      const users = getDB<User[]>('db_users', []);
      const newUser: User = {
        id: 'u_' + Date.now(),
        email,
        name,
        role,
        tier: 'BASIC',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        followersCount: 0,
        followingCount: 0,
        dailyStreams: 0,
        birthDate,
        gender,
        status: role === 'ARTIST' ? 'PENDING' : undefined,
        portfolioUrl
      };
      users.push(newUser);
      setDB('db_users', users);
      setCurrentUser(newUser);
      setDB('auth_user', newUser);
    }
  };

  const updateUser = async (updated: Partial<User>) => {
    if (!currentUser) return;
    try {
      const djangoPayload: Record<string, any> = {};
      if (updated.name) djangoPayload.display_name = updated.name;
      if (updated.bio) djangoPayload.bio = updated.bio;
      if (updated.avatar) djangoPayload.avatar = updated.avatar;
      
      const res = await authAPI.updateMe(djangoPayload);
      const merged = { ...currentUser, ...updated };
      setCurrentUser(merged);
      setDB('auth_user', merged);
    } catch (err) {
      const merged = { ...currentUser, ...updated };
      setCurrentUser(merged);
      setDB('auth_user', merged);
      const users = getDB<User[]>('db_users', []).map(u => u.id === merged.id ? merged : u);
      setDB('db_users', users);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
