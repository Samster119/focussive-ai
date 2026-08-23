# Progress

**Last updated:** 2026-08-07

## Status: Phase 3 (Engagement) Complete. MVP is fully functional! All tests passing.

## Completed
- **Frontend** (`frontend/`) — Next.js 15, 13 routes, build passes
- Full Material Design 3 light theme (user-provided template): color tokens, typography (Manrope, JetBrains Mono, Material Symbols), border-glow-card cursor-tracking, timeline, card-shadow in `tailwind.config.ts` + `globals.css`
- FloatingDock bottom navigation (10 items) replaces old Sidebar; AppLayout with mousemove glow tracking + `pb-32`
- All 13 pages converted to M3: Dashboard (GlowCard, KPIs, timeline), `/` AI Assistant (chat + suggested actions + burnout strip), Login, Register, Tasks (priority badges, tabs), Calendar (week grid), Timetable (energy profile), Focus (timer ring + session stats), Story (XP/badges/milestones), Diary (mood picker + entries), Reports (KPI cards + bar chart + AI insight), Settings (sections + toggles)
- **Backend** (`backend/`) — NestJS 11, app boots on `api/v1`, CORS, PORT 3001
- Prisma schema validated (`backend/prisma/schema.prisma`, 15 models), Prisma service + database connection configured
- Auth module (register/login/JWT) implemented on backend + frontend
- Algorithm modules: burnout score + micro-stepping (jest specs, 10 tests pass)
- **All test harnesses fixed** — 19/19 tests pass (service + controller tests for gamification, reports, diary, recommendations, behavioral)
- `.env.example` with all backend env vars
- Full PRD drafted (`PRD.md`, 803 lines, 17 sections)
- Tech stack finalized and documented
- **Phase 1 Foundation** — Auth, Prisma, Layout, Core API scaffold
- **Phase 2 Intelligence** — Adaptive Timetable module (backend + frontend), XAI tooltips on calendar events, and GroqCloud Tool Calling
  - `GET /api/v1/timetable`, `POST /api/v1/timetable/regenerate`, `PATCH /api/v1/timetable/block/:id`
  - Energy-based scheduling: Low (25/5m), Med (60/10m), High (90/15m)
  - Tool calling allows the AI to actually create tasks and events!
- **Phase 3 Engagement** — Behavioral Engine, Gamification, Reports, Diary, and Smart Recommendations
  - `GET /api/v1/gamification` & Story Mode UI
  - `GET /api/v1/recommendations` & Dashboard AI Insights
  - `GET /api/v1/diary`, `POST /api/v1/diary/generate` with GroqCloud
  - HTML5 Audio Focus Music Player
  - `GET /api/v1/reports/weekly` & Weekly Reports UI
- **Phase 4 Enhancements** — Web Push & Browser Desktop Notifications
  - Service Worker (`sw.js`) for background push events and custom notification routing
  - Centralized notification service (`frontend/src/lib/notifications.ts`) with permission request flow, test triggers, focus break notifications, burnout alerts, and event pre-reminders
  - Updated Prisma `UserSettings` with `enablePushNotifications`, `breakReminders`, `burnoutAlerts`, `eventReminders`, `pushSubscription`
  - `/settings` page controls: Permission status badge, Grant Permission action, toggle switches, and Send Test Notification
  - `/focus` integration: Pomodoro completion desktop notification trigger

## Next Steps (Future Enhancements)
- Custom Pomodoro durations per task category
- Collaborative focus sessions
- Sync with Google Calendar API

## Key Context
- 12 pages: `/login`, `/register`, `/dashboard`, `/` (AI Assistant), `/tasks`, `/calendar`, `/timetable`, `/focus`, `/story`, `/diary`, `/reports`, `/settings`
- 15 DB models: User, UserSettings, BehavioralProfile, GamificationStats, Task, CalendarEvent, TimetableBlock, DailyDiary, WeeklyReport, BurnoutLog, Conversation, Message, FocusSession, Badge, UserBadge
- Burnout Score = sum(duration × priority_weight) × consecutive_focus_factor (alert > 75.0)
- Micro-Stepping Friction = (est_minutes/15) × (1 + postponement × 0.2) (trigger > 120min or postponement ≥ 2)
- GroqCloud free tier: 30 req/min (Llama 3.3 70B)

## Decisions Made
- Use Ponytail skill to avoid over-engineering
- Gamification as layered features, not core architecture
- Backend handles GroqCloud API calls (API keys stay server-side)
- Frontend holds auth state (access_token only), backend stores refresh_token in httpOnly cookie
- AI assistant responses via server-sent events (SSE) for streaming
- Adaptive Timetable requires opt-in for scheduling access
