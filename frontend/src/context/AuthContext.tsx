import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { initializeFirebase, getFirebaseAuth } from '@/services/firebase/config';
import { CircularProgress, Box } from '@mui/material';

/**
 * 認証コンテキストの型
 */
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  firebaseInitialized: boolean;
}

/**
 * 認証コンテキスト
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 認証プロバイダーのProps
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 認証プロバイダー
 *
 * Firebaseの初期化と認証状態の管理を提供します。
 *
 * NOTE: Context valueをuseMemoでメモ化し、無限ループ(React #185)を防止
 *
 * 使用例:
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Firebase初期化
  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirebase();
        setFirebaseInitialized(true);
      } catch (err) {
        console.error('Firebase初期化エラー:', err);
        setInitError(err as Error);
      }
    };

    init();
  }, []);

  // 認証状態の監視（Firebase初期化後）
  useEffect(() => {
    if (!firebaseInitialized) return;

    try {
      const auth = getFirebaseAuth();

      const unsubscribe = onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Auth state change error:', err);
          setError(err as Error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Auth initialization error:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [firebaseInitialized]);

  /**
   * Googleアカウントでサインイン
   */
  const signInWithGoogle = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ locale: 'ja' });

      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * サインアウト
   */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Context valueをメモ化して安定した参照を維持
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      error,
      signInWithGoogle,
      signOut,
      firebaseInitialized,
    }),
    [user, loading, error, signInWithGoogle, signOut, firebaseInitialized]
  );

  // Firebase初期化中
  if (!firebaseInitialized) {
    if (initError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          gap={2}
        >
          <div>Firebase初期化エラー</div>
          <div style={{ color: 'red' }}>{initError.message}</div>
        </Box>
      );
    }

    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * 認証コンテキストを使用するカスタムフック
 *
 * 使用例:
 * ```tsx
 * const { user, loading, signInWithGoogle, signOut } = useAuthContext();
 *
 * if (loading) return <Loading />;
 * if (!user) return <LoginPage />;
 * return <UserProfile user={user} />;
 * ```
 */
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
