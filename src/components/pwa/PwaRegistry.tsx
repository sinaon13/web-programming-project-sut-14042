'use client';
import React, { useEffect } from 'react';

export const PwaRegistry: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('✅ PWA Service Worker registered successfully with scope:', registration.scope);
          },
          (error) => {
            console.error('⛔ PWA Service Worker registration failed:', error);
          }
        );
      });
    }
  }, []);

  return null;
};