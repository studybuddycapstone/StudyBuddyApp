import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  getProfile,
  acceptConnection,
  declineConnection,
} from "../data/dataService";
import { hasFirebaseConfig } from "../firebase/firebaseConfig";
import { useConnections } from "../hooks/useConnections";
import type { UserProfile } from "../types";
import ProfileModal from "../components/ProfileModal";

export default function Connections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileCache, setProfileCache] = useState<Record<string, UserProfile>>({});
  const profileCacheRef = useRef<Record<string, UserProfile>>({});
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    connections,
    loading,
    error: connectionsError,
    refetch: refetchConnections,
  } = useConnections(user?.uid ?? "");

  useEffect(() => {
    if (!user || connections.length === 0) return;

    const otherUids = connections
      .flatMap((c) => c.participants)
      .filter((uid) => uid !== user.uid);
    const unique = [...new Set(otherUids)];
    const newUids = unique.filter((uid) => !profileCacheRef.current[uid]);
    if (newUids.length === 0) return;

    Promise.all(newUids.map((uid) => getProfile(uid)))
      .then((profiles) => {
        const updates: Record<string, UserProfile> = {};
        profiles.forEach((p) => { if (p) updates[p.uid] = p; });
        profileCacheRef.current = { ...profileCacheRef.current, ...updates };
        setProfileCache(profileCacheRef.current);
      })
      .catch((err) => {
        console.error("Failed to fetch connection profiles:", err);
      });
  }, [user, connections]);

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
    try {
      await acceptConnection(connectionId);
      if (!hasFirebaseConfig) refetchConnections();
      setActionError(null);
    } catch (err) {
      console.error("Failed to accept request:", err);
      setActionError("Failed to accept request. Please try again.");
    }
  };

  const handleDecline = async (connectionId: string) => {
    try {
      await declineConnection(connectionId);
      if (!hasFirebaseConfig) refetchConnections();
      setActionError(null);
    } catch (err) {
      console.error("Failed to decline request:", err);
      setActionError("Failed to decline request. Please try again.");
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (!confirm("Remove this connection? This cannot be undone.")) return;
    setRemoving(connectionId);
    try {
      await declineConnection(connectionId);
      if (!hasFirebaseConfig) refetchConnections();
      setActionError(null);
    } catch (err) {
      console.error("Failed to remove connection:", err);
      setActionError("Failed to remove connection. Please try again.");
    } finally {
      setRemoving(null);
    }
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

        {connectionsError && (
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg mb-4 text-center">
            <p className="text-amber-700 text-xs">{connectionsError}</p>
          </div>
        )}
        {actionError && (
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg mb-4 text-center">
            <p className="text-amber-700 text-xs">{actionError}</p>
          </div>
        )}

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
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/chat/${conn.id}`)}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-full hover:bg-green-700 transition-colors cursor-pointer"
                      >
                        Message
                      </button>
                      <button
                        onClick={() => handleRemoveConnection(conn.id)}
                        disabled={removing === conn.id}
                        className="px-4 py-2 bg-white text-red-500 text-sm font-medium rounded-full border border-red-200 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {removing === conn.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
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
