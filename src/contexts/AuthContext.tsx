import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signUp = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    try {
      // Clear client-side music library for brand new accounts
      // Keep in sync with useMusicLibrary.STORAGE_KEY
      localStorage.removeItem('music-analyzer-library');
    } catch (e) {
      // noop
    }
    return userCredential;
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const cred = await signInWithPopup(auth, provider);
      // If this is a newly created user via Google, clear any existing local library
      try {
        if ((cred as any)?.additionalUserInfo?.isNewUser) {
          localStorage.removeItem('music-analyzer-library');
        }
      } catch (e) {
        // noop
      }
      return cred;
    } catch (err) {
      // Some hosting environments / browser policies (Cross-Origin-Opener-Policy/Cross-Origin-Embedder-Policy)
      // can block popup usage. Fall back to redirect flow in that case.
      console.warn('signInWithPopup failed, falling back to redirect. Error:', err);
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectErr) {
        console.error('signInWithRedirect also failed:', redirectErr);
        throw redirectErr;
      }
      return null;
    }
  };

  const refreshUser = async () => {
    if (currentUser) {
      await currentUser.reload();
      // Force update the currentUser state to ensure UI reflects changes immediately
      setCurrentUser({ ...currentUser });
    }
  };

  useEffect(() => {
    let unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // If user was redirected back from a provider (signInWithRedirect), process the result
    (async () => {
      try {
        const result = await getRedirectResult(auth as any);
        if (result && (result as any).additionalUserInfo?.isNewUser) {
          try {
            localStorage.removeItem('music-analyzer-library');
          } catch (e) {
            // noop
          }
        }
      } catch (e) {
        // ignore: no redirect result available is normal
      }
    })();

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    signIn,
    signUp,
    logout,
    signInWithGoogle,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
