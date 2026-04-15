import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getMatches, sendConnectionRequest } from "../data/dataService";
import type { UserProfile } from "../types";

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<(UserProfile & { sharedClasses: string[] })[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMatches(user.uid).then((result) => {
      setMatches(result);
      setLoading(false);
    });
  }, [user]);

  const handleConnect = async (matchUid: string) => {
    if (!user) return;
    await sendConnectionRequest(user.uid, matchUid);
    setSentRequests(new Set([...sentRequests, matchUid]));
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
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-green-700 font-semibold text-lg">
                        {match.firstName[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {match.firstName} {match.lastName}
                      </h3>
                      <p className="text-sm text-green-600 font-medium">{match.major}</p>
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
                  </div>

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
    </div>
  );
}
