'use client';

import { useEffect, useState } from 'react';
import './time-background.css';

/* ============================================================
   TimeBackground — global time-of-day background system.
   Renders 4 zen nature scenes (morning / afternoon / evening /
   night) and cross-fades between them based on the user's local
   time. Sets `data-time-theme` on <html> so page-level CSS can
   adapt (e.g. the dashboard flips to dark glass at night).
   ============================================================ */

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export function getTimePeriod(date: Date = new Date()): TimePeriod {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

interface ScenePalette {
  sky: [string, string, string];
  glowCore: string;
  glow: string;
  orb: { cx: number; cy: number; r: number; glowR: number; color: string; opacity: number };
  far: [string, string];
  mid: [string, string];
  near: [string, string];
  water: [string, string];
  ripple: string;
  rippleOpacity: number;
  trees: string;
  birds?: string;
  stars?: boolean;
}

const PALETTES: Record<TimePeriod, ScenePalette> = {
  morning: {
    sky: ['#d9eee6', '#f6ead0', '#f7d8c3'],
    glowCore: '#fff6e0',
    glow: '#ffdf9e',
    orb: { cx: 420, cy: 320, r: 64, glowR: 190, color: '#fff8e6', opacity: 0.95 },
    far: ['#b9d0c4', '#a5c2b4'],
    mid: ['#8aa997', '#75937f'],
    near: ['#4d6a58', '#38503f'],
    water: ['#e0eae0', '#cbdccf'],
    ripple: '#ffffff',
    rippleOpacity: 0.35,
    trees: '#2d4135',
    birds: '#4c6656',
  },
  afternoon: {
    sky: ['#cfe7f2', '#e6f1e2', '#f5eecf'],
    glowCore: '#fffdf2',
    glow: '#ffefae',
    orb: { cx: 800, cy: 160, r: 70, glowR: 210, color: '#fffdf4', opacity: 0.95 },
    far: ['#a7c8c0', '#93b8ac'],
    mid: ['#6f9b85', '#5d8871'],
    near: ['#3f6350', '#2d4a3a'],
    water: ['#d5e7e6', '#bdd7d2'],
    ripple: '#ffffff',
    rippleOpacity: 0.4,
    trees: '#24382c',
    birds: '#3c5a4a',
  },
  evening: {
    sky: ['#f6dfc0', '#f2b790', '#d98d95'],
    glowCore: '#fff1d6',
    glow: '#ffb877',
    orb: { cx: 1180, cy: 340, r: 66, glowR: 230, color: '#fff3da', opacity: 0.95 },
    far: ['#a08a92', '#8d7684'],
    mid: ['#6f5d72', '#5c4c62'],
    near: ['#3e3448', '#2c2436'],
    water: ['#e9c5ae', '#c99b9b'],
    ripple: '#fff1dd',
    rippleOpacity: 0.4,
    trees: '#241d2e',
    birds: '#4a3a50',
  },
  night: {
    sky: ['#0d1420', '#16233a', '#22334e'],
    glowCore: '#eef3ff',
    glow: '#93aede',
    orb: { cx: 1220, cy: 190, r: 46, glowR: 170, color: '#f4f6ef', opacity: 1 },
    far: ['#2a3a4a', '#243342'],
    mid: ['#1c2b38', '#16232e'],
    near: ['#101b24', '#0a121a'],
    water: ['#16222f', '#0d1722'],
    ripple: '#cfdcf2',
    rippleOpacity: 0.18,
    trees: '#060b10',
    stars: true,
  },
};

const PERIODS: TimePeriod[] = ['morning', 'afternoon', 'evening', 'night'];

const STARS: Array<[number, number, number]> = [
  [120, 90, 2], [260, 160, 1.5], [420, 70, 2], [560, 180, 1.4], [700, 90, 1.8],
  [880, 150, 1.4], [1010, 60, 2], [1140, 120, 1.5], [1330, 80, 1.8], [1480, 150, 1.4],
  [200, 260, 1.3], [520, 300, 1.6], [840, 260, 1.3], [1060, 300, 1.6], [1420, 260, 1.3],
  [90, 380, 1.4], [680, 380, 1.2], [1240, 400, 1.4],
];

function Scene({ id, p }: { id: TimePeriod; p: ScenePalette }) {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`tbSky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.sky[0]} />
          <stop offset="45%" stopColor={p.sky[1]} />
          <stop offset="100%" stopColor={p.sky[2]} />
        </linearGradient>
        <radialGradient id={`tbGlow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.glowCore} stopOpacity={1} />
          <stop offset="60%" stopColor={p.glow} stopOpacity={0.5} />
          <stop offset="100%" stopColor={p.glow} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`tbFar-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.far[0]} />
          <stop offset="100%" stopColor={p.far[1]} />
        </linearGradient>
        <linearGradient id={`tbMid-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.mid[0]} />
          <stop offset="100%" stopColor={p.mid[1]} />
        </linearGradient>
        <linearGradient id={`tbNear-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.near[0]} />
          <stop offset="100%" stopColor={p.near[1]} />
        </linearGradient>
        <linearGradient id={`tbWater-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.water[0]} />
          <stop offset="100%" stopColor={p.water[1]} />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="1600" height="900" fill={`url(#tbSky-${id})`} />

      {/* Stars (night only) */}
      {p.stars && (
        <g className="tb-stars" fill="#dfe8f6">
          {STARS.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} style={{ animationDelay: `${(i % 6) * 0.7}s` }} />
          ))}
        </g>
      )}

      {/* Sun / Moon */}
      <circle cx={p.orb.cx} cy={p.orb.cy} r={p.orb.glowR} fill={`url(#tbGlow-${id})`} />
      <circle cx={p.orb.cx} cy={p.orb.cy} r={p.orb.r} fill={p.orb.color} opacity={p.orb.opacity} />
      {p.stars && (
        <g fill="#d9ddd2" opacity={0.5}>
          <circle cx={p.orb.cx - 14} cy={p.orb.cy - 8} r={7} />
          <circle cx={p.orb.cx + 10} cy={p.orb.cy + 12} r={5} />
          <circle cx={p.orb.cx + 16} cy={p.orb.cy - 14} r={4} />
        </g>
      )}

      {/* Birds (day scenes) */}
      {p.birds && (
        <g stroke={p.birds} strokeWidth="3" fill="none" opacity={0.5} strokeLinecap="round">
          <path d="M300 160 q14 -14 28 0 q14 -14 28 0" />
          <path d="M380 190 q10 -10 20 0 q10 -10 20 0" />
        </g>
      )}

      {/* Mountains */}
      <path
        d="M0,560 L120,470 260,540 420,440 600,530 800,430 1000,520 1200,450 1400,540 1600,470 1600,900 0,900 Z"
        fill={`url(#tbFar-${id})`}
        opacity={0.85}
      />
      <path
        d="M0,640 L180,540 380,620 560,510 760,610 980,520 1180,600 1400,530 1600,610 1600,900 0,900 Z"
        fill={`url(#tbMid-${id})`}
        opacity={0.9}
      />
      <path
        d="M0,740 L220,630 460,720 700,610 940,710 1180,630 1400,715 1600,660 1600,900 0,900 Z"
        fill={`url(#tbNear-${id})`}
      />

      {/* Water */}
      <rect x="0" y="820" width="1600" height="80" fill={`url(#tbWater-${id})`} />
      <g stroke={p.ripple} strokeOpacity={p.rippleOpacity} strokeWidth="2">
        <line x1="80" y1="840" x2="220" y2="840" />
        <line x1="500" y1="860" x2="640" y2="860" />
        <line x1="900" y1="845" x2="1060" y2="845" />
        <line x1="1250" y1="865" x2="1400" y2="865" />
      </g>
      {p.stars && <ellipse cx="1220" cy="850" rx="90" ry="6" fill="#cfdcf2" opacity={0.16} />}

      {/* Pine silhouettes */}
      <g fill={p.trees} opacity={0.9}>
        <path d="M90 900 L110 830 L130 900 Z" />
        <path d="M60 900 L90 800 L120 900 Z" />
        <path d="M1480 900 L1500 840 L1520 900 Z" />
        <path d="M1520 900 L1550 810 L1580 900 Z" />
      </g>
    </svg>
  );
}

export default function TimeBackground() {
  const [period, setPeriod] = useState<TimePeriod | null>(null);

  /* Determine period on mount + re-check every minute so the scene
     transitions naturally when the time period changes. */
  useEffect(() => {
    const update = () => setPeriod(getTimePeriod());
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  /* Expose the theme to CSS (dashboard night mode, veil tints, etc.) */
  useEffect(() => {
    if (period) document.documentElement.setAttribute('data-time-theme', period);
  }, [period]);

  return (
    <div className="tb-root" aria-hidden="true">
      {PERIODS.map((key) => (
        <div key={key} className={`tb-scene${period === key ? ' active' : ''}`}>
          <Scene id={key} p={PALETTES[key]} />
        </div>
      ))}
      <div className="tb-mist">
        <span />
        <span />
        <span />
      </div>
      <div className="tb-veil" />
    </div>
  );
}
