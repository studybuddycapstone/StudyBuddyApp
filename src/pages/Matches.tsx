import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { getMatches, sendConnectionRequest } from "../data/dataService";
import type { UserProfile } from "../types";
import ProfileModal from "../components/ProfileModal";

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<(UserProfile & { sharedClasses: string[] })[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    (async () => {
      try {
        const result = await getMatches(user.uid);
        if (mounted) {
          setMatches(result);
          setError(null);
        }
      } catch (err) {
        console.error("Failed to load matches:", err);
        if (mounted) {
          setMatches([]);
          setError("Failed to load matches. Please try again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleConnect = async (matchUid: string) => {
    const normalizedMatchUid = matchUid.trim();
    if (!user || !normalizedMatchUid) return;
    try {
      await sendConnectionRequest(normalizedMatchUid);
      setSentRequests(new Set([...sentRequests, normalizedMatchUid]));
      setError(null);
    } catch (err) {
      console.error("Failed to send connection request:", err);
      setError("Failed to send request. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <p className="text-gray-500">Loading matches...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Find Study Partners</h1>
        <p className="text-gray-500 mb-8">
          Students who share classes with you, ranked by the most overlap.
        </p>

        {error && (
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg mb-4 text-center">
            <p className="text-amber-700 text-xs">{error}</p>
          </div>
        )}

        {matches.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">No matches yet</h3>
            <p className="text-sm text-gray-500">
              Add more classes to your profile to find study partners.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.uid}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <button
                    type="button"
                    className="flex items-start gap-4 cursor-pointer text-left bg-transparent border-none p-0 w-full"
                    onClick={() => setSelectedProfile(match)}
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-green-700 font-semibold text-lg">
                        {match.firstName.charAt(0) || "?"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 hover:text-green-700 transition-colors">
                        {match.firstName} {match.lastName}
                      </h3>
                      {match.major && <p className="text-sm text-green-600 font-medium">{match.major}</p>}
                      <p className="text-sm text-gray-500 mt-1">{match.bio}</p>

                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                          Shared Classes
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {match.sharedClasses.map((cls) => (
                            <span
                              key={cls}
                              className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full"
                            >
                              {cls}
                            </span>
                          ))}
                        </div>
                      </div>

                      {match.projects && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                            Projects
                          </p>
                          <p className="text-sm text-gray-600">{match.projects}</p>
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => handleConnect(match.uid)}
                    disabled={sentRequests.has(match.uid)}
                    className={`shrink-0 px-5 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                      sentRequests.has(match.uid)
                        ? "bg-gray-100 text-gray-400 cursor-default"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {sentRequests.has(match.uid) ? "Request Sent" : "Connect"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
