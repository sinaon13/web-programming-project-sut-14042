import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { PlayerProvider } from '@/context/PlayerContext';
import { Navigation } from '@/components/layout/Navigation';
import { PlayerBar } from '@/components/player/PlayerBar';

export const metadata = { title: 'Spotify Clone - Web Programming Project' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen flex flex-col font-sans">
        <AuthProvider>
          <PlayerProvider>
            <div className="flex flex-col md:flex-row flex-1 pb-24">
              <Navigation />
              <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
                {children}
              </main>
            </div>
            <PlayerBar />
          </PlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}