import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getMessages,
  sendMessage,
  getConnectionsForUser,
  getProfile,
} from "../data/dataService";
import type { Message } from "../types";

export default function Chat() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const connections = user ? getConnectionsForUser(user.uid) : [];
  const connection = connections.find(
    (c) => c.id === connectionId && c.status === "active"
  );

  const otherUserId = connection?.participants.find((p) => p !== user?.uid);
  const otherUser = otherUserId ? getProfile(otherUserId) : undefined;

  useEffect(() => {
    if (!connectionId) return;
    setMessages(getMessages(connectionId));
  }, [connectionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !connectionId) return;

    const msg = sendMessage(connectionId, user.uid, newMessage.trim());
    setMessages([...messages, msg]);
    setNewMessage("");
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    const time = date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    if (diffDays === 0) return time;
    if (diffDays === 1) return `Yesterday ${time}`;
    if (diffDays < 7) {
      return `${date.toLocaleDateString([], { weekday: "short" })} ${time}`;
    }
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
  };

  if (!connection || !otherUser) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <p className="text-gray-500 mb-4">Connection not found.</p>
          <button
            onClick={() => navigate("/connections")}
            className="px-6 py-2 bg-green-600 text-white font-medium rounded-full hover:bg-green-700 transition-colors cursor-pointer"
          >
            Back to Connections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 flex flex-col">
      {/* Chat header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/connections")}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-700 font-semibold text-sm">
              {otherUser.firstName[0]}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {otherUser.firstName} {otherUser.lastName}
            </p>
            <p className="text-xs text-gray-500">{otherUser.major}</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">
                Start the conversation! Say hello to {otherUser.firstName}.
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isMine = msg.senderId === user?.uid;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isMine
                      ? "bg-green-600 text-white rounded-br-md"
                      : "bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMine ? "text-green-200" : "text-gray-400"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <form
          onSubmit={handleSend}
          className="max-w-3xl mx-auto flex items-center gap-2"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
