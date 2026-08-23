'use client';

import AppLayout from "@/components/AppLayout";
import { useApi } from '@/lib/query';
import { useAuthStore } from '@/lib/auth.store';

const milestones = [
  { level: 1, xp: 0, name: "Explorer" },
  { level: 2, xp: 500, name: "Achiever" },
  { level: 3, xp: 1200, name: "Expert" },
  { level: 4, xp: 2500, name: "Master" },
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

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-lg">
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
            Your Story
          </h1>
          <p className="font-body-sm text-on-surface-variant">
            Badges, XP and level
          </p>
        </div>

        <div className="bg-surface-container-lowest p-lg rounded-xl card-shadow">
          <div className="flex items-center gap-md">
            <div className="w-16 h-16 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">rocket_launch</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-title-sm text-on-surface">Level {currentLevel}</span>
                  <span className="font-body-sm text-on-surface-variant ml-sm">{currentMilestone.name}</span>
                </div>
                <span className="font-body-sm text-on-surface-variant">
                  {currentXp} / {nextMilestone.xp} XP
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-container overflow-hidden mt-md">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-lg rounded-xl card-shadow">
          <div className="flex items-center justify-between mb-md">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">military_tech</span>
              <span className="font-title-sm text-on-surface">Badges</span>
            </div>
            <span className="font-body-sm text-on-surface-variant">
              {badges.filter((b: any) => b.done).length} / {badges.length}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {badges.map((badge: any) => (
              <div
                key={badge.name}
                className={`p-md rounded-xl flex flex-col items-center text-center gap-sm ${
                  badge.done
                    ? "bg-primary-fixed text-primary"
                    : "bg-surface-container-low text-outline grayscale opacity-60"
                }`}
              >
                <span className="material-symbols-outlined text-2xl">
                  {badge.icon}
                </span>
                <span className="font-title-sm">{badge.name}</span>
                <span className="font-label-caps opacity-80">{badge.description}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest p-lg rounded-xl card-shadow">
          <div className="flex items-center gap-sm mb-md">
            <span className="material-symbols-outlined text-primary">emoji_events</span>
            <span className="font-title-sm text-on-surface">Level Milestones</span>
          </div>
          <div className="flex items-start justify-between">
            {milestones.map((m, i) => (
              <div key={m.level} className="flex flex-col items-center gap-sm flex-1">
                <span
                  className={`w-4 h-4 rounded-full ${
                    currentXp >= m.xp
                      ? "bg-primary"
                      : "bg-surface-container-high border border-outline"
                  }`}
                />
                <span className="font-title-sm text-on-surface">Level {m.level}</span>
                <span className="font-label-caps text-on-surface-variant">{m.name}</span>
                {i < milestones.length - 1 && (
                  <span className="h-px w-full bg-surface-container-high absolute translate-y-[-1.5rem] ml-8 hidden" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
