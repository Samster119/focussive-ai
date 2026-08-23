'use client';

import React from 'react';

/**
 * ZenBackground — Full SVG nature scene from the reference design.
 * Mountains, sun, birds, water, pine trees, and drifting mist.
 */
export default function ZenBackground() {
  return (
    <>
      {/* SVG Nature Scene */}
      <div className="scene" aria-hidden="true">
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="zenSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dcefe6" />
              <stop offset="45%" stopColor="#f3e3c8" />
              <stop offset="100%" stopColor="#f3cdc2" />
            </linearGradient>
            <radialGradient id="zenSun" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff3d6" stopOpacity={1} />
              <stop offset="60%" stopColor="#ffd98a" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#ffd98a" stopOpacity={0} />
            </radialGradient>
            <linearGradient id="zenMFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b7cdbf" />
              <stop offset="100%" stopColor="#a3c0b3" />
            </linearGradient>
            <linearGradient id="zenMMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#87a695" />
              <stop offset="100%" stopColor="#729080" />
            </linearGradient>
            <linearGradient id="zenMNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4c6656" />
              <stop offset="100%" stopColor="#374d40" />
            </linearGradient>
            <linearGradient id="zenWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dfe9df" />
              <stop offset="100%" stopColor="#c9d9cd" />
            </linearGradient>
          </defs>

          {/* Sky */}
          <rect width="1600" height="900" fill="url(#zenSky)" />

          {/* Sun */}
          <circle cx="1180" cy="240" r="200" fill="url(#zenSun)" />
          <circle cx="1180" cy="240" r="70" fill="#fff6e2" opacity={0.9} />

          {/* Far birds */}
          <g stroke="#4c6656" strokeWidth="3" fill="none" opacity={0.5} strokeLinecap="round">
            <path d="M300 160 q14 -14 28 0 q14 -14 28 0" />
            <path d="M380 190 q10 -10 20 0 q10 -10 20 0" />
          </g>

          {/* Far mountains */}
          <path
            d="M0,560 L120,470 260,540 420,440 600,530 800,430 1000,520 1200,450 1400,540 1600,470 1600,900 0,900 Z"
            fill="url(#zenMFar)"
            opacity={0.85}
          />
          {/* Mid mountains */}
          <path
            d="M0,640 L180,540 380,620 560,510 760,610 980,520 1180,600 1400,530 1600,610 1600,900 0,900 Z"
            fill="url(#zenMMid)"
            opacity={0.9}
          />
          {/* Near mountains */}
          <path
            d="M0,740 L220,630 460,720 700,610 940,710 1180,630 1400,715 1600,660 1600,900 0,900 Z"
            fill="url(#zenMNear)"
          />

          {/* Still water */}
          <rect x="0" y="820" width="1600" height="80" fill="url(#zenWater)" />
          <g stroke="#ffffff" strokeOpacity={0.35} strokeWidth="2">
            <line x1="80" y1="840" x2="220" y2="840" />
            <line x1="500" y1="860" x2="640" y2="860" />
            <line x1="900" y1="845" x2="1060" y2="845" />
            <line x1="1250" y1="865" x2="1400" y2="865" />
          </g>

          {/* Pine tree silhouettes */}
          <g fill="#2c3f34" opacity={0.9}>
            <path d="M90 900 L110 830 L130 900 Z" />
            <path d="M60 900 L90 800 L120 900 Z" />
            <path d="M1480 900 L1500 840 L1520 900 Z" />
            <path d="M1520 900 L1550 810 L1580 900 Z" />
          </g>
        </svg>
      </div>

      {/* Drifting mist */}
      <div className="mist" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </>
  );
}
