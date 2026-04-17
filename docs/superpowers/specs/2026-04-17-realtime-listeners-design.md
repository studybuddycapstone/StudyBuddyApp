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

Both subscribe functions accept an `onData` and `onError` callback so the hook's retry logic is reachable. They return the Firestore unsubscribe function.

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

`orderBy("createdAt", "asc")` gives stable, predictable ordering that won't reshuffle on updates.

---

## Hook Design

Both hooks follow the same structure. Described once; both conform to this pattern.

### Return shape

```ts
{
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;  // no-op in Firebase mode; re-runs fetch in demo mode
}
```

### Invalid input guard

If the key argument (`connectionId` or `uid`) is falsy, the hook returns `{ data: [], loading: false, error: null, refetch: () => {} }` immediately without setting up any listener or making any Firestore call.

### Firebase mode behavior

Inside `useEffect` (runs when the key dependency changes):

1. **Guard**: if argument is falsy, return early (see above).
2. Set `loading: true`, `error: null`.
3. Create a `retryCount` local variable (scoped to this effect run).
4. Declare an `unsubscribeRef` to track the active listener.
5. Declare a `retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>()` at the hook level (not inside the effect) so cleanup can always reach it.
6. Call `subscribe(arg, onData, onError)`:
   - `onData`: set `data`, set `loading: false`, reset `retryCount` to 0.
   - `onError`: call the current listener's unsubscribe, increment `retryCount`. If `retryCount < 3`: schedule retry via `retryTimeoutRef.current = setTimeout(resubscribe, 1000 * 2 ** retryCount)`. If `retryCount >= 3`: set `error` to `"Live updates unavailable — reconnect or refresh"`, stop.
7. **Cleanup** (on unmount or dependency change): call `clearTimeout(retryTimeoutRef.current)` then call the active listener's unsubscribe. This guarantees:
   - No pending retry can fire after the component unmounts.
   - No stale listener persists when the key argument changes.
   - No two listeners are ever active simultaneously.

### Demo mode behavior

The `useEffect` calls the existing async fetch once (`getMessages` / `getConnectionsForUser` from `dataService.ts`). Sets `data` and `loading: false`. Exposes a `refetch` function that re-runs the same fetch — handlers call this after mutations so the UI stays in sync.

No retry logic — local in-memory data cannot fail.

### `useMessages(connectionId: string)`

File: `src/hooks/useMessages.ts`

- Dependency: `connectionId`
- Firebase: subscribes via `subscribeToMessages`
- Demo: calls `getMessages(connectionId)`, exposes `refetch`

### `useConnections(uid: string)`

File: `src/hooks/useConnections.ts`

- Dependency: `uid`
- Firebase: subscribes via `subscribeToConnections`
- Demo: calls `getConnectionsForUser(uid)`, exposes `refetch`

---

## Component Changes

### `Chat.tsx`

**Remove:**
- `messages` state, `loading` state (for messages)
- `getMessages` call inside `loadChatData`
- The `setMessages([...messages, msg])` append in `handleSend`

**Add import** (not currently in Chat.tsx):
```tsx
import { hasFirebaseConfig } from "../firebase/firebaseConfig";
```

**Add hook:**
```tsx
const { messages, loading: messagesLoading, error: messagesError, refetch: refetchMessages } = useMessages(connectionId ?? "");
```

The combined loading check uses `messagesLoading` for the messages part alongside the existing connection/otherUser loading.

**`handleSend` update:** In Firebase mode, the listener picks up the new message automatically — no manual append. In demo mode, call `refetchMessages()` after `sendMessage()` resolves so the sent message appears:

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

**Error banner** (if `messagesError` is non-null, shown below the chat header):

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

**Add import** (not currently in Connections.tsx):
```tsx
import { hasFirebaseConfig } from "../firebase/firebaseConfig";
```

**Add hook:**
```tsx
const { connections, loading, error: connectionsError, refetch: refetchConnections } = useConnections(user?.uid ?? "");
```

**Handler updates:** Each mutation handler (`handleAccept`, `handleDecline`, `handleRemoveConnection`) calls `refetchConnections()` after its operation in demo mode. In Firebase mode, the listener reflects the change automatically:

```tsx
// Pattern applied to all three handlers:
await declineConnection(connectionId);
if (!hasFirebaseConfig) refetchConnections();
```

**Error banner** (same pattern as Chat, positioned below the page header).

---

## Listener Safety Guarantees

- **No stale listeners**: cleanup always unsubscribes the active listener before the effect re-runs.
- **No stacking**: the unsubscribe from the previous effect run fires before the new listener is created.
- **No orphaned retries**: `clearTimeout` in cleanup cancels any pending retry before it fires.
- **No unmounted state updates**: cleanup fires on unmount, cancelling both the listener and any pending timeout.

---

## What Is Not Changing

- `dataService.ts` — no new exports; hooks call `firestore.ts` directly in Firebase mode and `dataService.ts` in demo mode
- All write operations (`sendMessage`, `acceptConnection`, `declineConnection`, `removeConnection`) — unchanged
- `ProfileModal`, `Navbar`, `ProtectedRoute` — untouched
- Demo seed data — untouched
- The existing `loadChatData` effect in Chat that fetches connection info and other user's profile — this remains; only the messages fetch is replaced
