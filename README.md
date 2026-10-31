<div align="center">

# 🎯 Focussive AI

### *Adaptive Personal Productivity with NLP Task Extraction & Proactive Burnout Prevention*

<p align="center">

  <a href="#-visual-showcase"><img src="https://img.shields.io/badge/Status-Feature%20Complete-success?style=for-the-badge&logo=git" alt="Status" /></a>

  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>

  <a href="#-tech-stack"><img src="https://img.shields.io/badge/NestJS-11.0-E0234E?style=for-the-badge&logo=nestjs" alt="NestJS" /></a>

  <a href="#-tech-stack"><img src="https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript" alt="TypeScript" /></a>

  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Llama_3.3_70B-GroqCloud-f55036?style=for-the-badge&logo=fastapi" alt="GroqCloud" /></a>

  <a href="#-tech-stack"><img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" /></a>

  <a href="#-tech-stack"><img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" /></a>

  <a href="#-license"><img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" /></a>

</p>

<p align="center">

  <b>Focussive AI</b> replaces rigid, guilt-inducing task trackers with a shame-free, AI-driven productivity ecosystem. Using natural conversation, intelligent priority weighting, circadian energy scheduling, and automated micro-stepping, it empowers you to accomplish meaningful work without burnout.

</p>

---

[Key Highlights](#-key-features) • [Visual Showcase](#-visual-showcase) • [Architecture](#-system-architecture) • [Algorithms](#-algorithmic-innovations) • [Getting Started](#-getting-started) • [API Overview](#-api-endpoints)

---

</div>

<br />

## 🌟 Visual Showcase

Explore Focussive AI in action through the dashboard overview below.

> 💡 **For Maintainers:** To update these media files, see the [Assets & Embedding Guide](#-how-to-update-embedded-media) or place your files in [`assets/`](./assets/).

---

### 📸 Dashboard Overview

*The centralized control center providing real-time cognitive metrics, energy timelines, and adaptive recommendations.*

<p align="center">

  <!-- Replace with your actual image path or GitHub attachment URL -->

  <img src="assets/images/dashboard.png" alt="Focussive AI Dashboard Overview" width="95%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" />

</p>

<details>

<summary><b>🔍 What's visible on this dashboard?</b></summary>

<br>

- **Dynamic Greeting & Time Context:** Real-time day/night greeting with fluid typographic micro-animations.

- **Real-Time KPI Cards:** Instant stats for *Tasks Completed*, *Algorithmic Burnout Risk Score*, *Total Deep Focus Hours*, and *Current Mood/Energy Status*.

- **Weekly Focus & Productivity Trend:** Interactive Recharts area chart tracking focus consistency versus task volume.

- **Today's Circadian Timeline:** Chronological timeline showing scheduled energy blocks (High / Medium / Low).

- **Upcoming Prioritized Tasks:** One-click task completion with color-coded priority badges and estimated duration.

- **Smart AI Recommendations:** Contextual recommendations generated dynamically from recent fatigue levels and workload.

</details>

---

<br />

## 💡 The Core Problem & Our Philosophy

Traditional task managers fail knowledge workers and students with ADHD or procrastination tendencies:

| Traditional Productivity Tools | Focussive AI Approach |

| :--- | :--- |

| **Rigid Time-Blocking:** Breaks when life happens, leading to abandoned calendars. | **Adaptive Timetable:** Reschedules dynamically based on daily energy and rhythm. |

| **Guilt-Driven Overdue Alerts:** Red badges and shame notifications create anxiety. | **Shame-Free Philosophy:** Zero penalties for delays; AI suggests recalibrations. |

| **Overwhelming Task Monoliths:** Large tasks linger untouched for weeks. | **Micro-Stepping Engine:** Breaks paralysis-inducing tasks into 15-minute easy wins. |

| **Ignored Mental Health:** Encourages endless grinding until burnout occurs. | **Algorithmic Burnout Monitor:** Halts consecutive sessions and enforces restorative breaks. |

---

<br />

## ✨ Key Features

### 1. 🧠 Conversational AI Assistant & Task Extraction

- Chat or speak naturally using voice input or text.

- Backed by **GroqCloud Llama 3.3 70B** with low-latency streaming responses via **Server-Sent Events (SSE)**.

- Autonomous function calling creates tasks, adjusts calendar blocks, and pulls statistics directly from conversation.

### 2. 🛡️ Algorithmic Burnout Risk Detection

- Continuously calculates your cognitive workload score based on duration, priority weight, and consecutive focus hours.

- Warns proactively when your score exceeds **75.0** and suggests restorative breaks before cognitive fatigue sets in.

### 3. ⚡ Micro-Stepping Friction Engine

- Detects tasks exceeding **120 minutes** or delayed **\(\ge 2\) times**.

- Programmatically breaks them down into **\(\le 15\)-minute actionable micro-steps** with clear rationales.

### 4. 📅 Adaptive Timetable with Explainable AI (XAI)

- Schedules deep-work blocks matched to your personal circadian energy profile:

  - **High Energy:** 90 min deep work / 15 min rest

  - **Medium Energy:** 60 min focus / 10 min rest

  - **Low Energy:** 25 min focus / 5 min rest

- Hover tooltips explain *why* every task was placed where it is (*"Scheduled at 9:30 AM because this requires high analytical focus during your peak energy window"*).

### 5. 📖 Daily Diary & AI Emotional Retrospective

- End-of-day synthesis combining mood logs, focus stats, and completed milestones into a narrative journal.

- Fully editable summaries with persistent historical trends.

### 6. 🎮 Non-Punitive Story Mode & Gamification

- Earn XP for focus sessions and completed micro-steps.

- Level up through ranks (*Focus Novice*, *Momentum Builder*, *Flow Master*).

- Zero punishment or XP loss for taking rest days.

### 7. 🔔 Web Push & Background Desktop Notifications

- Centralized Notification Service powered by an active **Service Worker (`sw.js`)**.

- Delivers desktop push alerts for Pomodoro completions, focus break reminders, and burnout surge alerts.

---

<br />

## 🔬 Algorithmic Innovations

### 1. Burnout Index Formula (\(B_s\))

The system calculates cognitive strain dynamically:

\(B_s = \left( \sum\_{i=1}^{n} \text{duration}\_i \times w(p_i) \right) \times f_c\)

Where:

- \(\text{duration}\_i\) is the duration of task \(i\) in minutes.

- \(w(p_i)\) is the calibrated priority weight:

  - \(\text{URGENT} \rightarrow 1.5\)

  - \(\text{HIGH} \rightarrow 1.2\)

  - \(\text{MEDIUM} \rightarrow 1.0\)

  - \(\text{LOW} \rightarrow 0.8\)

- \(f_c\) is the consecutive focus penalty:

  - \(f_c = 1.3\) if consecutive focus hours \(> 3.0\)

  - \(f_c = 1.0\) otherwise

- **Alert Trigger:** \(B_s > 75.0\) automatically dispatches an alert and offers a rest block.

---

### 2. Micro-Stepping Friction Index (\(F\))

To eliminate procrastination and task paralysis:

\(F = \left( \frac{\text{estimatedMinutes}}{15} \right) \times (1 + \text{postponementCount} \times 0.2)\)

- **Decomposition Condition:** Triggered whenever \(\text{estimatedMinutes} > 120\) OR \(\text{postponementCount} \ge 2\).

- **Result:** Divides the parent task into \(N = \max(3, \lceil \text{estimatedMinutes} / 15 \rceil)\) bite-sized steps of \(\le 15\) minutes each.

---

<br />

## 🏗️ System Architecture

```mermaid

flowchart TD

    subgraph Client ["Frontend (Next.js 15 + React 19)"]

        UI["Material Design 3 UI & Glow Cards"]

        SW["Service Worker (Web Push & Notifications)"]

        Store["Zustand Auth & State Store"]

        Stream["SSE Client (AI Assistant Stream)"]

    end

    subgraph Server ["Backend (NestJS 11 REST API)"]

        Gateway["API Gateway (/api/v1)"]

        AuthMod["Auth Module (JWT & Cookies)"]

        TaskMod["Task & Microstep Service"]

        AlgoMod["Burnout & Friction Algorithms"]

        AIMod["GroqCloud AI Service"]

        DiaryMod["Diary & Recommendation Service"]

    end

    subgraph Data ["Persistence & External Services"]

        Prisma["Prisma ORM"]

        DB[(PostgreSQL / Supabase)]

        LLM["GroqCloud API (Llama 3.3 70B)"]

    end

    UI --> Store

    UI --> Stream

    UI --> SW

    Stream --> Gateway

    Store --> Gateway

    Gateway --> AuthMod

    Gateway --> TaskMod

    Gateway --> AlgoMod

    Gateway --> AIMod

    Gateway --> DiaryMod

    TaskMod --> AlgoMod

    TaskMod --> Prisma

    AIMod --> LLM

    DiaryMod --> Prisma

    Prisma --> DB

```

---

<br />

## 💻 Tech Stack

| Category | Technologies & Libraries |

| :--- | :--- |

| **Frontend Framework** | [Next.js 15.1](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript 5.7](https://www.typescriptlang.org/) |

| **Styling & Design System** | [Tailwind CSS 3.4](https://tailwindcss.com/), Material Design 3 tokens, Cursor-Tracking Glow Cards |

| **UI Components & Charts** | [FullCalendar 6](https://fullcalendar.io/), [Recharts 2.15](https://recharts.org/), [Lucide React](https://lucide.dev/), [Motion](https://motion.dev/) |

| **Client State Management** | [Zustand 5](https://zustand-demo.pmnd.rs/) |

| **Backend Framework** | [NestJS 11](https://nestjs.com/), [Node.js](https://nodejs.org/) |

| **Database & ORM** | [PostgreSQL (Supabase)](https://supabase.com/), [Prisma ORM 6](https://www.prisma.io/) (15 Normalized Models) |

| **AI Inference Engine** | [GroqCloud API](https://groq.com/) running `llama-3.3-70b-versatile` with Tool Calling & SSE |

| **Background Notifications** | Browser Service Worker API (`sw.js`), HTML5 Web Notifications |

| **Testing** | Jest unit & integration test suites (19 passing suites) |

---

<br />

## 📁 Repository Structure

```plaintext

Focussive-AI/

├── assets/                     # 📂 Screenshots and feature images

│   ├── images/                 # Dashboard, architecture, and feature thumbnails

│   │   └── dashboard.png

├── backend/                    # 🚀 NestJS 11 Server Application

│   ├── prisma/                 # Prisma database schema (15 models) & migrations

│   │   └── schema.prisma

│   ├── src/

│   │   ├── algorithms/         # Core Burnout & Micro-stepping mathematical engines

│   │   │   ├── burnout.ts

│   │   │   └── microstep.ts

│   │   ├── auth/               # Authentication & JWT security

│   │   ├── tasks/              # Task lifecycle & priority management

│   │   ├── timetable/          # Energy-based schedule generation

│   │   ├── diary/              # AI diary synthesis

│   │   ├── focus/              # Focus sessions & Pomodoro integration

│   │   ├── gamification/       # XP, levels, and badges

│   │   └── recommendations/    # Contextual proactive suggestions

│   └── test/                   # Jest end-to-end and integration tests

├── frontend/                   # 🎨 Next.js 15 Client Application

│   ├── public/                 # Static assets & Service Worker (sw.js)

│   └── src/

│       ├── app/                # 13 Application Routes (App Router)

│       │   ├── dashboard/      # Main overview dashboard

│       │   ├── page.tsx        # Conversational AI Assistant

│       │   ├── tasks/          # Priority task board & micro-steps

│       │   ├── calendar/       # Calendar view with XAI tooltips

│       │   ├── timetable/      # Energy profile schedule

│       │   ├── focus/          # Deep focus timer & audio player

│       │   ├── diary/          # AI reflection journal

│       │   ├── story/          # Gamified story mode & badges

│       │   ├── reports/        # Weekly analytics & burnout curves

│       │   └── settings/       # Notifications & user preferences

│       └── components/         # Shared UI components & FloatingDock

├── PRD.md                      # Detailed Product Requirements Document

├── PROJECT_REPORT.md           # Academic & technical dissertation report

└── PROGRESS.md                 # Sprint progress & implementation changelog

```

---

<br />

## 🚀 Getting Started

Follow these instructions to run both the backend and frontend locally.

### Prerequisites

- **Node.js:** `v18.18+` or `v20+`

- **Package Manager:** `npm` (or `pnpm` / `yarn`)

- **Database:** A running PostgreSQL instance (or free [Supabase](https://supabase.com/) project)

- **Groq API Key:** Free API key from [GroqCloud Console](https://console.groq.com/)

---

### Step 1: Clone the Repository

```bash

git clone https://github.com/YOUR_USERNAME/Focussive-AI.git

cd Focussive-AI

```

---

### Step 2: Backend Setup (NestJS)

1. Open a terminal and navigate to `backend/`:

   ```bash

   cd backend

   npm install

   ```

2. Create your environment configuration file:

   ```bash

   cp .env.example .env

   ```

3. Update the `.env` variables with your PostgreSQL and Groq credentials:

   ```env

   DATABASE_URL="postgresql://postgres:password@localhost:5432/focussive?schema=public"

   PORT=3001

   FRONTEND_URL="http://localhost:3002"

   JWT_ACCESS_SECRET="your-super-secure-jwt-access-secret"

   JWT_REFRESH_SECRET="your-super-secure-jwt-refresh-secret"

   GROQ_API_KEY="gsk_your_groq_api_key_here"

   GROQ_MODEL="llama-3.3-70b-versatile"

   ```

4. Push the database schema using Prisma:

   ```bash

   npx prisma db push

   ```

5. Start the backend development server:

   ```bash

   npm run start:dev

   ```

   > 🚀 Backend will be active on **`http://localhost:3001/api/v1`**

---

### Step 3: Frontend Setup (Next.js 15)

1. Open a second terminal and navigate to `frontend/`:

   ```bash

   cd frontend

   npm install

   ```

2. Confirm your `.env.local` points to the backend API:

   ```env

   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

   ```

3. Start the Next.js development server:

   ```bash

   npm run dev

   ```

   > 🌐 Frontend will be active on **`http://localhost:3002`**

---

### Step 4: Run Tests

Execute unit tests and algorithmic verification suites:

```bash

# In backend/

npm run test

```

*All 19 test suites test algorithmic burnout models, micro-step decomposition, and API services.*

---

<br />

## 🔗 API Endpoints

All endpoints are prefixed with `/api/v1` and protected via JWT Bearer authentication (except Auth endpoints):

| Category | Method | Endpoint | Description |

| :--- | :--- | :--- | :--- |

| **Auth** | `POST` | `/auth/register` | Register new user account |

| | `POST` | `/auth/login` | Login and receive JWT access token |

| | `GET` | `/auth/me` | Fetch authenticated user profile |

| **Tasks** | `GET` | `/tasks` | List all tasks with priority tags |

| | `POST` | `/tasks` | Create new prioritized task |

| | `POST` | `/tasks/:id/microstep` | **Decompose task into 15-min micro-steps** |

| | `POST` | `/tasks/:id/revert-microstep` | Revert micro-steps back to single task |

| **Timetable** | `GET` | `/timetable` | Fetch energy-aligned timetable blocks |

| | `POST` | `/timetable/regenerate` | Regenerate timetable based on energy |

| **Diary** | `GET` | `/diary` | Fetch all historical diary entries |

| | `POST` | `/diary/generate` | **AI-synthesize daily diary & reflections** |

| **Gamification** | `GET` | `/gamification` | Fetch XP, current level, and badges |

| **Recommendations**| `GET` | `/recommendations` | Context-aware AI wellness suggestions |

| **Reports** | `GET` | `/reports/weekly` | Weekly productivity and burnout analytics |

---

<br /?
<br />

<div align="center">

  <sub>Built with ❤️ for focused minds and sustainable productivity.</sub>

</div>
