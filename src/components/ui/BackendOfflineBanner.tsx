'use client';
import React from 'react';

interface BackendBannerProps {
  show: boolean;
}

export const BackendOfflineBanner: React.FC<BackendBannerProps> = ({ show }) => {
  if (!show) return null;
  return (
    <div className="bg-yellow-900/60 border border-yellow-600 text-yellow-200 text-xs px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
      <span className="text-base">⚠️</span>
      <span>
        <strong>Backend offline</strong> — Django server is not running. Showing cached/local data. 
        Start with: <code className="bg-yellow-800/50 px-1 py-0.5 rounded text-yellow-100">uv run python manage.py runserver</code>
      </span>
    </div>
  );
};
