import { createContext, useContext } from "react";
import type { UserProfile } from "../types";

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  refreshUser: () => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logoutUser: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDemo: false,
  refreshUser: async () => {},
  loginAsDemo: async () => {},
  logoutUser: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
