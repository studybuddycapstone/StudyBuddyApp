import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, hasFirebaseConfig } from "../firebase/firebaseConfig";
import { getProfile } from "../data/dataService";
import { DEMO_USER_UID } from "../data/seedData";
import type { UserProfile } from "../types";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  refreshUser: () => Promise<void>;
  loginAsDemo: () => Promise<void>; // CHANGED: Now returns a Promise
  logoutUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDemo: false,
  refreshUser: async () => {},
  loginAsDemo: async () => {}, // CHANGED: Must be async here too
  logoutUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Fetch profile from Firestore for a given UID
  const loadProfile = async (uid: string) => {
    const profile = await getProfile(uid);
    if (profile) {
      setUser(profile);
    }
  };

  const refreshUser = async () => {
    if (firebaseUid) {
      await loadProfile(firebaseUid);
    } else if (isDemo) {
      const profile = await getProfile(DEMO_USER_UID);
      if (profile) setUser(profile);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Try Firebase auth if configured
    if (hasFirebaseConfig && auth) {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          setFirebaseUid(firebaseUser.uid);
          setIsDemo(false);
          await loadProfile(firebaseUser.uid);
        } else {
          setFirebaseUid(null);
          setUser(null);
        }
        setLoading(false);
      });
    }

    // Check for demo session
    const demoSession = localStorage.getItem("studybuddy_demo");
    if (demoSession === "true") {
      getProfile(DEMO_USER_UID).then((profile) => {
        if (profile) {
          setUser(profile);
          setIsDemo(true);
        }
        setLoading(false);
      });
    } else if (!hasFirebaseConfig) {
      // No Firebase and no demo session - stop loading
      setLoading(false);
    }

    return () => unsubscribe?.();
  }, []);

  // CHANGED: Made this async and used 'await' so the Login page actually waits for it to finish!
  const loginAsDemo = async () => {
    const profile = await getProfile(DEMO_USER_UID);
    if (profile) {
      setUser(profile);
      setIsDemo(true);
      localStorage.setItem("studybuddy_demo", "true");
    }
  };

  const logoutUser = () => {
    setUser(null);
    setFirebaseUid(null);
    setIsDemo(false);
    localStorage.removeItem("studybuddy_demo");
    auth?.signOut().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, refreshUser, loginAsDemo, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}