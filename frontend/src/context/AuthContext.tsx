import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { useAuth, UseAuthReturn } from '@/hooks/useAuth';
import { initializeFirebase } from '@/services/firebase/config';
import { CircularProgress, Box } from '@mui/material';

/**
 * 認証コンテキストの型
 */
interface AuthContextType extends UseAuthReturn {
  /** Firebase初期化完了フラグ */
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

  // Firebase初期化
  useEffect(() => {
    const init = async () => {
      try {
        console.log('Firebase初期化開始...');
        await initializeFirebase();
        setFirebaseInitialized(true);
        console.log('Firebase初期化完了');
      } catch (error) {
        console.error('Firebase初期化エラー:', error);
        setInitError(error as Error);
      }
    };

    init();
  }, []);

  // 認証フック（Firebase初期化後にのみ使用）
  const auth = useAuth();

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

  const value: AuthContextType = {
    ...auth,
    firebaseInitialized,
  };

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
