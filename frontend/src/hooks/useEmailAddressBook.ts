import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFirestoreServiceRef } from '@/context/ServiceContext';
import { useAuthContext } from '@/context/AuthContext';
import type { EmailAddressEntity } from '@/types/entities';

/**
 * メールアドレス帳管理フック
 *
 * NOTE: firestoreServiceはuseFirestoreServiceRefで取得し、
 * 依存配列に含めないことで無限ループ(React #185)を防止
 */
export const useEmailAddressBook = () => {
  const { user } = useAuthContext();
  const firestoreServiceRef = useFirestoreServiceRef();
  const [entries, setEntries] = useState<EmailAddressEntity[]>([]);
  const [loading, setLoading] = useState(false);

  // userをrefで保持して安定した参照を維持
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // user.uidを安定した値として保持（オブジェクト参照ではなく値で比較）
  const userId = user?.uid;

  /**
   * アドレス帳一覧を読み込み
   * NOTE: 依存配列を空にして安定化
   */
  const loadEntries = useCallback(async () => {
    if (!userRef.current) return;

    setLoading(true);
    try {
      const data = await firestoreServiceRef.current.getEmailAddresses(userRef.current.uid);
      setEntries(data);
    } catch (error) {
      console.error('Failed to load email addresses:', error);
    } finally {
      setLoading(false);
    }
    // NOTE: refは安定しているため依存配列に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * アドレス帳を追加
   */
  const addEntry = useCallback(async (name: string, email: string): Promise<boolean> => {
    if (!userRef.current) return false;

    try {
      await firestoreServiceRef.current.saveEmailAddress(userRef.current.uid, name, email);
      await loadEntries(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to add email address:', error);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadEntries]);

  /**
   * アドレス帳を削除
   */
  const deleteEntry = useCallback(async (entryId: string): Promise<boolean> => {
    try {
      await firestoreServiceRef.current.deleteEmailAddress(entryId);
      await loadEntries(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to delete email address:', error);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadEntries]);

  /**
   * アドレス帳を更新
   */
  const updateEntry = useCallback(async (entryId: string, name: string, email: string): Promise<boolean> => {
    try {
      await firestoreServiceRef.current.updateEmailAddress(entryId, name, email);
      await loadEntries(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to update email address:', error);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadEntries]);

  // 初回読み込みとリアルタイム同期
  // NOTE: user.uidを依存配列に使用し、オブジェクト参照ではなく値で比較
  useEffect(() => {
    if (!userId) return;

    // リアルタイムリスナーを設定
    setLoading(true);
    let unsubscribe: (() => void) | null = null;
    let retryCount = 0;
    const maxRetries = 3;

    const setupListener = () => {
      unsubscribe = firestoreServiceRef.current.subscribeToEmailAddresses(
        userId,
        (data) => {
          setEntries(data);
          setLoading(false);
          retryCount = 0; // 成功したらリトライカウントをリセット
        },
        async (error) => {
          console.error('Failed to subscribe to email addresses:', error);

          // リアルタイムリスナーが失敗した場合、リトライまたはフォールバック
          if (retryCount < maxRetries) {
            retryCount++;
            // 既存のリスナーをクリーンアップ
            if (unsubscribe) {
              unsubscribe();
              unsubscribe = null;
            }
            // 少し待ってからリトライ
            setTimeout(setupListener, 1000 * retryCount);
          } else {
            // リトライ上限に達した場合、一度だけ通常クエリを実行
            try {
              const data = await firestoreServiceRef.current.getEmailAddresses(userId);
              setEntries(data);
            } catch (fallbackError) {
              console.error('Fallback query also failed:', fallbackError);
            }
            setLoading(false);
          }
        }
      );
    };

    setupListener();

    // クリーンアップ
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // NOTE: userIdは文字列なので安定、firestoreServiceRefはrefなので安定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 戻り値をメモ化して安定した参照を維持
  return useMemo(
    () => ({
      entries,
      loading,
      loadEntries,
      addEntry,
      deleteEntry,
      updateEntry,
    }),
    [entries, loading, loadEntries, addEntry, deleteEntry, updateEntry]
  );
};

// Re-export for backward compatibility
export type { EmailAddressEntity } from '@/types/entities';
