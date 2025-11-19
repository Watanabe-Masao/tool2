import { useState, useEffect } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFirebaseAuth } from '@/services/firebase/config';

/**
 * 認証フックの戻り値
 */
export interface UseAuthReturn {
  /** 現在のユーザー */
  user: User | null;
  /** ローディング中かどうか */
  loading: boolean;
  /** エラー */
  error: Error | null;
  /** GoogleアクセストークンGmail API用) */
  googleAccessToken: string | null;
  /** Googleでサインイン */
  signInWithGoogle: () => Promise<void>;
  /** サインアウト */
  signOut: () => Promise<void>;
}

/**
 * Firebase認証フック
 *
 * 使用例:
 * ```tsx
 * const { user, loading, signInWithGoogle, signOut } = useAuth();
 *
 * if (loading) return <Loading />;
 * if (!user) return <LoginButton onClick={signInWithGoogle} />;
 * return <UserProfile user={user} onLogout={signOut} />;
 * ```
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();

      // 認証状態の変更を監視
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

      // クリーンアップ
      return () => unsubscribe();
    } catch (err) {
      console.error('useAuth initialization error:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, []);

  /**
   * Googleアカウントでサインイン
   */
  const signInWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();

      // Gmail API用のスコープを追加
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      provider.addScope('https://www.googleapis.com/auth/gmail.compose');

      // 日本語を優先言語として設定
      provider.setCustomParameters({
        locale: 'ja',
      });

      const result = await signInWithPopup(auth, provider);

      // GoogleAuthProviderのcredentialからアクセストークンを取得
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        console.log('Google access token取得成功');
      }
      // onAuthStateChangedが自動的にuserを更新する
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * サインアウト
   */
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
      setGoogleAccessToken(null); // アクセストークンもクリア
      // onAuthStateChangedが自動的にuserをnullに更新する
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    googleAccessToken,
    signInWithGoogle,
    signOut,
  };
};
