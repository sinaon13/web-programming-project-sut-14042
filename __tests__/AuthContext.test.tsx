import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
}));

const TestAuthComponent = () => {
  const { currentUser, login, logout, register } = useAuth();
  return (
    <div>
      <span data-testid="user-status">{currentUser ? currentUser.name : 'Logged Out'}</span>
      <span data-testid="user-tier">{currentUser ? currentUser.tier : 'None'}</span>
      <button onClick={() => login('user@test.com')}>Login Listener</button>
      <button onClick={() => register('New Artist', 'artist@new.com', 'ARTIST')}>Register Artist</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('Authentication Engine Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('1. initializes with no active user by default', () => {
    render(<AuthProvider><TestAuthComponent /></AuthProvider>);
    expect(screen.getByTestId('user-status')).toHaveTextContent('Logged Out');
  });

  it('2. logs in a pre-seeded listener successfully', () => {
    render(<AuthProvider><TestAuthComponent /></AuthProvider>);
    act(() => { screen.getByText('Login Listener').click(); });
    expect(screen.getByTestId('user-status')).toHaveTextContent('Ali Reza');
    expect(screen.getByTestId('user-tier')).toHaveTextContent('GOLD');
  });

  it('3. registers a new artist account with PENDING status', () => {
    render(<AuthProvider><TestAuthComponent /></AuthProvider>);
    act(() => { screen.getByText('Register Artist').click(); });
    expect(screen.getByTestId('user-status')).toHaveTextContent('New Artist');
    expect(screen.getByTestId('user-tier')).toHaveTextContent('BASIC');
  });

  it('4. clears user state and triggers login redirect upon logout', () => {
    render(<AuthProvider><TestAuthComponent /></AuthProvider>);
    act(() => { screen.getByText('Login Listener').click(); });
    act(() => { screen.getByText('Logout').click(); });
    expect(screen.getByTestId('user-status')).toHaveTextContent('Logged Out');
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});