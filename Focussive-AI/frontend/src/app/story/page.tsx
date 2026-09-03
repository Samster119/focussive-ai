'use client';

import { useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useApi } from '@/lib/query';
import { useAuthStore } from '@/lib/auth.store';
import '../zen-pages.css';

const milestones = [
  { level: 1, xp: 0, name: 'Explorer', icon: 'hiking' },
  { level: 2, xp: 500, name: 'Achiever', icon: 'emoji_events' },
  { level: 3, xp: 1200, name: 'Expert', icon: 'psychology' },
  { level: 4, xp: 2500, name: 'Master', icon: 'auto_awesome' },
];

export default function StoryPage() {
  const user = useAuthStore((s) => s.user);
  const { data } = useApi<any>('/auth/gamification', { refetchIntervalMs: 5000 });

  const currentXp = data?.stats?.currentXP ?? user?.gamification?.currentXP ?? 0;
  const currentLevel = data?.stats?.currentLevel ?? user?.gamification?.currentLevel ?? 1;
  const badges = data?.badges ?? [];

  const nextMilestone = milestones.find((m) => currentXp < m.xp) ?? milestones[milestones.length - 1];
  const currentMilestone = milestones.find((m) => m.level === currentLevel) ?? milestones[0];
  const progress = Math.min((currentXp / (nextMilestone.xp || 1)) * 100, 100);

  const earnedBadges = badges.filter((b: any) => b.done).length;

  /* ── Immersive background ── */
  useEffect(() => {
    document.body.classList.add('zen-bg-override');
    return () => { document.body.classList.remove('zen-bg-override'); };
  }, []);

  return (
    <AppLayout>
      <div className="zen-page zen-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ═══════ HEADER ═══════ */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="zen-header-icon" style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined">auto_stories</span>
          </div>
          <div>
            <h1 className="zen-text-primary" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Your Story</h1>
            <p className="zen-text-muted" style={{ fontSize: 14, margin: 0 }}>Badges, XP and level progression</p>
          </div>
        </header>

        {/* ═══════ LEVEL PROGRESS CARD ═══════ */}
        <div className="zen-glass zen-fade-in zd-2" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {/* Level avatar */}
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'linear-gradient(135deg, var(--sage), var(--sage-deep))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px -6px rgba(50, 82, 64, 0.4)',
              flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 30, color: '#fff' }}>rocket_launch</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <span className="zen-text-primary" style={{ fontSize: 18, fontWeight: 700 }}>Level {currentLevel}</span>
                  <span className="zen-text-muted" style={{ fontSize: 14, marginLeft: 10 }}>{currentMilestone.name}</span>
                </div>
                <span className="zen-pill" style={{ fontSize: 12 }}>
                  {currentXp} / {nextMilestone.xp} XP
                </span>
              </div>
              {/* Progress bar */}
              <div style={{
                height: 8, borderRadius: 999, overflow: 'hidden',
                background: 'var(--track)',
              }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  background: 'linear-gradient(90deg, var(--sage), var(--gold))',
                  width: `${progress}%`,
                  transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ BADGES ═══════ */}
        <div className="zen-glass zen-fade-in zd-3" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--sage)' }}>military_tech</span>
              <span className="zen-text-primary" style={{ fontSize: 16, fontWeight: 700 }}>Badges</span>
            </div>
            <span className="zen-pill">{earnedBadges} / {badges.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {badges.map((badge: any) => (
              <div
                key={badge.name}
                className="zen-chip"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textAlign: 'center', gap: 8, padding: 18, borderRadius: 16,
                  opacity: badge.done ? 1 : 0.45,
                  filter: badge.done ? 'none' : 'grayscale(1)',
                  background: badge.done ? 'rgba(79, 127, 102, 0.14)' : undefined,
                  borderColor: badge.done ? 'var(--sage)' : undefined,
                  transition: 'all 0.3s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: 28,
                  color: badge.done ? 'var(--sage)' : 'var(--text-2)',
                }}>
                  {badge.icon}
                </span>
                <span className="zen-text-primary" style={{ fontSize: 13, fontWeight: 600 }}>{badge.name}</span>
                <span className="zen-text-muted" style={{ fontSize: 11 }}>{badge.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════ LEVEL MILESTONES ═══════ */}
        <div className="zen-glass zen-fade-in zd-4" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--sage)' }}>emoji_events</span>
            <span className="zen-text-primary" style={{ fontSize: 16, fontWeight: 700 }}>Level Milestones</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute', top: 14, left: '12.5%', right: '12.5%', height: 3, borderRadius: 999,
              background: 'var(--track)',
            }}>
              <div style={{
                height: '100%', borderRadius: 999,
                background: 'linear-gradient(90deg, var(--sage), var(--gold))',
                width: `${Math.min(100, ((currentLevel - 1) / (milestones.length - 1)) * 100)}%`,
                transition: 'width 1s ease',
              }} />
            </div>
            {milestones.map((m) => {
              const reached = currentXp >= m.xp;
              return (
                <div key={m.level} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: reached ? 'linear-gradient(135deg, var(--sage), var(--sage-deep))' : 'var(--chip)',
                    border: reached ? 'none' : '2px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: reached ? '0 4px 12px rgba(50, 82, 64, 0.3)' : 'none',
                    transition: 'all 0.3s ease',
                  }}>
                    {reached && (
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>check</span>
                    )}
                  </div>
                  <span className="zen-text-primary" style={{ fontSize: 13, fontWeight: 600 }}>Level {m.level}</span>
                  <span className="zen-text-muted" style={{ fontSize: 11 }}>{m.name}</span>
                  <span className="zen-text-muted" style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{m.xp} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
