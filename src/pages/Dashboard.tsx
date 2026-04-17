import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getConnectionsForUser } from "../data/dataService";
import type { Connection } from "../types";

const cards = [
  {
    title: "My Profile",
    description: "Update your bio, classes, and projects",
    path: "/profile",
    icon: (
      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    title: "Find Matches",
    description: "Discover study partners in your classes",
    path: "/matches",
    icon: (
      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: "Connections",
    description: "Manage your study buddy connections",
    path: "/connections",
    icon: (
      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    if (!user) return;
    getConnectionsForUser(user.uid).then(setConnections);
  }, [user]);

  const activeCount = connections.filter((c) => c.status === "active").length;
  const pendingCount = connections.filter(
    (c) => c.status === "pending" && c.requesterId !== user?.uid
  ).length;

  return (
    <div className="min-h-screen bg-green-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-500 mt-1">
            Here's your study hub. What would you like to do today?
          </p>
        </div>

        {pendingCount > 0 && (
          <div
            onClick={() => navigate("/connections")}
            className="mb-6 p-4 bg-green-100 border border-green-200 rounded-xl cursor-pointer hover:bg-green-150 transition-colors"
          >
            <p className="text-green-800 font-medium">
              You have {pendingCount} pending connection request{pendingCount > 1 ? "s" : ""}!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {cards.map((card) => (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-left border border-gray-100 cursor-pointer"
            >
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                {card.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{card.title}</h3>
              <p className="text-sm text-gray-500">{card.description}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Active Connections</p>
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Your Classes</p>
            <p className="text-3xl font-bold text-green-600">{user?.classes.length || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
