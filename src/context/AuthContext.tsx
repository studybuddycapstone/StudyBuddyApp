import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, hasFirebaseConfig } from "../firebase/firebaseConfig";
import { getProfile } from "../data/dataService";
import { DEMO_USER_UID, seedProfiles } from "../data/seedData";
import type { UserProfile } from "../types";
import { AuthContext } from "./useAuth";

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

    // Check for demo session on page reload
    const demoSession = localStorage.getItem("studybuddy_demo");
    if (demoSession === "true") {
      // Try DB first, fallback to seedData
      getProfile(DEMO_USER_UID).then((profile) => {
        const activeProfile = profile || seedProfiles.find(p => p.uid === DEMO_USER_UID);
        if (activeProfile) {
          setUser(activeProfile);
          setIsDemo(true);
        }
        setLoading(false);
      });
    } else if (!hasFirebaseConfig) {
      setLoading(false);
    }

    return () => unsubscribe?.();
  }, []);

  const loginAsDemo = async () => {
    try {
      // 1. Try to get it from the live Firestore database
      let profile = await getProfile(DEMO_USER_UID);
      
      // 2. If it's not in the DB, find it in your seedProfiles array!
      // FIX: Removed '|| null' because .find() returns undefined naturally,
      // which aligns with the TypeScript inferred type from getProfile()
      if (!profile) {
        console.warn("Demo user not in DB. Falling back to seedData.");
        profile = seedProfiles.find(p => p.uid === DEMO_USER_UID);
      }

      // 3. Set the user and route to dashboard
      if (profile) {
        setUser(profile);
        setIsDemo(true);
        localStorage.setItem("studybuddy_demo", "true");
      } else {
        throw new Error("Demo user missing from both DB and seedData!");
      }
      
    } catch (error) {
      console.error("Error during Demo Login:", error);
      throw error;
    }
  };

  const logoutUser = () => {
    setUser(null);
    setFirebaseUid(null);
    setIsDemo(false);
    localStorage.removeItem("studybuddy_demo");
    auth?.signOut().catch((err) => console.error("Sign-out failed:", err));
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, refreshUser, loginAsDemo, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

