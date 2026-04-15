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
  loginAsDemo: () => void;
  logoutUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDemo: false,
  loginAsDemo: () => {},
  logoutUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Try Firebase auth if configured
    if (hasFirebaseConfig && auth) {
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          const profile = getProfile(firebaseUser.uid);
          if (profile) {
            setUser(profile);
            setIsDemo(false);
          }
        }
        setLoading(false);
      });
    }

    // Check for demo session
    const demoSession = localStorage.getItem("studybuddy_demo");
    if (demoSession === "true") {
      const profile = getProfile(DEMO_USER_UID);
      if (profile) {
        setUser(profile);
        setIsDemo(true);
      }
      setLoading(false);
    } else if (!hasFirebaseConfig) {
      // No Firebase and no demo session - stop loading
      setLoading(false);
    }

    return () => unsubscribe?.();
  }, []);

  const loginAsDemo = () => {
    const profile = getProfile(DEMO_USER_UID);
    if (profile) {
      setUser(profile);
      setIsDemo(true);
      localStorage.setItem("studybuddy_demo", "true");
    }
  };

  const logoutUser = () => {
    setUser(null);
    setIsDemo(false);
    localStorage.removeItem("studybuddy_demo");
    auth?.signOut().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, loginAsDemo, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
