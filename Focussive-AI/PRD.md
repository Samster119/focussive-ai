# PRODUCT REQUIREMENTS DOCUMENT

**Project:** Focussive AI
**Version:** 1.0
**Date:** July 25, 2026
**Status:** Final Draft

---

## 1. Overview

Focussive AI is an AI-first personal productivity platform that replaces manual task management with a conversational assistant. Users speak or type naturally; the system extracts tasks, schedules calendars, detects burnout risk, and adapts to behavior over time — all under user control.

**Core Philosophy:** Shame-free productivity. No aggressive overdue warnings. AI automates, user decides.

**Target Users:**

- Students managing coursework and study schedules
- Knowledge workers juggling meetings and deliverables
- People prone to procrastination or task paralysis

**Operating Environment:**

- Frontend: Chrome, Safari, Edge, Firefox (desktop + mobile)
- Backend: Node.js / NestJS container
- Database: PostgreSQL (Supabase) + Prisma ORM
- AI: GroqCloud API (Llama 3.3 70B)

---

## 2. Pages

| # | Page | Route | Phase |
|---|------|-------|-------|
| 1 | Login | `/login` | 1 |
| 2 | Register | `/register` | 1 |
| 3 | Dashboard | `/dashboard` | 1 |
| 4 | AI Assistant | `/` | 1 |
| 5 | Tasks | `/tasks` | 1 |
| 6 | Calendar | `/calendar` | 1 |
| 7 | Timetable | `/timetable` | 2 |
| 8 | Focus Mode | `/focus` | 1 |
| 9 | Story Mode | `/story` | 3 |
| 10 | Diary | `/diary` | 3 |
| 11 | Reports | `/reports` | 3 |
| 12 | Settings | `/settings` | 1 |

---

## 3. Phase 1 — MVP (Core Loop)

---

### 3.1 Auth — Login & Register

**Description:** Email/password authentication with optional OAuth.

**Features:**

- Email + password registration (min 8 chars)
- Login with JWT (HTTP-only cookies, 7-day expiry)
- OAuth: Google, GitHub
- Password reset flow
- Session persistence across refreshes
- Protected routes redirect to `/login`

**Acceptance Criteria:**

- Duplicate email returns clear error
- JWT stored in HTTP-only cookie
- OAuth callback creates user if not exists, links if exists
- Password reset sends email with time-limited token

---

### 3.2 Dashboard

**Description:** Landing page after login. Today's summary at a glance.

**Features:**

- Greeting with first name + current date
- 4 KPI stat cards: tasks done, burnout score, focus hours, mood
- Today's schedule timeline (mini calendar, color-coded)
- Upcoming tasks list with priority badges + due dates
- Quick action buttons: AI Assistant, Focus Mode, Tasks
- Streak counter + XP progress bar
- Recent diary snippet with link

**Acceptance Criteria:**

- Loads within 1 second
- KPI cards update in real-time as tasks complete
- Schedule shows all calendar blocks for today
- Empty state shown if no data for the day

---

### 3.3 AI Assistant

**Description:** Conversational chat interface. Primary entry point for everything.

**Features:**

- Chat message list (AI left, user right)
- Text input with send button
- Voice input via Web Speech API (tap-to-record)
- Quick-action response cards (contextual buttons below AI replies)
- Typing indicator when AI is processing
- Bottom status bar: burnout score + next scheduled item
- Conversation history persisted per session
- AI parses mood, tasks, deadlines, preferences from natural language

**Acceptance Criteria:**

- AI responds within 2 seconds (streaming)
- Extracted tasks auto-created in DB
- Voice transcription accuracy >= 90% in quiet environment
- Quick-action cards appear contextually
- Burnout status bar updates real-time
- Graceful fallback if GroqCloud API is down

---

### 3.4 Tasks

**Description:** Full task management with inline editing, drag reorder, micro-step expansion.

**Features:**

- Priority badges (urgent/red, high/orange, medium/yellow, low/green)
- Inline editing (title, duration, due date, priority)
- Drag-and-drop reorder
- Checkbox to mark complete (strikethrough animation)
- Micro-step expand/collapse toggle
- Filter tabs: All, Pending, Done, Overdue
- "Add Task" button -> inline creation
- Summary bar: pending, done, overdue counts
- Empty state illustration

**Acceptance Criteria:**

- Loads within 500ms
- Optimistic UI updates (instant visual, async backend sync)
- Completing parent task completes all children
- Overdue = past due date AND status != done
- Deletion requires confirmation (soft delete with undo)

**API:**

```
GET    /api/v1/tasks?filter=pending|done|overdue
POST   /api/v1/tasks
PATCH  /api/v1/tasks/:id
DELETE /api/v1/tasks/:id
POST   /api/v1/tasks/:id/reorder
```

---

### 3.5 Micro-Stepping

**Description:** Auto-decomposes complex or postponed tasks into 15-minute sub-steps.

**Trigger:**

- Task duration > 120 min -> auto-decompose
- Postponement count >= 2 -> auto-decompose

**Algorithm:**

```
Friction Score = (estimated_minutes / 15) x (1 + postponement_count x 0.2)
If friction > threshold -> decompose
```

**Features:**

- LLM generates 3-5 micro-steps (each <= 15 min)
- Sub-tasks linked via parentTaskId
- Each micro-step gets a rationale string
- User can accept, edit, or reject generated steps
- Micro-steps appear in To-Do list as expandable children

**Acceptance Criteria:**

- Each micro-step <= 15 minutes
- Ordered logically (prerequisite-aware)
- Parent task auto-completes when all children done
- User can manually trigger on any task

**API:**

```
POST /api/v1/tasks/:taskId/micro-step
Response: {
  parentTaskId: string,
  subSteps: [{ title, estimatedMinutes, rationale }]
}
```

---

### 3.6 Calendar

**Description:** Automated focus block scheduling with drag-and-drop and XAI tooltips.

**Features:**

- View toggle: Week / Day / Month
- Navigation arrows
- Color-coded blocks: focus (blue), break (green), meeting (orange), exercise (teal)
- XAI tooltip on hover — explains why placed at that time
- Drag-and-drop to reschedule
- Resize handles to adjust duration
- "Auto-Schedule" button -> backend scheduler
- "Add Block" modal
- Conflict warnings (overlapping = red)
- Fixed commitments non-draggable

**Acceptance Criteria:**

- Loads within 1 second
- Auto-schedule respects work hours, fixed commitments, burnout limits
- XAI tooltip: task name, rationale, confidence
- Drag updates backend real-time
- Conflict detection prevents overlapping focus blocks

**API:**

```
GET    /api/v1/calendar?week=2026-W30
POST   /api/v1/calendar/auto-schedule
PATCH  /api/v1/calendar/:eventId
DELETE /api/v1/calendar/:eventId
POST   /api/v1/calendar/block
```

---

### 3.7 Focus Mode

**Description:** Full-screen distraction-free timer with ambient music and burnout-safe breaks.

**Features:**

- Big centered countdown timer
- Current task + micro-step progress
- Pause / Skip buttons
- Keyboard shortcuts: Space = pause, Esc = exit
- Burnout-safe break reminders (auto-triggered)
- Music selector: Deep Focus, Rain, Coffee Shop, Off
- Session counter (e.g., "Session 2/4")
- Next break countdown
- Break screen with rest timer
- Auto-fullscreen
- Exit returns to previous page
- XP awarded at completion

**Session Flow:**

1. User picks task (from dashboard or tasks)
2. System sets timer (25/45/90 min based on task size)
3. Timer counts down, music plays
4. Timer ends -> break prompt
5. After break -> next micro-step or session
6. Session end -> XP awarded -> redirect to dashboard

**Acceptance Criteria:**

- Timer accurate (+-1 second)
- Pause freezes timer
- Break trigger respects burnout settings
- Music plays/pauses with session
- Session completion awards XP
- Timer persists if user navigates away
- Sessions logged to DB

**API:**

```
POST /api/v1/focus/start     Body: { taskId, durationMinutes }
POST /api/v1/focus/pause     Body: { sessionId }
POST /api/v1/focus/resume    Body: { sessionId }
POST /api/v1/focus/complete  Body: { sessionId }
POST /api/v1/focus/break     Body: { sessionId }
```

---

### 3.8 Settings

**Description:** User configuration for personality, work hours, burnout thresholds, notifications.

**Features:**

- Profile: name, email, avatar, password change
- Assistant personality: tone (Friendly/Formal/Motivational), proactivity slider
- Work hours: start/end time, day-of-week checkboxes
- Burnout sensitivity: threshold (default 75.0), max consecutive focus, min break
- Notification toggles: burnout alerts, task reminders, weekly email, streak
- Save / Reset buttons
- Danger zone: delete account (requires confirmation)

**Acceptance Criteria:**

- Settings save immediately (no reload)
- Work hours injected into scheduling algorithm
- Personality injected into AI system prompt
- Delete account requires password + 7-day grace period

**API:**

```
GET    /api/v1/settings
PATCH  /api/v1/settings
DELETE /api/v1/settings/account  Body: { password }
```

---

## 4. Phase 2 — Intelligence

---

### 4.1 Adaptive Timetable

**Description:** Dynamic daily routine that adapts focus block lengths based on energy.

**Energy Scaling:**

- Low -> Pomodoro (25 min focus, 5 min break)
- Medium -> Standard (60 min focus, 10 min break)
- High -> Deep work (90 min focus, 15 min break)

**Features:**

- Date picker, energy level selector
- Timeline view with color-coded blocks
- Drag to resize block durations
- "Regenerate" -> re-runs algorithm
- "Save as Template" -> reusable routine
- Auto-adapts from conversation-reported energy

**Acceptance Criteria:**

- Regenerates within 2 seconds
- Energy level persists per day
- Block resizing updates backend
- Templates reusable across days

**API:**

```
GET    /api/v1/timetable?date=2026-07-23
POST   /api/v1/timetable/regenerate   Body: { date, energyLevel }
PATCH  /api/v1/timetable/block/:id
POST   /api/v1/timetable/template
```

---

### 4.2 Explainable AI (XAI) Tooltips

**Description:** Every automated placement includes a readable rationale.

**Features:**

- Rationale stored with each calendar event
- Expandable tooltip on blocks
- Example: "Placed at 9 AM because your peak focus is 9-11:30 AM"
- User-edited blocks show "Manually placed"

**Acceptance Criteria:**

- Every automated block has non-empty rationale
- Tooltip renders within 100ms on hover
- Rationale is human-readable (no jargon)

---

### 4.3 Behavioral Learning Engine

**Description:** Ingests user behavior to optimize scheduling over time.

**Features:**

- Logs schedule overrides (drag-drop, manual edits, diary corrections)
- Builds heuristics: peak focus window, preferred rest times, delay patterns
- Injects heuristics into AI prompt context
- Updates BehavioralProfile in DB after every 5th override

**Acceptance Criteria:**

- Peak focus accuracy improves >= 10% after 2 weeks
- No behavioral data leaves user's account
- Heuristics injected into GroqCloud prompts

**API:**

```
GET /api/v1/behavioral-profile
```

---

### 4.4 Smart Recommendation Engine

**Description:** Proactive productivity tips based on behavior.

**Features:**

- Periodic system state inspection
- Detects unassigned high-priority tasks near deadlines
- Non-intrusive inline suggestion cards
- Dismissable (respects notification settings)

**Acceptance Criteria:**

- Max 3 recommendations per day
- Clear action button on each suggestion
- Dismissal remembered for 24 hours per type

---

## 5. Phase 3 — Engagement & Analytics

---

### 5.1 Story Mode (Gamification)

**Description:** RPG-style gamification with XP, levels, streaks, achievements.

**XP Rules:**

| Action | XP |
|--------|-----|
| Complete task | 10-30 (by priority) |
| Complete micro-step | 5 |
| Focus session (25 min) | 15 |
| Focus session (45+ min) | 25 |
| Daily diary entry | 10 |
| 7-day streak bonus | 50 |

**Level Thresholds:**

Level 1: 0 | Level 2: 100 | Level 3: 250 | Level 4: 500 | Level 5: 800 | ...increasing

**Features:**

- Large level badge + XP progress bar
- Streak counter (consecutive days with >= 1 task)
- Current quest card with progress
- Achievement cards (unlocked/locked)
- Stats summary
- Badge collection grid
- Level-up confetti animation

**Acceptance Criteria:**

- XP updates real-time on task completion
- Streak resets if no tasks in a day
- Badges unlock automatically
- All data persisted in DB

---

### 5.2 Diary

**Description:** Auto-generated end-of-day reflection, user-editable.

**Features:**

- Date navigator (prev/next)
- AI-generated summary card
- "Edit" toggle -> editable text area
- Mood timeline (emoji horizontal bar)
- Tasks completed / missed list
- "Save to Memory" -> commits to BehavioralProfile
- Empty state for no-data days

**Acceptance Criteria:**

- Generated from chat logs, task completions, mood data
- Editable with save/cancel
- Generated within 5 seconds
- Empty state if no data for day

**API:**

```
GET    /api/v1/diary?date=2026-07-23
POST   /api/v1/diary/generate
PATCH  /api/v1/diary/:id
POST   /api/v1/diary/:id/save
```

---

### 5.3 Reports

**Description:** Auto-generated weekly analytics with charts.

**Features:**

- Week selector (prev/next)
- KPI cards: completion rate, focus hours, tasks done, burnout avg
- Line chart: daily completion over week
- Bar chart: burnout risk per day
- Dual-axis chart: energy vs productivity
- AI-generated insight card
- Export button (PDF/image)

**Acceptance Criteria:**

- Auto-generated Sunday midnight
- Charts render within 1 second
- Insight based on actual data
- Export produces clean PDF/PNG
- Historical weeks accessible

**API:**

```
GET /api/v1/reports/weekly?week=2026-W30
GET /api/v1/reports/weekly/:weekId/export?format=pdf|png
```

---

### 5.4 Focus Music

**Description:** Integrated ambient audio for focus sessions.

**Modes:** Deep Focus, Study Session (Rain), Coffee Shop, Low Stress

**Features:**

- Mini player in sidebar (play/pause, volume)
- Full controls in Focus Mode
- Auto-suggests on focus block start (opt-in)
- Respects browser autoplay policies

**Acceptance Criteria:**

- Streams via Web Audio API / HTML5 Audio
- Volume slider in sidebar
- Music persists across navigation
- Graceful error handling

---

## 6. Non-Functional Requirements

| ID | Requirement | Target |
|----|------------|--------|
| NFR-01 | AI response latency | <= 2 seconds (streaming) |
| NFR-02 | UI update latency | <= 100ms (optimistic) |
| NFR-03 | Encryption at rest | AES-256-GCM |
| NFR-04 | Encryption in transit | TLS 1.3 |
| NFR-05 | Authentication | JWT, HTTP-only cookies |
| NFR-06 | Uptime | 99.9% |
| NFR-07 | Accessibility | WCAG 2.1 Level AA |
| NFR-08 | Browser support | Chrome, Safari, Edge, Firefox (latest 2) |
| NFR-09 | Mobile responsive | 375px+ viewport |
| NFR-10 | Rate limiting | Token bucket via Redis (100 req/min/user) |

---

## 7. Backend Module Architecture

| Feature | NestJS Module | Service |
|---------|--------------|---------|
| AI Assistant | `AssistantOrchestratorModule` | GroqCloud Llama 3.3 70B |
| Voice Notes | — | `AudioTranscriptionService` |
| Task Extraction | `NLPTaskParserModule` | GroqCloud JSON Mode |
| Micro-Stepping | `TaskDeconstructionEngine` | Recursive Prompt Deconstructor |
| To-Do List | `TaskManagementCrudModule` | CRUD + event sync |
| XAI | `SchedulingRationaleService` | System prompt injection |
| Calendar | `AutomatedCalendarScheduler` | Constraint-satisfaction algorithm |
| Timetable | `EnergyAdaptiveRoutineModule` | Energy-based rescaling |
| Burnout | `BurnoutRiskMonitor` | Density calculation algorithm |
| Story Mode | `GamificationProgressModule` | XP/level stat engine |
| AI Diary | `DailyReflectionCompiler` | LLM summary builder |
| Behavioral Learning | `UserPatternLearningEngine` | Prisma event log analytics |
| Smart Recs | `ContextualRecommendationService` | Proactive rules engine |
| Weekly Reports | `WeeklyReportGenerator` | Aggregation pipeline |
| Focus Music | `FocusAudioStreamController` | Web Audio API |
| Settings | `UserSettingsManager` | NextAuth + Prisma config |

---

## 8. NLP Orchestration Pipeline

```
Step 1: User input (text or voice) -> Context Injection Module
Step 2: Attach user settings, tone constraints, behavioral profile,
        pending tasks, recent conversation logs
Step 3: GroqCloud system prompt execution (Llama 3.3 70B)
Step 4: JSON schema validation
        -> Valid: dispatch to scheduler + DB pipelines
        -> Invalid: auto-recovery re-prompt (max 2 retries)
```

**System Prompt Structure:**

```
SYSTEM PROMPT: FOCUSSIVE_AI_ORCHESTRATOR
- Role: Empathetic AI Productivity Manager
- Inputs: User Dialogue, Timestamp, Behavioral Heuristics, Active Tasks
- Output: Strict JSON matching extraction schema
- Rules:
  - Never show shame or aggressive warnings
  - Micro-step if duration > 120 min or delay >= 2
  - Include readable rationale for all calendar suggestions
```

---

## 9. Security Framework

| Layer | Implementation |
|-------|---------------|
| Data at rest | AES-256-GCM encryption |
| Data in transit | TLS 1.3 |
| Authentication | NextAuth.js JWT, HTTP-only cookies |
| Authorization | Row-level security (RLS) on all tables |
| Rate limiting | Redis token bucket (100 req/min/user) |
| Behavioral data | Isolated per user, never used for public LLM training |
| Ethical nudging | No shame, no aggressive warnings, auto-reschedule on miss |

---

## 10. Deployment Architecture

| Component | Service | Config |
|-----------|---------|--------|
| Frontend | Vercel | Serverless edge deployment |
| Backend | Railway / Render | Containerized NestJS, auto-scaling |
| Database | Supabase | PostgreSQL, daily snapshots |
| Cache | Redis Cloud | Session cache, rate limiting |
| AI | GroqCloud | Llama 3.3 70B API |

---

## 11. Algorithm Specifications

### Burnout Score

```
Burnout Score = Sum(task_duration_minutes x priority_weight) x consecutive_focus_factor

Priority Weights:
  Urgent = 1.5
  High   = 1.2
  Medium = 1.0
  Low    = 0.8

Consecutive Focus Factor:
  If consecutive focus hours > 3 -> multiplier = 1.3
  Otherwise -> multiplier = 1.0

Rolling window: 24 hours
Alert trigger: score > 75.0
```

### Micro-Stepping Friction

```
Friction Score = (estimated_minutes / 15) x (1 + postponement_count x 0.2)

Trigger:
  - estimated_minutes > 120 -> decompose
  - postponement_count >= 2 -> decompose

Output: 3-5 micro-steps, each <= 15 min, with rationale
```

---

## 12. API Contracts Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assistant/converse` | POST | Process text or voice input |
| `/api/v1/tasks` | GET/POST | List or create tasks |
| `/api/v1/tasks/:id` | PATCH/DELETE | Update or delete task |
| `/api/v1/tasks/:id/reorder` | POST | Reorder task position |
| `/api/v1/tasks/:id/micro-step` | POST | Trigger micro-stepping |
| `/api/v1/calendar` | GET | Get calendar events |
| `/api/v1/calendar/auto-schedule` | POST | Auto-schedule tasks |
| `/api/v1/calendar/:eventId` | PATCH/DELETE | Update or delete event |
| `/api/v1/calendar/block` | POST | Add manual block |
| `/api/v1/timetable` | GET | Get timetable |
| `/api/v1/timetable/regenerate` | POST | Regenerate with energy level |
| `/api/v1/timetable/block/:id` | PATCH | Resize block |
| `/api/v1/timetable/template` | POST | Save as template |
| `/api/v1/behavioral-profile` | GET | Get user heuristics |
| `/api/v1/focus/start` | POST | Start focus session |
| `/api/v1/focus/pause` | POST | Pause timer |
| `/api/v1/focus/resume` | POST | Resume timer |
| `/api/v1/focus/complete` | POST | End session, award XP |
| `/api/v1/focus/break` | POST | Start break |
| `/api/v1/diary` | GET | Get diary entry |
| `/api/v1/diary/generate` | POST | Generate daily summary |
| `/api/v1/diary/:id` | PATCH | Edit diary |
| `/api/v1/diary/:id/save` | POST | Save to memory |
| `/api/v1/reports/weekly` | GET | Get weekly report |
| `/api/v1/reports/weekly/:id/export` | GET | Export as PDF/PNG |
| `/api/v1/settings` | GET/PATCH | Get or update settings |
| `/api/v1/settings/account` | DELETE | Delete account |

---

## 13. Database Models

| Model | Key Fields |
|-------|-----------|
| **User** | id (UUID), email, passwordHash, fullName, createdAt |
| **UserSettings** | userId, assistantPersonality, burnoutThresholdScore, workStartHour, workEndHour |
| **BehavioralProfile** | userId, peakFocusStart, peakFocusEnd, lowEnergyStart, avgTaskDelayFactor |
| **GamificationStats** | userId, currentLevel, currentXP, streakDays |
| **Task** | id, userId, title, status, priority, estimatedMinutes, dueDate, parentTaskId, schedulingRationale, postponementCount |
| **CalendarEvent** | id, userId, taskId, startTime, endTime, type, rationale, isFixed |
| **TimetableBlock** | id, userId, dayOfWeek, startTime, endTime, activityType, templateId |
| **DailyDiary** | id, userId, date, generatedSummary, userEditedSummary, moodLog |
| **WeeklyReport** | id, userId, weekStartDate, completionRate, burnoutRiskAverage, focusHoursTotal |
| **BurnoutLog** | id, userId, calculatedScore, workloadDensityRatio, loggedAt |
| **Conversation** | id, userId, createdAt |
| **Message** | id, conversationId, sender, content, extractedMetadata |
| **FocusSession** | id, userId, taskId, durationMinutes, completedAt, xpEarned |
| **Badge** | id, name, description, icon, criteria |
| **UserBadge** | userId, badgeId, unlockedAt |

**Key relationships:**

- User -> Settings, BehavioralProfile, GamificationStats: 1:1
- User -> Tasks, CalendarEvents, TimetableBlocks, Diaries, Reports, BurnoutLogs, Conversations: 1:N
- Conversation -> Messages: 1:N
- Task -> Task (sub-tasks): 1:N self-relation
- Task -> CalendarEvent: 1:1 optional
- All PKs: UUIDv4
- All FKs: ON DELETE CASCADE

---

## 14. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+, React, TypeScript, Tailwind CSS |
| State | Zustand |
| Backend | NestJS (Node.js, TypeScript) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| AI | GroqCloud API (Llama 3.3 70B) |
| Auth | NextAuth.js (JWT) |
| Voice | Web Speech API, Whisper API (fallback) |
| Calendar | FullCalendar / React Big Calendar |
| Charts | Recharts |
| Audio | Web Audio API / HTML5 Audio |
| Cache | Redis (managed) |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway / Render |
| DB Hosting | Supabase |

---

## 15. Testing Requirements

| Type | Framework | Scope |
|------|-----------|-------|
| Unit | Jest | Burnout calc, micro-step friction, Prisma ops |
| Integration | Jest + Supertest | GroqCloud parsing, JSON validation, speech-to-text |
| E2E | Playwright | Login, chat, calendar drag-drop, task completion, diary |
| Load | K6 | API routing, Redis cache under concurrent sessions |
| UAT | Manual | Micro-stepping, burnout alerts, XAI clarity |

---

## 16. Success Metrics

| Metric | Target (3 months) |
|--------|-------------------|
| Daily Active Users | 500+ |
| Task completion rate | >= 60% |
| Avg sessions per user/day | >= 2 |
| Focus session completion | >= 70% |
| Burnout alert trigger rate | < 15% daily |
| 7-day retention | >= 40% |
| 30-day retention | >= 20% |
| NPS score | >= 40 |

---

## 17. Future Enhancements

| Enhancement | Timeline |
|------------|----------|
| Acoustic fatigue detection (vocal tone analysis) | Post-launch |
| Biometric wearable sync (Apple HealthKit, Google Health Connect) | Post-launch |
| Cross-platform native mobile (iOS/Android) | Phase 4+ |
| Hybrid offline AI (quantized local LLMs) | Phase 4+ |
