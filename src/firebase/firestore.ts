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
  FirestoreError,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import type { UserProfile, Connection, Message } from "../types";

export async function createProfile(
  uid: string,
  data: { email: string; firstName: string; lastName: string }
): Promise<void> {
  if (!db) throw new Error("Firestore not available");
  const profile: UserProfile = {
    uid,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    major: "",
    bio: "",
    classes: [],
    projects: "",
  };
  await setDoc(doc(db, "users", uid), profile);
}

export async function fetchProfile(uid: string): Promise<UserProfile | undefined> {
  if (!db) return undefined;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : undefined;
}

export async function fetchAllProfiles(): Promise<UserProfile[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data() as UserProfile);
}

export async function updateProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  if (!db) throw new Error("Firestore not available");
  await updateDoc(doc(db, "users", uid), data);
}


export async function fetchConnectionsForUser(uid: string): Promise<Connection[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, "connections"));
  return snap.docs
    .map((d) => ({ ...d.data(), id: d.id }) as Connection)
    .filter((c) => c.participants.includes(uid));
}

export async function createConnectionRequest(
  requesterId: string,
  receiverId: string
): Promise<Connection> {
  if (!db) throw new Error("Firestore not available");

  const existing = await fetchConnectionsForUser(requesterId);
  const found = existing.find(
    (c) => c.participants.includes(requesterId) && c.participants.includes(receiverId)
  );
  if (found) return found;

  const conn: Omit<Connection, "id"> = {
    participants: [requesterId, receiverId],
    requesterId,
    status: "pending",
    createdAt: Date.now(),
  };
  const ref = await addDoc(collection(db, "connections"), conn);
  return { ...conn, id: ref.id };
}

export async function acceptConnectionRequest(connectionId: string): Promise<void> {
  if (!db) throw new Error("Firestore not available");
  await updateDoc(doc(db, "connections", connectionId), { status: "active" });
}

export async function declineConnectionRequest(connectionId: string): Promise<void> {
  if (!db) throw new Error("Firestore not available");
  await deleteDoc(doc(db, "connections", connectionId));
}


export async function fetchMessages(connectionId: string): Promise<Message[]> {
  if (!db) return [];
  const q = query(
    collection(db, "messages"),
    where("connectionId", "==", connectionId),
    orderBy("timestamp", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Message);
}

export async function createMessage(
  connectionId: string,
  senderId: string,
  text: string
): Promise<Message> {
  if (!db) throw new Error("Firestore not available");
  const msg: Omit<Message, "id"> = {
    connectionId,
    senderId,
    text,
    timestamp: Date.now(),
  };
  const ref = await addDoc(collection(db, "messages"), msg);
  return { ...msg, id: ref.id };
}

export async function deleteMessages(connectionId: string): Promise<void> {
  if (!db) throw new Error("Firestore not available");
  const q = query(
    collection(db, "messages"),
    where("connectionId", "==", connectionId)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export function subscribeToMessages(
  connectionId: string,
  onData: (msgs: Message[]) => void,
  onError: (err: FirestoreError) => void
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

export function subscribeToConnections(
  uid: string,
  onData: (conns: Connection[]) => void,
  onError: (err: FirestoreError) => void
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
