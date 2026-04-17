import { useEffect } from "react";
import type { UserProfile } from "../types";

interface Props {
  profile: UserProfile;
  onClose: () => void;
}

export default function ProfileModal({ profile, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-green-700 font-semibold text-xl">
              {profile.firstName.charAt(0) || "?"}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {profile.firstName} {profile.lastName}
            </h2>
            {profile.major && (
              <p className="text-sm text-green-600 font-medium">{profile.major}</p>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm text-gray-600 mb-4">{profile.bio}</p>
        )}

        {profile.classes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Classes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.classes.map((cls) => (
                <span
                  key={cls}
                  className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full"
                >
                  {cls}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.projects && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
              Projects
            </p>
            <p className="text-sm text-gray-600">{profile.projects}</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gray-100 text-gray-700 font-medium rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
