import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getProfile, saveProfile } from "../data/dataService";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [major, setMajor] = useState("");
  const [bio, setBio] = useState("");
  const [projects, setProjects] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [newClass, setNewClass] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProfile(user.uid).then((profile) => {
      if (profile) {
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setMajor(profile.major);
        setBio(profile.bio);
        setProjects(profile.projects);
        setClasses(profile.classes);
      }
    });
  }, [user]);

  const handleAddClass = () => {
    const trimmed = newClass.trim().toUpperCase();
    if (!trimmed || classes.includes(trimmed)) return;
    setClasses([...classes, trimmed]);
    setNewClass("");
  };

  const handleRemoveClass = (cls: string) => {
    setClasses(classes.filter((c) => c !== cls));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await saveProfile(user.uid, {
      firstName,
      lastName,
      major,
      bio,
      projects,
      classes,
    });
    await refreshUser();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-green-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">My Profile</h1>
        <p className="text-gray-500 mb-8">
          Keep your profile updated so study partners can find you.
        </p>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Personal Info</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Major
              </label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell study partners about yourself..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projects
              </label>
              <textarea
                value={projects}
                onChange={(e) => setProjects(e.target.value)}
                placeholder="List your software projects (comma-separated)"
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">My Classes</h2>
            <p className="text-sm text-gray-500">
              Add your current semester classes to find matching study partners.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddClass())}
                placeholder="e.g. CSC 4351"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddClass}
                className="px-5 py-3 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => (
                <span
                  key={cls}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 text-sm font-medium rounded-full"
                >
                  {cls}
                  <button
                    type="button"
                    onClick={() => handleRemoveClass(cls)}
                    className="w-4 h-4 flex items-center justify-center text-green-600 hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none text-xs"
                  >
                    x
                  </button>
                </span>
              ))}
              {classes.length === 0 && (
                <p className="text-sm text-gray-400 italic">No classes added yet</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
            {saved && (
              <span className="text-green-600 text-sm font-medium">
                Profile saved!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
