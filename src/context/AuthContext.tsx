'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, AppNotification } from '@/lib/types';
import { getDB, setDB, initDB } from '@/lib/mockData';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string) => boolean;
  logout: () => void;
  register: (name: string, email: string, role: Role, birthDate?: string, gender?: 'MALE' | 'FEMALE' | 'OTHER', portfolioUrl?: string) => void;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    initDB();
    const stored = getDB<User | null>('auth_user', null);
    if (stored) {
      // FIX: Always sync with db_users to catch Admin approvals/rejections immediately!
      const allUsers = getDB<User[]>('db_users', []);
      const freshUser = allUsers.find(u => u.id === stored.id) || stored;
      setCurrentUser(freshUser);
      setDB('auth_user', freshUser);
    }
  }, []);

  const login = (email: string) => {
    const users = getDB<User[]>('db_users', []);
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setCurrentUser(found);
      setDB('auth_user', found);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('auth_user');
    router.push('/login');
  };

  const register = (name: string, email: string, role: Role, birthDate?: string, gender?: 'MALE' | 'FEMALE' | 'OTHER', portfolioUrl?: string) => {
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

    if (role === 'ARTIST') {
      const notifs = getDB<AppNotification[]>('db_notifications', []);
      const adminNotif: AppNotification = {
        id: 'n_' + Date.now(),
        userId: 'admin_support',
        title: '🔔 New Artist Application Pending',
        message: `${name} (${email}) applied for verification. Sample: ${portfolioUrl || 'None'}`,
        isRead: false,
        timestamp: 'Just now',
        targetUrl: '/admin'
      };
      setDB('db_notifications', [adminNotif, ...notifs]);
    }
  };

  const updateUser = (updated: Partial<User>) => {
    if (!currentUser) return;
    const merged = { ...currentUser, ...updated };
    setCurrentUser(merged);
    setDB('auth_user', merged);
    const users = getDB<User[]>('db_users', []).map(u => u.id === merged.id ? merged : u);
    setDB('db_users', users);
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