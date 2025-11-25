import { useState, useEffect, useCallback } from 'react';
import { useFirestoreService } from '@/context/ServiceContext';
import { useAuthContext } from '@/context/AuthContext';
import type { EmailAddressEntity } from '@/types/entities';

/**
 * メールアドレス帳管理フック
 */
export const useEmailAddressBook = () => {
  const { user } = useAuthContext();
  const firestoreService = useFirestoreService();
  const [entries, setEntries] = useState<EmailAddressEntity[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * アドレス帳一覧を読み込み
   */
  const loadEntries = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await firestoreService.getEmailAddresses(user.uid);
      setEntries(data);
    } catch (error) {
      console.error('Failed to load email addresses:', error);
    } finally {
      setLoading(false);
    }
  }, [user, firestoreService]);

  /**
   * アドレス帳を追加
   */
  const addEntry = useCallback(async (name: string, email: string): Promise<boolean> => {
    if (!user) return false;

    try {
      await firestoreService.saveEmailAddress(user.uid, name, email);
      await loadEntries(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to add email address:', error);
      return false;
    }
  }, [user, firestoreService, loadEntries]);

  /**
   * アドレス帳を削除
   */
  const deleteEntry = useCallback(async (entryId: string): Promise<boolean> => {
    try {
      await firestoreService.deleteEmailAddress(entryId);
      await loadEntries(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to delete email address:', error);
      return false;
    }
  }, [firestoreService, loadEntries]);

  /**
   * アドレス帳を更新
   */
  const updateEntry = useCallback(async (entryId: string, name: string, email: string): Promise<boolean> => {
    try {
      await firestoreService.updateEmailAddress(entryId, name, email);
      await loadEntries(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to update email address:', error);
      return false;
    }
  }, [firestoreService, loadEntries]);

  // 初回読み込みとリアルタイム同期
  useEffect(() => {
    if (!user) return;

    // リアルタイムリスナーを設定
    setLoading(true);
    const unsubscribe = firestoreService.subscribeToEmailAddresses(
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
  }, [user, firestoreService]);

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
