import { useState, useEffect, useCallback, useRef } from 'react';
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

  /**
   * アドレス帳一覧を読み込み
   * NOTE: 依存配列にfirestoreServiceを含めないことで無限ループを防止
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
  }, [firestoreServiceRef]);

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
  }, [firestoreServiceRef, loadEntries]);

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
  }, [firestoreServiceRef, loadEntries]);

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
  }, [firestoreServiceRef, loadEntries]);

  // 初回読み込みとリアルタイム同期
  // NOTE: firestoreServiceRefは安定した参照なので依存配列に含めても問題ない
  // userが変更された場合のみリスナーを再設定
  useEffect(() => {
    if (!user) return;

    // リアルタイムリスナーを設定
    setLoading(true);
    const unsubscribe = firestoreServiceRef.current.subscribeToEmailAddresses(
      user.uid,
      (data) => {
        setEntries(data);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to subscribe to email addresses:', error);
        setLoading(false);
      }
    );

    // クリーンアップ
    return () => {
      unsubscribe();
    };
    // NOTE: firestoreServiceRefは安定した参照なので依存配列から除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    entries,
    loading,
    loadEntries,
    addEntry,
    deleteEntry,
    updateEntry,
  };
};

// Re-export for backward compatibility
export type { EmailAddressEntity } from '@/types/entities';
