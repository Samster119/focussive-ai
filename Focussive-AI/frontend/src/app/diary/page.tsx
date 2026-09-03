'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useApi } from '@/lib/query';
import { apiFetch } from '@/lib/api';
import '../zen-pages.css';

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
  const [toast, setToast] = useState<string | null>(null);

  /* ── Immersive background ── */
  useEffect(() => {
    document.body.classList.add('zen-bg-override');
    return () => { document.body.classList.remove('zen-bg-override'); };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      await apiFetch('/diary/generate', {
        method: 'POST',
        body: JSON.stringify({ date: new Date().toISOString() }),
      });
      refetch();
      showToast('✨ Diary entry generated!');
    } catch {
      showToast('Failed to generate diary entry');
    } finally {
      setIsGenerating(false);
    }
  }

  const diaryEntries = entries ?? [];

  return (
    <AppLayout>
      <div className="zen-page zen-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Toast */}
        {toast && <div className="zen-toast">{toast}</div>}

        {/* ═══════ HEADER ═══════ */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="zen-header-icon" style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined">menu_book</span>
            </div>
            <div>
              <h1 className="zen-text-primary" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Daily Diary</h1>
              <p className="zen-text-muted" style={{ fontSize: 14, margin: 0 }}>Reflect and reset</p>
            </div>
          </div>
          <button
            id="diary-ai-summary"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="zen-btn-primary"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
            {isGenerating ? 'Generating…' : 'AI Summary'}
          </button>
        </header>

        {/* ═══════ INFO CARD ═══════ */}
        <div className="zen-glass zen-fade-in zd-2" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--sage)', fontSize: 20, marginTop: 2, flexShrink: 0 }}>info</span>
            <p className="zen-text-secondary" style={{ fontSize: 14, fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
              Your diary is generated automatically based on your daily activity, focus sessions, and tasks.
              Click &quot;AI Summary&quot; to generate an entry for today.
            </p>
          </div>
        </div>

        {/* ═══════ ENTRIES ═══════ */}
        {diaryEntries.length === 0 ? (
          <div className="zen-glass zen-fade-in zd-3" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-2)', opacity: 0.4, display: 'block', marginBottom: 12 }}>edit_note</span>
            <p className="zen-text-secondary" style={{ fontWeight: 600, marginBottom: 8 }}>No diary entries yet</p>
            <p className="zen-text-muted" style={{ fontSize: 13 }}>Click &quot;AI Summary&quot; to generate your first daily reflection 🌿</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {diaryEntries.map((entry, i) => {
              const text = entry.summary ?? entry.generatedSummary ?? entry.userEditedSummary ?? '';
              const dateStr = new Date(entry.date).toLocaleDateString('en-US', {
                weekday: 'long', month: 'short', day: 'numeric',
              });
              return (
                <div
                  key={entry.id}
                  className={`zen-glass zen-fade-in zd-${Math.min(i + 3, 5)}`}
                  style={{ padding: 20 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--sage)', fontSize: 16 }}>calendar_today</span>
                      <span className="zen-text-secondary" style={{ fontSize: 13, fontWeight: 600 }}>{dateStr}</span>
                    </div>
                    <span className="zen-pill">📓 Daily Summary</span>
                  </div>
                  <p className="zen-text-primary" style={{ fontSize: 14, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>{text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
