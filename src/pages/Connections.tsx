import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  getConnectionsForUser,
  getProfile,
  acceptConnection,
  declineConnection,
} from "../data/dataService";
import type { Connection, UserProfile } from "../types";
import ProfileModal from "../components/ProfileModal";

export default function Connections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [profileCache, setProfileCache] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    getConnectionsForUser(user.uid).then(async (conns) => {
      setConnections(conns);

      // Fetch profiles for all other participants
      const otherUids = conns
        .flatMap((c) => c.participants)
        .filter((uid) => uid !== user.uid);
      const unique = [...new Set(otherUids)];
      const profiles = await Promise.all(unique.map((uid) => getProfile(uid)));
      const cache: Record<string, UserProfile> = {};
      profiles.forEach((p) => {
        if (p) cache[p.uid] = p;
      });
      setProfileCache(cache);
      setLoading(false);
    });
  }, [user]);

  const incoming = connections.filter(
    (c) => c.status === "pending" && c.requesterId !== user?.uid
  );
  const outgoing = connections.filter(
    (c) => c.status === "pending" && c.requesterId === user?.uid
  );
  const active = connections.filter((c) => c.status === "active");

  const getOtherUser = (participants: [string, string]) => {
    const otherId = participants.find((p) => p !== user?.uid) || "";
    return profileCache[otherId];
  };

  const handleAccept = async (connectionId: string) => {
    await acceptConnection(connectionId);
    setConnections((prev) =>
      prev.map((c) => (c.id === connectionId ? { ...c, status: "active" } : c))
    );
  };

  const handleDecline = async (connectionId: string) => {
    await declineConnection(connectionId);
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <p className="text-gray-500">Loading connections...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Connections</h1>
        <p className="text-gray-500 mb-8">
          Manage your study buddy requests and active connections.
        </p>

        {incoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Incoming Requests ({incoming.length})
            </h2>
            <div className="space-y-3">
              {incoming.map((conn) => {
                const other = getOtherUser(conn.participants);
                if (!other) return null;
                return (
                  <div
                    key={conn.id}
                    className="bg-white rounded-xl p-5 shadow-sm border border-green-200 flex items-center justify-between"
                  >
                    <button
                      type="button"
                      className="flex items-center gap-3 cursor-pointer text-left bg-transparent border-none p-0"
                      onClick={() => setSelectedProfile(other)}
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-700 font-semibold">
                          {other.firstName.charAt(0) || "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {other.firstName} {other.lastName}
                        </p>
                        {other.major && <p className="text-sm text-gray-500">{other.major}</p>}
                      </div>
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(conn.id)}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-full hover:bg-green-700 transition-colors cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(conn.id)}
                        className="px-4 py-2 bg-white text-red-500 text-sm font-medium rounded-full border border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Sent Requests ({outgoing.length})
            </h2>
            <div className="space-y-3">
              {outgoing.map((conn) => {
                const other = getOtherUser(conn.participants);
                if (!other) return null;
                return (
                  <div
                    key={conn.id}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between"
                  >
                    <button
                      type="button"
                      className="flex items-center gap-3 cursor-pointer text-left bg-transparent border-none p-0"
                      onClick={() => setSelectedProfile(other)}
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-semibold">
                          {other.firstName.charAt(0) || "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {other.firstName} {other.lastName}
                        </p>
                        {other.major && <p className="text-sm text-gray-500">{other.major}</p>}
                      </div>
                    </button>
                    <span className="text-sm text-gray-400 font-medium">Pending</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Active Connections ({active.length})
          </h2>
          {active.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
              <p className="text-gray-500">
                No active connections yet. Find matches and send requests!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((conn) => {
                const other = getOtherUser(conn.participants);
                if (!other) return null;
                return (
                  <div
                    key={conn.id}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between"
                  >
                    <button
                      type="button"
                      className="flex items-center gap-3 cursor-pointer text-left bg-transparent border-none p-0"
                      onClick={() => setSelectedProfile(other)}
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-700 font-semibold">
                          {other.firstName.charAt(0) || "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {other.firstName} {other.lastName}
                        </p>
                        {other.major && <p className="text-sm text-gray-500">{other.major}</p>}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {other.classes
                            .filter((c) => user?.classes.includes(c))
                            .map((cls) => (
                              <span
                                key={cls}
                                className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full"
                              >
                                {cls}
                              </span>
                            ))}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => navigate(`/chat/${conn.id}`)}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-full hover:bg-green-700 transition-colors cursor-pointer"
                    >
                      Message
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}
