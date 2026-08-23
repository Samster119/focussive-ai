'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  target: number;
  duration?: number; // ms
  suffix?: string;
  decimals?: number;
  className?: string;
}

/**
 * AnimatedCounter — smoothly counts from 0 to `target` using requestAnimationFrame.
 * Dashboard-local component for zen stat stones.
 */
export default function AnimatedCounter({
  target,
  duration = 1200,
  suffix = '',
  decimals = 0,
  className = '',
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState('0');
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const prevTargetRef = useRef<number>(0);

  useEffect(() => {
    const startVal = prevTargetRef.current;
    prevTargetRef.current = target;

    if (target === 0) {
      setDisplay(`0${suffix}`);
      return;
    }

    const start = performance.now();
    startTimeRef.current = start;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * eased;

      setDisplay(`${current.toFixed(decimals)}${suffix}`);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, suffix, decimals]);

  return <span className={className}>{display}</span>;
}
