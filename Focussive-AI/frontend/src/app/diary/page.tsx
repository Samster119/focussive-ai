'use client';

import { useState } from 'react';
import AppLayout from "@/components/AppLayout";
import { useApi } from '@/lib/query';
import { apiFetch } from '@/lib/api';

interface DiaryEntry {
  id: string;
  date: string;
  summary?: string | null;
  generatedSummary?: string | null;
  userEditedSummary?: string | null;
}

export default function DiaryPage() {
  const { data: entries, refetch } = useApi<DiaryEntry[]>('/diary');
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      await apiFetch('/diary/generate', {
        method: 'POST',
        body: JSON.stringify({ date: new Date().toISOString() })
      });
      refetch();
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
              Daily Diary
            </h1>
            <p className="font-body-sm text-on-surface-variant">
              Reflect and reset
            </p>
          </div>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-primary hover:bg-primary-container disabled:opacity-50 text-white px-lg py-sm rounded-xl font-title-sm transition-all active:scale-95 flex items-center gap-sm"
          >
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
            {isGenerating ? 'Generating...' : 'AI Summary'}
          </button>
        </div>

        <div className="bg-surface-container-lowest p-lg rounded-xl card-shadow">
          <p className="font-body-md text-on-surface-variant italic">
            Your diary is generated automatically based on your daily activity, focus sessions, and tasks. Click &quot;AI Summary&quot; to generate an entry for today.
          </p>
        </div>

        <div className="space-y-sm">
          {(entries ?? []).length === 0 ? (
            <p className="font-body-md text-on-surface-variant">No diary entries yet. Generate one!</p>
          ) : (
            (entries ?? []).map((entry, i) => (
              <div
                key={entry.id}
                className="bg-surface-container-lowest p-md rounded-xl card-shadow"
              >
                <div className="flex items-center justify-between mb-sm">
                  <span className="font-body-sm text-on-surface-variant">
                    {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-sm">
                    <span className="bg-surface-container-high text-on-surface-variant px-md py-base rounded-full font-label-caps">
                      📓 Daily Summary
                    </span>
                  </div>
                </div>
                <p className="font-body-md text-on-surface whitespace-pre-line">{entry.summary ?? entry.generatedSummary ?? entry.userEditedSummary ?? ''}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
