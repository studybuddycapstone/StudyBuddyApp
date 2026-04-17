# Real-Time Listeners Design

**Goal:** Replace one-time data fetches in Chat and Connections with live Firestore `onSnapshot` listeners, so messages and connection state update automatically without a page refresh.

**Architecture:** Two focused custom React hooks (`useMessages`, `useConnections`) own listener setup, retry logic, and cleanup. Firestore-specific listener wiring lives in two new functions in `firestore.ts`. Components swap their existing fetch calls for the hooks. Demo mode falls back to the existing one-time fetch — no behavior change.

**Tech Stack:** React 18, TypeScript, Firebase Firestore (`onSnapshot`), Vite.

---

## Scope

- `src/firebase/firestore.ts` — add `subscribeToMessages`, `subscribeToConnections`
- `src/hooks/useMessages.ts` — **create**
- `src/hooks/useConnections.ts` — **create**
- `src/pages/Chat.tsx` — swap fetch + state for `useMessages`
- `src/pages/Connections.tsx` — swap fetch + state for `useConnections`

Demo mode behavior is unchanged: falls back to `getMessages` / `getConnectionsForUser` from `dataService.ts`.

---

## Firestore Layer

### `subscribeToMessages(connectionId, callback): () => void`

Sets up an `onSnapshot` listener on the `messages` collection filtered by `connectionId`, ordered by `timestamp` ascending. Calls `callback(messages)` on every push. Returns the Firestore unsubscribe function. Does not handle errors — callers own retry logic.

```ts
export function subscribeToMessages(
  connectionId: string,
  callback: (msgs: Message[]) => void
): () => void {
  if (!db) return () => {};
  const q = query(
    collection(db, "messages"),
    where("connectionId", "==", connectionId),
    orderBy("timestamp", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
  });
}
```

### `subscribeToConnections(uid, callback): () => void`

Sets up an `onSnapshot` listener on the `connections` collection filtered to documents where `participants` array contains `uid`. Calls `callback(connections)` on every push. Returns unsubscribe.

```ts
export function subscribeToConnections(
  uid: string,
  callback: (conns: Connection[]) => void
): () => void {
  if (!db) return () => {};
  const q = query(
    collection(db, "connections"),
    where("participants", "array-contains", uid)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Connection)));
  });
}
```

---

## Hook Design

Both hooks follow the same structure. Described once; both conform to this pattern.

### Return shape

```ts
{
  data: T[];        // messages or connections
  loading: boolean;
  error: string | null;
}
```

### Firebase mode behavior

1. `useEffect` runs when the key dependency changes (`connectionId` or `uid`).
2. Calls the subscribe function, storing the unsubscribe reference.
3. On successful callback: sets `data`, sets `loading: false`, resets retry counter to 0.
4. On `onSnapshot` error:
   - Calls unsubscribe on the failed listener.
   - Increments retry counter.
   - If retry count < 3: waits with exponential backoff (`1000ms * 2^retryCount`) then re-establishes the listener.
   - If retry count ≥ 3: sets `error` to `"Live updates unavailable — reconnect or refresh"`, stops retrying.
5. Cleanup: calls unsubscribe on unmount or dependency change. Cancels any pending retry timeout.

### Demo mode behavior

`useEffect` calls the existing `getMessages` / `getConnectionsForUser` from `dataService.ts` once. Sets `data` from the result and `loading: false`. No retry logic — local data cannot fail.

### `useMessages(connectionId: string)`

File: `src/hooks/useMessages.ts`

- Dependency: `connectionId`
- Subscribes via `subscribeToMessages`
- Demo fallback: `getMessages(connectionId)`

### `useConnections(uid: string)`

File: `src/hooks/useConnections.ts`

- Dependency: `uid`
- Subscribes via `subscribeToConnections`
- Demo fallback: `getConnectionsForUser(uid)`

---

## Component Changes

### `Chat.tsx`

- Remove `messages` and `loading` state declarations.
- Remove `getMessages` call from `loadChatData`.
- Add: `const { messages, loading: messagesLoading, error: messagesError } = useMessages(connectionId ?? "");`
- The combined `loading` check (connection + other user + messages) uses `messagesLoading` for the messages part.
- `handleSend` no longer appends to `setMessages` — the listener reflects new messages automatically.
- If `messagesError` is non-null: render a small amber banner below the chat header: `"Live updates unavailable — reconnect or refresh"`.

### `Connections.tsx`

- Remove `connections` and `loading` state declarations.
- Remove `getConnectionsForUser` call from the fetch effect.
- Add: `const { connections, loading, error: connectionsError } = useConnections(user?.uid ?? "");`
- `handleAccept`, `handleDecline`, `handleRemoveConnection` no longer need to call `setConnections` — the listener automatically reflects changes written to Firestore.
- If `connectionsError` is non-null: render the same amber banner below the page header.

> **Demo mode note:** In demo mode, accept/decline/remove still mutate local in-memory state directly (via `dataService`). The hook's one-time fetch does not re-run after mutations. Each handler wraps its `setConnections` call in `if (!hasFirebaseConfig)` so state is updated manually in demo mode but skipped in Firebase mode (where the listener reflects the change automatically).

---

## Error Banner

Both pages use the same pattern when `error` is non-null:

```tsx
{error && (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
    <p className="text-amber-700 text-xs">{error}</p>
  </div>
)}
```

Positioned: below the page/chat header, above the main content area.

---

## What Is Not Changing

- `dataService.ts` — no new exports needed; hooks call `firestore.ts` directly for Firebase mode
- `ProfileModal`, `Navbar`, `ProtectedRoute` — untouched
- `sendMessage`, `acceptConnection`, `declineConnection`, `removeConnection` in `dataService.ts` — untouched; writes still go through the existing service
- Demo mode data or seed data — untouched
