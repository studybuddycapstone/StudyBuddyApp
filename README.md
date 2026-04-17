# StudyBuddy

A React + TypeScript app that helps university students find classmates with shared courses, send connection requests, and chat.

## Features

- Match with students who share your classes (ranked by overlap)
- Send and manage connection requests
- Chat with active connections
- Firebase auth with `.edu` email requirement
- Demo mode — no account needed

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v4
- Firebase (Auth + Firestore)

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project (optional — see Demo Mode)

### Install

```bash
npm install
```

### Configure Firebase (optional)

Create `.env.local` with your Firebase project credentials:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

If these vars are absent, the app runs in **demo mode** using local seed data.

### Run

```bash
npm run dev
```

### Lint / Build

```bash
npm run lint
npm run build
```

## Architecture

```
src/
  pages/          # Route-level components (Login, Dashboard, Matches, Connections, Chat, ProfilePage)
  components/     # Shared UI (Navbar, ProtectedRoute, ProfileModal)
  context/        # Auth state (AuthContext.tsx + useAuth.ts)
  data/           # dataService.ts — switches between Firebase and demo data
  firebase/       # auth.ts, firestore.ts, firebaseConfig.ts
  types/          # Shared TypeScript interfaces
```

Data flows through `dataService.ts`, which abstracts Firestore and in-memory demo data behind the same async API. Auth state lives in `AuthContext` and is consumed via the `useAuth` hook.
