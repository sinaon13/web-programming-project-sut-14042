'use client';
import React, { useEffect } from 'react';

export const PwaRegistry: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').catch(
          function(err) {
            console.log('Service Worker registration failed: ', err);
          }
        );
      });
    }
  }, []);

  return null;
};