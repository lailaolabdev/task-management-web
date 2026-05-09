# TaskFlow — Frontend

**Lumina Workspace** · Task & Project Management Platform

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [User Roles & Permissions](#user-roles--permissions)
- [Pages & Features](#pages--features)
  - [Login](#login)
  - [Dashboard](#dashboard)
  - [Kanban Board](#kanban-board)
  - [Daily Standup](#daily-standup)
  - [Projects](#projects)
  - [Project Detail](#project-detail)
  - [Team Members](#team-members)
- [Components](#components)
- [Multi-language Support](#multi-language-support)
- [State Management](#state-management)
- [API Integration](#api-integration)

---

## Overview

TaskFlow is a team collaboration and project management platform built for software teams. It provides a real-time Kanban board, daily standup reporting, project portfolio tracking, team workload analytics, and role-based access control — all in one interface.

Key highlights:
- **Role-based UI** — each role sees only the features relevant to them
- **Drag-and-drop Kanban** — move tasks across columns to update status instantly
- **Daily standup** — structured daily updates with manager comment threads
- **Project milestones** — track Internal Test, UAT, and Production dates per project
- **Dashboard analytics** — project phases, timeline health, team workload, and blockers
- **Bilingual** — full English and Lao (ພາສາລາວ) support with live switching

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| State | Zustand (auth + task store) |
| Forms | React Hook Form + Zod |
| Drag & Drop | dnd-kit |
| HTTP client | Axios |
| i18n | i18next + react-i18next |
| Notifications | react-hot-toast |
| Fonts | Roboto (EN) · Noto Sans Lao (ລາວ) |

---

## Project Structure

```
frontend/
├── public/
│   └── images/             # Static assets (favicon, etc.)
├── src/
│   ├── components/         # Shared UI components
│   │   ├── Layout.tsx          # App shell: sidebar, topbar, language switcher
│   │   ├── KanbanColumn.tsx    # Single Kanban column (droppable)
│   │   ├── TaskCard.tsx        # Draggable task card
│   │   └── TaskModal.tsx       # Create / edit task form modal
│   ├── i18n/               # Internationalisation
│   │   ├── index.ts            # i18next config + lang sync
│   │   └── locales/
│   │       ├── en.ts           # English translations
│   │       └── lo.ts           # Lao translations
│   ├── lib/
│   │   └── axios.ts            # Axios instance with auth headers
│   ├── pages/              # Route-level page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── KanbanPage.tsx
│   │   ├── StandupPage.tsx
│   │   ├── ProjectsPage.tsx
│   │   ├── ProjectDetailPage.tsx
│   │   └── UsersPage.tsx
│   ├── stores/
│   │   ├── authStore.ts        # Auth state (user, token, login/logout)
│   │   └── taskStore.ts        # Task cache / filter state
│   ├── types/
│   │   └── index.ts            # Shared TypeScript interfaces & types
│   ├── App.tsx             # Route definitions + route guards
│   ├── main.tsx            # App entry point
│   └── index.css           # Tailwind base + global styles
├── index.html
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8 (or npm/yarn)
- Backend API running (see `/backend`)

### Installation

```bash
cd frontend
pnpm install
```

### Development

```bash
pnpm dev
```

The app runs at `http://localhost:5173` by default.

### Build

```bash
pnpm build     # TypeScript check + Vite build → dist/
pnpm preview   # Preview the production build locally
```

### Other scripts

```bash
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit
pnpm test       # Vitest unit tests
```

### Environment

The Axios base URL defaults to `http://localhost:8080/api`. To override it, create a `.env` file:

```env
VITE_API_URL=https://your-api.example.com/api
```

Then update `src/lib/axios.ts` to use `import.meta.env.VITE_API_URL`.

---

## User Roles & Permissions

The system has six roles. The sidebar navigation and page access are filtered per role automatically.

| Role | Dashboard | Kanban | Standup | Projects | Team Members |
|---|:---:|:---:|:---:|:---:|:---:|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Project Manager** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Lead Developer** | — | ✅ | ✅ | ✅ | — |
| **Developer** | — | ✅ | ✅ | ✅ | — |
| **Tester** | — | ✅ | ✅ | ✅ | — |
| **UX/UI** | — | ✅ | ✅ | ✅ | — |

Additional per-feature restrictions:
- **Kanban**: non-privileged users can only create tasks assigned to themselves; they can drag their own tasks to update status
- **Standup**: Admin/PM see the full team view with comment capability; other roles see and submit only their own standups, and can read manager comments
- **Projects**: Admin/PM see all projects; others see only projects they are members of
- **Team Members**: only Admin and Project Manager can access the user management page

---

## Pages & Features

### Login

Route: `/login`

- Email + password authentication
- Redirects Admin/PM to `/dashboard`, all others to `/kanban` after sign-in
- Contact Admin note for account creation (no self-registration)

---

### Dashboard

Route: `/dashboard` · Roles: **Admin, Project Manager**

An analytics overview of the entire workspace.

**KPI Cards**
- Total Tasks in the system
- Overall completion rate (%)
- Total active users
- Total projects

**Project Portfolio**
A table of all projects showing:
- Project logo / name
- Current **phase** badge (Analysis · Development · Testing · Completed · On Hold · Archived) — computed from task status distribution
- **Timeline** badge (On Track · At Risk · Delayed · Completed) — computed from days until the production/target deadline
- Days left or days overdue
- Completion progress bar
- Milestone dates: 📋 Internal Test · 🧪 UAT · 🚀 Production

**Team Workload**
- Per-member task count and story points
- Highlights the heaviest-loaded member
- Peak period banner showing the week with the most upcoming task deadlines

**Blockers**
- List of all tasks currently in "blocked" state across the workspace

---

### Kanban Board

Route: `/kanban` · Roles: **All**

A drag-and-drop task board with five columns:

| Column | Description |
|---|---|
| To Do | Not yet started |
| In Progress | Actively being worked on |
| Code Review | Awaiting peer review |
| Testing | In QA / testing phase |
| Done | Completed |

**How to use:**
1. Select a project from the dropdown at the top
2. Tasks for that project appear grouped by status column
3. **Drag a task card** to a different column to update its status instantly
4. **Click a task card body** to open the edit modal
5. Click **Create Task** (or the `+` button in any column) to add a new task

**Access rules:**
- Admin/PM see all tasks and can assign any member
- Other roles see only tasks assigned to them, and new tasks are auto-assigned to themselves

---

### Daily Standup

Route: `/standup` · Roles: **All**

**For regular team members (My Standup tab):**
1. Select the project you worked on
2. Fill in: *What did I do yesterday?*, *What will I do today?*, *Blockers* (optional)
3. Click **Submit** — one submission per project per day is allowed
4. Click on your submitted standup card to open the detail view and read any manager comments

**For Admin / Project Manager (Team Standups tab):**
- Filter by date (default: today) and/or project
- Search submissions by team member name
- Cards show each member's update with blocker indicators
- Click any card to open the **detail modal**:
  - Full standup content
  - Comment thread from managers
  - Type a comment and press **Post** (or `⌘+Enter`) to reply

---

### Projects

Route: `/projects` · Roles: **All** (filtered by membership for non-privileged)

A card grid of all accessible projects.

**Creating a project (Admin/PM):**
1. Click **New Project**
2. Fill in: name, description, status, target date
3. Set optional milestone dates — 📋 Internal Test, 🧪 UAT, 🚀 Production
4. Upload a logo (PNG/JPG/WebP, max 20 MB)
5. Select team members from the member picker
6. Click **Save**

**Project card shows:**
- Logo / project name
- Status badge (Planning · Active · On Hold · Completed · Archived)
- Target date
- Member count

Click a project card to open the **Project Detail** page.

---

### Project Detail

Route: `/projects/:id` · Roles: **All** (members only for non-privileged)

Detailed view of a single project with three sections:

**Overview tab**
- Project metadata: status, owner, dates
- Milestone dates (Internal Test / UAT / Production)
- Member list

**Tasks tab**
- All tasks for this project in a list view
- Create, edit, and delete tasks

**Documents tab**
- Upload files (PDF, Excel, Word, images, etc.)
- Preview files inline (PDF viewer, image viewer, Office Online for XLSX/DOCX)
- Download files
- Delete documents (Admin/PM only)

**Editing a project (Admin/PM):**
Click the **Edit** button in the top bar to open the edit modal with the same fields as creation, including milestone dates and the option to upload additional documents.

---

### Team Members

Route: `/users` · Roles: **Admin, Project Manager**

A searchable table of all user accounts.

**Creating a user:**
1. Click **Create User**
2. Fill in: full name, email, password, role, department
3. Toggle active/inactive status
4. Click **Save**

**Editing a user:**
Click the edit icon on any row to update their details or deactivate the account.

---

## Components

### `Layout`

The persistent app shell rendered around all authenticated pages.

- **Sidebar**: brand logo, search bar, role-filtered navigation links, user profile card with logout
- **Header**: language switcher (🇬🇧 EN / 🇱🇦 ລາວ), notification bell, user avatar chip
- Uses `<Outlet />` from React Router for page content

### `TaskCard`

A draggable task card used inside Kanban columns.

Props:
```typescript
task: Task           // The task data
isDragging?: boolean // True when the card is being dragged (ghost styling)
onClick?: () => void // Opens the detail/edit view
onEdit?: () => void  // Edit icon click handler
onDelete?: () => void // Delete icon click handler
```

Displays: title, description excerpt, tags, date range, story points, assignee avatar, priority badge.

### `KanbanColumn`

A droppable column container for a single task status.

Props:
```typescript
status: TaskStatus          // Column status identifier
tasks: Task[]               // Tasks to render in this column
onTaskClick: (task) => void // Bubble up task click
onTaskEdit: (task) => void
onTaskDelete: (task) => void
onAddTask: () => void       // "+" new task button
```

### `TaskModal`

A modal form for creating or editing a task.

Props:
```typescript
task?: Task              // If provided, opens in edit mode
projectId: string        // Parent project
defaultAssigneeId?: string // Pre-select assignee (used for non-privileged roles)
lockAssignee?: boolean   // Makes assignee field read-only
canDelete?: boolean      // Shows/hides the Delete button
onClose: () => void
onSave: () => void       // Called after successful save/delete
```

Fields: title, description, status, priority, assignee, story points, start date, end date, tags, GitHub PR link.

---

## Multi-language Support

The app ships with **English** and **Lao** translations.

### Switching languages

Click the flag button in the top-right header:
- 🇬🇧 **EN** — English (Roboto font)
- 🇱🇦 **ລາວ** — Lao / ພາສາລາວ (Noto Sans Lao font)

The choice is saved in `localStorage` and restored on next visit. The browser's language preference is also detected on first load.

### Translation files

```
src/i18n/
├── index.ts          # i18next init; syncs <html lang> for CSS font switching
└── locales/
    ├── en.ts         # English strings
    └── lo.ts         # Lao strings
```

### Adding a new language

1. Create `src/i18n/locales/xx.ts` mirroring the structure of `en.ts`
2. Add it to `src/i18n/index.ts` resources: `xx: { translation: xx }`
3. Add `'xx'` to `supportedLngs`
4. Add a case in `LanguageSwitcher` in `Layout.tsx`
5. Add a CSS font rule in `index.css` for `html[lang="xx"]`

### Adding a translation key

1. Add the key + English value to `src/i18n/locales/en.ts`
2. Add the Lao translation to `src/i18n/locales/lo.ts`
3. Use it in any component:
   ```tsx
   const { t } = useTranslation();
   // ...
   <p>{t('your.new.key')}</p>
   ```

---

## State Management

### `authStore` (Zustand + persist)

Persisted to `localStorage` under the key `auth-storage`.

```typescript
user: User | null          // Logged-in user object
token: string | null       // JWT bearer token
isAuthenticated: boolean

setAuth(user, token)       // Called after successful login
logout()                   // Clears state + redirects to /login
updateUser(user)           // Sync profile changes
```

### `taskStore` (Zustand)

In-memory cache for the Kanban board's current project tasks.

---

## API Integration

All HTTP requests go through `src/lib/axios.ts`, which:
- Sets `baseURL` to `http://localhost:8080/api`
- Injects the `Authorization: Bearer <token>` header from `authStore` on every request

### Endpoints used by the frontend

| Feature | Endpoint |
|---|---|
| Auth | `POST /auth/login` |
| Projects | `GET/POST /projects` · `GET/PATCH/DELETE /projects/:id` |
| Project documents | `DELETE /projects/:id/documents/:url` |
| Tasks | `GET/POST /tasks` · `PATCH/DELETE /tasks/:id` |
| Users | `GET/POST /users` · `PATCH/DELETE /users/:id` |
| Dashboard | `GET /dashboard/metrics` · `/dashboard/projects` · `/dashboard/workload` · `/dashboard/blockers` |
| Standups | `GET/POST /standups` · `GET /standups/today` · `PATCH /standups/:id` |
| Standup comments | `GET /standups/:id/comments` · `POST /standups/:id/comments` |
