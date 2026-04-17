import type { UserProfile, Connection, Message } from "../types";
import { hasFirebaseConfig } from "../firebase/firebaseConfig";
import {
  fetchProfile,
  fetchAllProfiles,
  updateProfile,
  fetchConnectionsForUser,
  createConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  fetchMessages,
  createMessage,
} from "../firebase/firestore";
import {
  seedProfiles,
  seedConnections,
  seedMessages,
  DEMO_USER_UID,
} from "./seedData";

// --- Local demo state (only used in demo mode) ---

const demoProfiles = [...seedProfiles];
let demoConnections = [...seedConnections];
const demoMessages = [...seedMessages];

export { DEMO_USER_UID };

// --- Profile operations ---

export async function getProfile(uid: string): Promise<UserProfile | undefined> {
  if (hasFirebaseConfig) {
    return fetchProfile(uid);
  }
  return demoProfiles.find((p) => p.uid === uid);
}

export async function getAllProfiles(): Promise<UserProfile[]> {
  if (hasFirebaseConfig) {
    return fetchAllProfiles();
  }
  return demoProfiles;
}

export async function saveProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  if (hasFirebaseConfig) {
    await updateProfile(uid, data);
    return;
  }
  const idx = demoProfiles.findIndex((p) => p.uid === uid);
  if (idx !== -1) {
    demoProfiles[idx] = { ...demoProfiles[idx], ...data };
  }
}

// --- Matching ---

export async function getMatches(
  uid: string
): Promise<(UserProfile & { sharedClasses: string[] })[]> {
  const [currentUser, allProfiles, connections] = await Promise.all([
    getProfile(uid),
    getAllProfiles(),
    getConnectionsForUser(uid),
  ]);
  if (!currentUser) return [];

  const connectedUids = new Set(
    connections
      .filter((c) => c.participants.includes(uid))
      .flatMap((c) => c.participants)
  );

  return allProfiles
    .filter((p) => p.uid !== uid && !connectedUids.has(p.uid))
    .map((p) => ({
      ...p,
      sharedClasses: p.classes.filter((c) => currentUser.classes.includes(c)),
    }))
    .filter((p) => p.sharedClasses.length > 0)
    .sort((a, b) => b.sharedClasses.length - a.sharedClasses.length);
}

// --- Connection operations ---

export async function getConnectionsForUser(uid: string): Promise<Connection[]> {
  if (hasFirebaseConfig) {
    return fetchConnectionsForUser(uid);
  }
  return demoConnections.filter((c) => c.participants.includes(uid));
}

export async function sendConnectionRequest(
  requesterId: string,
  receiverId: string
): Promise<Connection> {
  if (hasFirebaseConfig) {
    return createConnectionRequest(requesterId, receiverId);
  }
  const existing = demoConnections.find(
    (c) =>
      c.participants.includes(requesterId) &&
      c.participants.includes(receiverId)
  );
  if (existing) return existing;

  const conn: Connection = {
    id: `conn-${Date.now()}`,
    participants: [requesterId, receiverId],
    requesterId,
    status: "pending",
    createdAt: Date.now(),
  };
  demoConnections.push(conn);
  return conn;
}

export async function acceptConnection(connectionId: string): Promise<void> {
  if (hasFirebaseConfig) {
    await acceptConnectionRequest(connectionId);
    return;
  }
  const conn = demoConnections.find((c) => c.id === connectionId);
  if (conn) conn.status = "active";
}

export async function declineConnection(connectionId: string): Promise<void> {
  if (hasFirebaseConfig) {
    await declineConnectionRequest(connectionId);
    return;
  }
  demoConnections = demoConnections.filter((c) => c.id !== connectionId);
}

// --- Message operations ---

export async function getMessages(connectionId: string): Promise<Message[]> {
  if (hasFirebaseConfig) {
    return fetchMessages(connectionId);
  }
  return demoMessages
    .filter((m) => m.connectionId === connectionId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function sendMessage(
  connectionId: string,
  senderId: string,
  text: string
): Promise<Message> {
  if (hasFirebaseConfig) {
    return createMessage(connectionId, senderId, text);
  }
  const msg: Message = {
    id: `msg-${Date.now()}`,
    connectionId,
    senderId,
    text,
    timestamp: Date.now(),
  };
  demoMessages.push(msg);
  return msg;
}
