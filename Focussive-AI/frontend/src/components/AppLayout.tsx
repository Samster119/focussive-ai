'use client';

import { useEffect, useRef } from 'react';
import FloatingDock from './FloatingDock';
import AuthGuard from './AuthGuard';
import { registerServiceWorker } from '@/lib/notifications';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    registerServiceWorker();
    const handler = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>('.border-glow-card').forEach((card) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
          if (angle < 0) angle += 360;
          const distanceX = Math.max(0, Math.abs(e.clientX - rect.left - rect.width / 2) - rect.width / 2);
          const distanceY = Math.max(0, Math.abs(e.clientY - rect.top - rect.height / 2) - rect.height / 2);
          const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
          const proximity = Math.max(0, 100 - (distance / 200) * 100);
          card.style.setProperty('--cursor-angle', `${angle}deg`);
          card.style.setProperty('--edge-proximity', String(proximity));
        });
      });
    };
    document.addEventListener('mousemove', handler);
    return () => {
      document.removeEventListener('mousemove', handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen pb-32">
        <main className="flex-1 w-full max-w-[1440px] mx-auto p-layout_margin min-h-screen">
          {children}
        </main>
        <FloatingDock />
      </div>
    </AuthGuard>
  );
}