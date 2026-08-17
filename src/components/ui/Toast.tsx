'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const iconMap = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  };

  const colorMap = {
    success: 'border-green-500/40 bg-green-950/80 text-green-300',
    error: 'border-red-500/40 bg-red-950/80 text-red-300',
    info: 'border-blue-500/40 bg-blue-950/80 text-blue-300',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm" style={{ direction: 'ltr' }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-5 py-4 rounded-xl border shadow-2xl backdrop-blur-md animate-slideIn ${colorMap[toast.type]}`}
            style={{ animation: 'slideIn 0.3s ease-out' }}
          >
            <span className="text-lg flex-shrink-0 mt-0.5">{iconMap[toast.type]}</span>
            <p className="text-sm font-medium leading-relaxed">{toast.text}</p>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-auto text-xs opacity-60 hover:opacity-100 transition flex-shrink-0 mt-0.5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
};
