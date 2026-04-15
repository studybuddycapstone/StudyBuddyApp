import { auth } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";

export const signUp = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase not configured. Use demo mode instead.");
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(userCredential.user);
  return userCredential.user;
};

export const login = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase not configured. Use demo mode instead.");
  const userCredential = await signInWithEmailAndPassword(auth, email, password);

  if (!userCredential.user.emailVerified) {
    throw new Error("Email not verified");
  }

  return userCredential.user;
};

export const logout = async () => {
  if (!auth) return;
  await signOut(auth);
};
