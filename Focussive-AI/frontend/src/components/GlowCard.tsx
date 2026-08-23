import React from 'react';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function GlowCard({ children, className = '' }: GlowCardProps) {
  return (
    <div
      className={`border-glow-card card-shadow ${className}`}
      style={{ '--border-radius': '12px', '--card-bg': '#ffffff' } as React.CSSProperties}
    >
      <div className="edge-light" />
      <div className="border-glow-inner">{children}</div>
    </div>
  );
}
