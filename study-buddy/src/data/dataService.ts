import type { UserProfile, Connection, Message } from "../types";
import {
  seedProfiles,
  seedConnections,
  seedMessages,
  DEMO_USER_UID,
} from "./seedData";

let profiles = [...seedProfiles];
let connections = [...seedConnections];
let messages = [...seedMessages];

// --- Profile operations ---

export function getCurrentUserId(): string {
  return DEMO_USER_UID;
}

export function getProfile(uid: string): UserProfile | undefined {
  return profiles.find((p) => p.uid === uid);
}

export function getAllProfiles(): UserProfile[] {
  return profiles;
}

export function saveProfile(uid: string, data: Partial<UserProfile>): void {
  const idx = profiles.findIndex((p) => p.uid === uid);
  if (idx !== -1) {
    profiles[idx] = { ...profiles[idx], ...data };
  }
}

// --- Matching ---

export function getMatches(uid: string): (UserProfile & { sharedClasses: string[] })[] {
  const currentUser = getProfile(uid);
  if (!currentUser) return [];

  const connectedUids = new Set(
    connections
      .filter((c) => c.participants.includes(uid))
      .flatMap((c) => c.participants)
  );

  return profiles
    .filter((p) => p.uid !== uid && !connectedUids.has(p.uid))
    .map((p) => ({
      ...p,
      sharedClasses: p.classes.filter((c) => currentUser.classes.includes(c)),
    }))
    .filter((p) => p.sharedClasses.length > 0)
    .sort((a, b) => b.sharedClasses.length - a.sharedClasses.length);
}

// --- Connection operations ---

export function getConnectionsForUser(uid: string): Connection[] {
  return connections.filter((c) => c.participants.includes(uid));
}

export function sendConnectionRequest(requesterId: string, receiverId: string): Connection {
  const existing = connections.find(
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
  connections.push(conn);
  return conn;
}

export function acceptConnection(connectionId: string): void {
  const conn = connections.find((c) => c.id === connectionId);
  if (conn) conn.status = "active";
}

export function declineConnection(connectionId: string): void {
  connections = connections.filter((c) => c.id !== connectionId);
}

// --- Message operations ---

export function getMessages(connectionId: string): Message[] {
  return messages
    .filter((m) => m.connectionId === connectionId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function sendMessage(connectionId: string, senderId: string, text: string): Message {
  const msg: Message = {
    id: `msg-${Date.now()}`,
    connectionId,
    senderId,
    text,
    timestamp: Date.now(),
  };
  messages.push(msg);
  return msg;
}
