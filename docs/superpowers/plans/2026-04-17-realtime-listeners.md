# Real-Time Listeners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace one-time data fetches in Chat and Connections with live Firestore `onSnapshot` listeners so messages and connection state update automatically without a page refresh.

**Architecture:** Two Firestore subscribe functions added to `firestore.ts`. Two custom React hooks (`useMessages`, `useConnections`) own listener setup, exponential-backoff retry, and cleanup. Components swap their existing fetch calls for the hooks. Demo mode falls back to the existing one-time fetch with a `refetch()` escape hatch for post-mutation updates.

**Tech Stack:** React 18, TypeScript, Firebase Firestore (`onSnapshot`), Vite.

---

## File Map

| Path | Action | Responsibility |
|---|---|---|
| `src/firebase/firestore.ts` | Modify | Add `onSnapshot` import + two subscribe functions |
| `src/hooks/useMessages.ts` | Create | Listener hook for messages in a connection |
| `src/hooks/useConnections.ts` | Create | Listener hook for connections for a user |
| `src/pages/Chat.tsx` | Modify | Swap `getMessages` + `messages` state for `useMessages` hook |
| `src/pages/Connections.tsx` | Modify | Swap `getConnectionsForUser` + `connections` state for `useConnections` hook |

---

## Task 1: Add subscribe functions to `firestore.ts`

**Files:**
- Modify: `src/firebase/firestore.ts`

- [ ] **Step 1: Add `onSnapshot` to the firebase/firestore import**

Replace the existing import block at the top of `src/firebase/firestore.ts`:

```ts
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
```

- [ ] **Step 2: Add `subscribeToMessages` at the bottom of `src/firebase/firestore.ts`**

```ts
export function subscribeToMessages(
  connectionId: string,
  onData: (msgs: Message[]) => void,
  onError: (err: Error) => void
): () => void {
  if (!db) return () => {};
  const q = query(
    collection(db, "messages"),
    where("connectionId", "==", connectionId),
    orderBy("timestamp", "asc")
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))),
    onError
  );
}
```

- [ ] **Step 3: Add `subscribeToConnections` immediately after `subscribeToMessages`**

```ts
export function subscribeToConnections(
  uid: string,
  onData: (conns: Connection[]) => void,
  onError: (err: Error) => void
): () => void {
  if (!db) return () => {};
  const q = query(
    collection(db, "connections"),
    where("participants", "array-contains", uid),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Connection))),
    onError
  );
}
```

- [ ] **Step 4: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: exits 0 with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/firebase/firestore.ts
git commit -m "feat(firestore): add subscribeToMessages and subscribeToConnections"
```

---

## Task 2: Create `useMessages` hook

**Files:**
- Create: `src/hooks/useMessages.ts`

- [ ] **Step 1: Create the file with the full hook implementation**

Create `src/hooks/useMessages.ts` with:

```ts
import { useState, useEffect, useRef } from "react";
import { hasFirebaseConfig } from "../firebase/firebaseConfig";
import { subscribeToMessages } from "../firebase/firestore";
import { getMessages } from "../data/dataService";
import type { Message } from "../types";

export function useMessages(connectionId: string): {
  messages: Message[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!connectionId) return;

    if (!hasFirebaseConfig) {
      setLoading(true);
      getMessages(connectionId).then((msgs) => {
        setMessages(msgs);
        setLoading(false);
      });
      return;
    }

    setLoading(true);
    let retryCount = 0;
    let unsubscribe = () => {};

    const connect = () => {
      unsubscribe = subscribeToMessages(
        connectionId,
        (msgs) => {
          setMessages(msgs);
          setLoading(false);
          retryCount = 0;
        },
        (err) => {
          console.error("useMessages listener error:", err);
          unsubscribe();
          retryCount += 1;
          if (retryCount < 3) {
            retryTimeoutRef.current = setTimeout(connect, 1000 * 2 ** retryCount);
          } else {
            setError("Live updates unavailable — reconnect or refresh");
          }
        }
      );
    };

    connect();

    return () => {
      clearTimeout(retryTimeoutRef.current ?? undefined);
      unsubscribe();
    };
  }, [connectionId]);

  const refetch = () => {
    if (!hasFirebaseConfig && connectionId) {
      getMessages(connectionId).then(setMessages);
    }
  };

  return { messages, loading, error, refetch };
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: exits 0 with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMessages.ts
git commit -m "feat(hooks): add useMessages with onSnapshot listener and demo fallback"
```

---

## Task 3: Create `useConnections` hook

**Files:**
- Create: `src/hooks/useConnections.ts`

- [ ] **Step 1: Create the file with the full hook implementation**

Create `src/hooks/useConnections.ts` with:

```ts
import { useState, useEffect, useRef } from "react";
import { hasFirebaseConfig } from "../firebase/firebaseConfig";
import { subscribeToConnections } from "../firebase/firestore";
import { getConnectionsForUser } from "../data/dataService";
import type { Connection } from "../types";

export function useConnections(uid: string): {
  connections: Connection[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uid) return;

    if (!hasFirebaseConfig) {
      setLoading(true);
      getConnectionsForUser(uid).then((conns) => {
        setConnections(conns);
        setLoading(false);
      });
      return;
    }

    setLoading(true);
    let retryCount = 0;
    let unsubscribe = () => {};

    const connect = () => {
      unsubscribe = subscribeToConnections(
        uid,
        (conns) => {
          setConnections(conns);
          setLoading(false);
          retryCount = 0;
        },
        (err) => {
          console.error("useConnections listener error:", err);
          unsubscribe();
          retryCount += 1;
          if (retryCount < 3) {
            retryTimeoutRef.current = setTimeout(connect, 1000 * 2 ** retryCount);
          } else {
            setError("Live updates unavailable — reconnect or refresh");
          }
        }
      );
    };

    connect();

    return () => {
      clearTimeout(retryTimeoutRef.current ?? undefined);
      unsubscribe();
    };
  }, [uid]);

  const refetch = () => {
    if (!hasFirebaseConfig && uid) {
      getConnectionsForUser(uid).then(setConnections);
    }
  };

  return { connections, loading, error, refetch };
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: exits 0 with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useConnections.ts
git commit -m "feat(hooks): add useConnections with onSnapshot listener and demo fallback"
```

---

## Task 4: Wire `useMessages` into `Chat.tsx`

**Files:**
- Modify: `src/pages/Chat.tsx`

- [ ] **Step 1: Update the import block**

Replace the existing import block at the top of `src/pages/Chat.tsx`:

```tsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  sendMessage,
  clearMessages,
  getConnectionsForUser,
  getProfile,
} from "../data/dataService";
import { hasFirebaseConfig } from "../firebase/firebaseConfig";
import { useMessages } from "../hooks/useMessages";
import type { Message, Connection, UserProfile } from "../types";
import ProfileModal from "../components/ProfileModal";
```

(Removes `getMessages` from the dataService import; adds `hasFirebaseConfig` and `useMessages`.)

- [ ] **Step 2: Replace `messages` state with the hook and update the loading check**

In the component body, remove:
```tsx
const [messages, setMessages] = useState<Message[]>([]);
```

And add the hook call immediately after the remaining state declarations (after `showProfile`):
```tsx
const {
  messages,
  loading: messagesLoading,
  error: messagesError,
  refetch: refetchMessages,
} = useMessages(connectionId ?? "");
```

Also remove the `Message` type from the `useState` import—`Message` is still used by the type import from `"../types"` so leave that line intact. The `useState<Message[]>` line is the only thing removed from state.

- [ ] **Step 3: Update the loading guard to include `messagesLoading`**

Find the early return loading check:
```tsx
if (loading) {
```

Replace with:
```tsx
if (loading || messagesLoading) {
```

- [ ] **Step 4: Remove `getMessages` call from `loadChatData`**

Inside `loadChatData`, remove these two lines:
```tsx
          const msgs = await getMessages(connectionId);
          if (isMounted) setMessages(msgs);
```

- [ ] **Step 5: Update `handleSend` to remove the optimistic append and add demo refetch**

Replace the current `handleSend`:
```tsx
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !connectionId) return;

    try {
      await sendMessage(connectionId, user.uid, newMessage.trim());
      setNewMessage("");
      if (!hasFirebaseConfig) refetchMessages();
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Check console for details.");
    }
  };
```

- [ ] **Step 6: Add error banner below the chat header**

Find the closing `</div>` of the chat header block (the one after `</div>` that closes `max-w-3xl mx-auto flex items-center gap-3`). Insert the banner immediately after it, before the messages area `<div>`:

```tsx
      {messagesError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
          <p className="text-amber-700 text-xs">{messagesError}</p>
        </div>
      )}
```

- [ ] **Step 7: Verify the build compiles with no errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: exits 0.

- [ ] **Step 8: Smoke-test in demo mode**

```bash
npm run dev
```

Open `http://localhost:5173`, log in with demo, navigate to an active connection, open chat. Send a message — it should appear immediately. Clear messages — list should empty. No console errors.

- [ ] **Step 9: Commit**

```bash
git add src/pages/Chat.tsx
git commit -m "feat(chat): replace getMessages fetch with useMessages live listener"
```

---

## Task 5: Wire `useConnections` into `Connections.tsx`

**Files:**
- Modify: `src/pages/Connections.tsx`

- [ ] **Step 1: Update the import block**

Replace the existing import block at the top of `src/pages/Connections.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  getProfile,
  acceptConnection,
  declineConnection,
} from "../data/dataService";
import { hasFirebaseConfig } from "../firebase/firebaseConfig";
import { useConnections } from "../hooks/useConnections";
import type { Connection, UserProfile } from "../types";
import ProfileModal from "../components/ProfileModal";
```

(Removes `getConnectionsForUser` from dataService imports; adds `hasFirebaseConfig` and `useConnections`.)

- [ ] **Step 2: Replace `connections` state and `loading` state with the hook; remove the fetch `useEffect`**

Remove these three state declarations:
```tsx
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
```

Remove the entire fetch `useEffect` (the one starting with `useEffect(() => { if (!user) return;` that calls `getConnectionsForUser`).

Add the hook call immediately after the remaining state declarations (`selectedProfile` and `removing`):
```tsx
  const {
    connections,
    loading,
    error: connectionsError,
    refetch: refetchConnections,
  } = useConnections(user?.uid ?? "");
```

- [ ] **Step 3: Remove `setConnections` calls from `handleAccept` and add demo refetch**

Replace `handleAccept`:
```tsx
  const handleAccept = async (connectionId: string) => {
    await acceptConnection(connectionId);
    if (!hasFirebaseConfig) refetchConnections();
  };
```

- [ ] **Step 4: Remove `setConnections` call from `handleDecline` and add demo refetch**

Replace `handleDecline`:
```tsx
  const handleDecline = async (connectionId: string) => {
    await declineConnection(connectionId);
    if (!hasFirebaseConfig) refetchConnections();
  };
```

- [ ] **Step 5: Remove `setConnections` call from `handleRemoveConnection` and add demo refetch**

Replace `handleRemoveConnection`:
```tsx
  const handleRemoveConnection = async (connectionId: string) => {
    if (!confirm("Remove this connection? This cannot be undone.")) return;
    setRemoving(connectionId);
    try {
      await declineConnection(connectionId);
      if (!hasFirebaseConfig) refetchConnections();
    } catch {
      alert("Failed to remove connection. Please try again.");
    } finally {
      setRemoving(null);
    }
  };
```

- [ ] **Step 6: Add error banner below the page header**

Find the `<p>` that reads `Manage your study buddy requests and active connections.</p>`. Insert the banner immediately after it:

```tsx
        {connectionsError && (
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg mb-4 text-center">
            <p className="text-amber-700 text-xs">{connectionsError}</p>
          </div>
        )}
```

- [ ] **Step 7: Remove unused `useEffect` import if nothing else uses it**

Check the import line `import { useState, useEffect } from "react";` — after removing the fetch `useEffect`, `useEffect` is no longer used. Update to:

```tsx
import { useState } from "react";
```

- [ ] **Step 8: Verify the build compiles with no errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: exits 0.

- [ ] **Step 9: Smoke-test in demo mode**

```bash
npm run dev
```

Open `http://localhost:5173`, log in with demo, navigate to Connections. Accept a pending request — the card should move to Active Connections immediately. Decline another — it should disappear. Remove an active connection — it should disappear. No console errors.

- [ ] **Step 10: Run lint**

```bash
npm run lint 2>&1 | tail -30
```

Expected: no errors. Fix any reported issues before proceeding.

- [ ] **Step 11: Commit**

```bash
git add src/pages/Connections.tsx
git commit -m "feat(connections): replace getConnectionsForUser fetch with useConnections live listener"
```

---

## Self-Review Checklist

Spec coverage verified against `docs/superpowers/specs/2026-04-17-realtime-listeners-design.md`:

- [x] `subscribeToMessages` added to `firestore.ts` with `onData`/`onError` callbacks and `onSnapshot` import — Task 1
- [x] `subscribeToConnections` added to `firestore.ts` — Task 1
- [x] `useMessages` hook with Firebase listener, exponential-backoff retry (3 attempts), cleanup on unmount/dep-change, `loading` only true before first data, `error` user-facing string, raw error logged via `console.error`, `refetch` no-op in Firebase mode — Task 2
- [x] `useConnections` hook with same pattern — Task 3
- [x] Falsy input guard: both hooks return early when `connectionId`/`uid` is falsy — Tasks 2 & 3 (the `if (!connectionId)` / `if (!uid)` early returns)
- [x] `retryTimeoutRef` at hook level so cleanup always reaches pending timeout — Tasks 2 & 3
- [x] Cleanup calls `clearTimeout` then `unsubscribe()` — Tasks 2 & 3
- [x] Chat.tsx: removes `messages` state and `getMessages` call; adds `useMessages`; updates `handleSend`; adds error banner; combines `loading || messagesLoading` — Task 4
- [x] Connections.tsx: removes `connections` state, `loading` state, and fetch `useEffect`; adds `useConnections`; updates all three handlers; adds error banner — Task 5
- [x] Demo mode: one-time fetch on mount, `refetch()` callable after mutations — Tasks 2, 3, 4, 5
- [x] Composite index requirements documented in spec (not in code — must be created in Firebase console separately) — out of scope for code tasks
- [x] `dataService.ts` — no changes made — spec says untouched
- [x] Write operations — no changes made — spec says untouched
