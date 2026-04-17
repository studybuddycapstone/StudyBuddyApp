# Real-Time Listeners Design

**Goal:** Replace one-time data fetches in Chat and Connections with live Firestore `onSnapshot` listeners, so messages and connection state update automatically without a page refresh.

**Architecture:** Two focused custom React hooks (`useMessages`, `useConnections`) own listener setup, retry logic, and cleanup. Firestore-specific listener wiring lives in two new functions in `firestore.ts`. Components swap their existing fetch calls for the hooks. Demo mode falls back to the existing one-time fetch with a `refetch()` escape hatch for post-mutation updates.

**Tech Stack:** React 18, TypeScript, Firebase Firestore (`onSnapshot`), Vite.

---

## Scope

- `src/firebase/firestore.ts` — add `subscribeToMessages`, `subscribeToConnections`
- `src/hooks/useMessages.ts` — **create**
- `src/hooks/useConnections.ts` — **create**
- `src/pages/Chat.tsx` — swap fetch + state for `useMessages`
- `src/pages/Connections.tsx` — swap fetch + state for `useConnections`

---

## Firestore Layer

Both subscribe functions accept `onData` and `onError` callbacks. Firestore routes all failures (permission errors, missing index errors, network errors) through the `onError` callback — there is no silent failure path. The functions return the Firestore unsubscribe function.

### `subscribeToMessages`

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

### `subscribeToConnections`

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

**Ordering note:** `orderBy("createdAt", "asc")` gives stable, predictable ordering that won't reshuffle on updates. Most-recent-activity sorting (by `updatedAt desc`) is a better long-term default but requires an `updatedAt` field on Connection documents — that belongs in the unread counts spec.

### Required Firestore indexes

Both queries use an equality/array filter combined with `orderBy` on a different field, which requires composite indexes:

| Collection | Fields |
|---|---|
| `messages` | `connectionId ASC`, `timestamp ASC` |
| `connections` | `participants ASC`, `createdAt ASC` |

In a fresh project without these indexes, the first `onSnapshot` call will fail and the error will flow through `onError` — surfacing as "Live updates unavailable" in the UI. Firestore's error message includes a direct link to create the missing index. This is the expected first-run behavior; it is not a silent failure.

---

## Hook Design

Both hooks follow the same structure. Described once; both conform to this pattern.

### Return shape

```ts
{
  data: T[];
  loading: boolean;       // true only until the first successful data callback
  error: string | null;   // user-facing string; raw error always logged to console
  refetch: () => void;    // re-runs fetch in demo mode; documented no-op in Firebase mode
}
```

**`loading` behavior:** `loading` is `true` only before the first data arrives. Once initial data is received, `loading` becomes `false` and stays `false` — retries happen silently in the background. The error string appears only if all retries are exhausted. This prevents UI flicker during transient network hiccups.

**`refetch` in Firebase mode:** `refetch` is always safe to call in both modes. In Firebase mode it is intentionally a no-op — the listener keeps data current automatically. It is documented as such so future developers understand the intent rather than suspecting a bug.

**Raw error logging:** When `onError` fires, the raw error is logged to `console.error` for debugging. The hook's `error` state holds only the user-facing string.

### Invalid input guard

If the key argument (`connectionId` or `uid`) is falsy, the hook returns `{ data: [], loading: false, error: null, refetch: () => {} }` immediately without any Firestore call or listener setup.

When the argument later becomes valid (e.g., `connectionId` goes from `undefined` to a real ID), React's dependency array triggers a new effect run, which sets up the listener correctly. The early return only applies to the current effect invocation.

### Firebase mode behavior

Inside `useEffect` (runs when the key dependency changes):

1. **Guard**: if argument is falsy, return early (see above).
2. Set `loading: true` (only on first run; retries do not reset loading).
3. Declare `retryCount = 0` local to this effect run.
4. Create a `retryTimeoutRef` ref (at hook level, outside the effect) so cleanup can always reach the pending timeout.
5. Define `connect()` — the function that calls `subscribe(arg, onData, onError)` and stores the returned unsubscribe:
   - `onData`: set `data`, set `loading: false`, reset `retryCount` to 0.
   - `onError(err)`: log raw error via `console.error`; call current listener's unsubscribe; increment `retryCount`. If `retryCount < 3`: schedule `retryTimeoutRef.current = setTimeout(connect, 1000 * 2 ** retryCount)`. If `retryCount >= 3`: set `error` to `"Live updates unavailable — reconnect or refresh"`.
6. Call `connect()` to start the listener.
7. **Cleanup** (on unmount or dependency change):
   - `clearTimeout(retryTimeoutRef.current)` — cancels any pending retry.
   - Call active listener's unsubscribe — removes the Firestore listener.
   - This guarantees no orphaned listeners, no stale retries, and no stacked listeners when the dependency changes.

React 18 StrictMode double-invokes effects in development. This is handled correctly: the cleanup between the two invocations unsubscribes the first listener and cancels any pending timeout before the second run begins.

### Demo mode behavior

The `useEffect` calls the existing async fetch once (`getMessages` / `getConnectionsForUser` from `dataService.ts`). Sets `data` and `loading: false`. `refetch` re-runs the same fetch — handlers call this after mutations so the UI stays in sync. No retry logic — local in-memory data cannot fail.

Demo mode makes no attempt to simulate streaming latency or real-time behavior. Users interacting in demo mode are a single actor with no other concurrent users, so the `refetch()` round-trip is imperceptible and sufficient.

### `useMessages(connectionId: string)`

File: `src/hooks/useMessages.ts`

- Dependency: `connectionId`
- Firebase: subscribes via `subscribeToMessages`
- Demo: calls `getMessages(connectionId)`, exposes working `refetch`

### `useConnections(uid: string)`

File: `src/hooks/useConnections.ts`

- Dependency: `uid`
- Firebase: subscribes via `subscribeToConnections`
- Demo: calls `getConnectionsForUser(uid)`, exposes working `refetch`

---

## Component Changes

### `Chat.tsx`

**Remove:**
- `messages` state, `loading` state (for messages)
- `getMessages` call inside `loadChatData`
- The `setMessages([...messages, msg])` append in `handleSend`

**Add import** (not currently in `Chat.tsx`):
```tsx
import { hasFirebaseConfig } from "../firebase/firebaseConfig";
```

**Add hook:**
```tsx
const {
  messages,
  loading: messagesLoading,
  error: messagesError,
  refetch: refetchMessages,
} = useMessages(connectionId ?? "");
```

The combined loading check uses `messagesLoading` alongside the existing connection/otherUser loading.

**`handleSend` update:**
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

In Firebase mode, the listener picks up the new message automatically. In demo mode, `refetchMessages()` re-reads `demoMessages` so the sent message appears.

**Error banner** (shown below the chat header when `messagesError` is non-null):
```tsx
{messagesError && (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
    <p className="text-amber-700 text-xs">{messagesError}</p>
  </div>
)}
```

### `Connections.tsx`

**Remove:**
- `connections` state, `loading` state
- `getConnectionsForUser` call and its surrounding fetch effect

**Add import** (not currently in `Connections.tsx`):
```tsx
import { hasFirebaseConfig } from "../firebase/firebaseConfig";
```

**Add hook:**
```tsx
const {
  connections,
  loading,
  error: connectionsError,
  refetch: refetchConnections,
} = useConnections(user?.uid ?? "");
```

**Handler updates:** Each mutation handler (`handleAccept`, `handleDecline`, `handleRemoveConnection`) calls `refetchConnections()` after its write in demo mode. In Firebase mode, the listener reflects the change automatically:

```tsx
// Pattern applied inside all three handlers, after the await:
if (!hasFirebaseConfig) refetchConnections();
```

**Error banner** (same pattern as Chat, positioned below the page header):
```tsx
{connectionsError && (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
    <p className="text-amber-700 text-xs">{connectionsError}</p>
  </div>
)}
```

---

## Listener Safety Guarantees

- **No stale listeners:** cleanup always unsubscribes the active listener before the effect re-runs or unmounts.
- **No listener stacking:** cleanup fires before the new listener is created when a dependency changes.
- **No orphaned retries:** `clearTimeout` in cleanup cancels any pending retry before it can fire.
- **No unmounted state updates:** cleanup fires on unmount, cancelling both the listener and any pending timeout before they can call `setState`.
- **StrictMode safe:** React 18 double-invocation fires cleanup between the two runs; each run manages its own listener and timeout ref independently.

---

## Future Considerations (Out of Scope Here)

- **Shared base hook:** If 3+ listeners are added, a shared `useFirestoreListener(query, transform)` base hook would eliminate duplication. Not warranted for two hooks.
- **Most-recent-activity ordering for Connections:** Requires `updatedAt` field on Connection documents. Belongs in the unread counts spec.
- **Firestore index creation:** Indexes must be created manually in the Firebase console (or via `firestore.indexes.json`) before deploying to a real project. The app will surface the error clearly; it is not a silent failure.

---

## What Is Not Changing

- `dataService.ts` — no new exports; hooks call `firestore.ts` directly in Firebase mode and `dataService.ts` in demo mode
- All write operations (`sendMessage`, `acceptConnection`, `declineConnection`, `removeConnection`) — unchanged
- `ProfileModal`, `Navbar`, `ProtectedRoute` — untouched
- Demo seed data — untouched
- The `loadChatData` effect in `Chat.tsx` that fetches connection info and the other user's profile — this remains; only the messages fetch is replaced by the hook
