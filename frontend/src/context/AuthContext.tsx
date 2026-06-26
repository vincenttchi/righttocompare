import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import { getUserProfile, syncUserWithBackend, updateUserProfile } from "../api/userApi";
import { AppUser } from "../types/userTypes";

// ------------------------------------------------------------
// | AuthContext DEFINITION
// ------------------------------------------------------------
interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyTheResetCode: (oobCode: string) => Promise<void>;
  confirmThePassword: (oobCode: string, newPassword: string) => Promise<void>;
  updateCurrentUser: (updates: Partial<AppUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ------------------------------------------------------------
// | AuthProvider DEFINITION
// ------------------------------------------------------------
export function AuthProvider({ children }: AuthProviderProps) {
  // ------------------------------------------------------------
  // | HOOKS
  // ------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * CALLBACK: fetchAndSetUser
   * Dependencies: None
   * Purpose: Fetching user profile data from backend/syncing profile data,
   * if failure in fetching to the current Firebase user, and caching the
   * user profile.
   */
  const fetchAndSetUser = useCallback(async (user: User) => {
    try {
      const token = await user.getIdToken();

      // Trying to GET the user profile
      console.log("Attempting to fetch user profile...");
      let userData = await getUserProfile(user.uid, token);

      // Fallback to syncing the user profile if GET fails
      if (!userData) {
        console.warn("User missing in DB, attempting to sync...");
        userData = await syncUserWithBackend(user);
      }

      // Combines Firebase identity + MongoDB user profile data if user found
      if (userData) {
        const appUser: AppUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          firebaseUser: user,
          role: userData.role,
          preferences: userData.preferences,
          wishlist: userData.wishlist,
          comparisonPhoneIds: userData.comparisonPhoneIds || [],
          preferredCarrier: userData.preferredCarrier || "",
        };
        setCurrentUser(appUser);
        console.log("Sync is complete. AppUser is ready.");
      } else {
        console.error("Backend sync failed. Logging out.");
        await firebaseSignOut(auth);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("AuthContext: Error in auth listener:", error);
      setCurrentUser(null);
    }
  }, []);

  // ------------------------------------------------------------
  // | DATA SYNCHRONIZATION
  // ------------------------------------------------------------

  /**
   * SYNC: Authentication and Synchronization of User Profile Data
   * Signal: Firebase's onAuthStateChanged event
   * Action: Authenticates Firebase user (through Firebase) and
   * synchronization of user profile data from MongoDB
   */
  useEffect(() => {
    console.log("AuthContext: Setting up auth listener...");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Case A: User is logged in
      if (user) {
        console.log("Firebase user detected. Starting backend sync...");
        await fetchAndSetUser(user);
      } else {
        // Case B: User is logged out
        console.log("User logged out");
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ------------------------------------------------------------
  // | AUTHORIZATION LOGIC
  // ------------------------------------------------------------

  // Sign up with email and password (and display name)
  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const userCredentials = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredentials.user;

    // Updating user display name upon sign up and forces sync with backend
    await updateProfile(user, { displayName: name });
    await user.reload();
    const token = await user.getIdToken(true);
    await updateUserProfile(user.uid, token, { displayName: name });
    setCurrentUser((prev) => {
      // Sets current user to the previous user with their new display name
      return prev ? { ...prev, displayName: name } : null;
    });
  }, []);

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  // Password reset link
  const resetPassword = useCallback(async (email: string) => {
    return sendPasswordResetEmail(auth, email);
  }, []);

  // Verifying password reset code
  const verifyTheResetCode = useCallback(async (oobCode: string) => {
    return verifyPasswordResetCode(auth, oobCode);
  }, []);

  // Password reset confirmation (for custom page)
  const confirmThePassword = useCallback(async (oobCode: string, newPassword: string) => {
    return confirmPasswordReset(auth, oobCode, newPassword);
  }, []);

  const updateCurrentUser = useCallback((updates: Partial<AppUser>) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  // Public interface for functions (PUT NEW FUNCTIONS NAMES FOR AuthContext HERE)
  const value = useMemo(
    () => ({
      currentUser,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      verifyTheResetCode,
      confirmThePassword,
      updateCurrentUser,
    }),
    [
      currentUser,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      verifyTheResetCode,
      confirmThePassword,
      updateCurrentUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
