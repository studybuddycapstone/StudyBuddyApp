export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  major: string;
  bio: string;
  classes: string[];
  projects: string;
}

export interface Connection {
  id: string;
  participants: [string, string];
  requesterId: string;
  status: "pending" | "active";
  createdAt: number;
}

export interface Message {
  id: string;
  connectionId: string;
  senderId: string;
  text: string;
  timestamp: number;
}
