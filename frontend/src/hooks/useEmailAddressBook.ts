import { useState, useEffect } from 'react';
import { FirestoreService } from '@/services/firebase/firestoreService';
import { useAuthContext } from '@/context/AuthContext';
import type { EmailAddress } from '@/types/repository';
import type { EmailAddressEntry } from '@/types/userSettings';

/**
 * Repository型(EmailAddress)をUI型(EmailAddressEntry)に変換
 */
function toEmailAddressEntry(address: EmailAddress): EmailAddressEntry | null {
  if (!address.id) return null;
  const { userId, ...rest } = address;
  return { ...rest, id: address.id };
}

/**
 * メールアドレス帳管理フック
 */
export const useEmailAddressBook = () => {
  const { user } = useAuthContext();
  const [entries, setEntries] = useState<EmailAddressEntry[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * アドレス帳一覧を読み込み
   */
  const loadEntries = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await FirestoreService.getEmailAddresses(user.uid);
      // Repository型からUI型に変換
      const entries = data.map(toEmailAddressEntry).filter((e): e is EmailAddressEntry => e !== null);
      setEntries(entries);
    } catch (error) {
      console.error('Failed to load email addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * アドレス帳を追加
   */
  const addEntry = async (name: string, email: string): Promise<boolean> => {
    if (!user) return false;

    try {
      await FirestoreService.saveEmailAddress(user.uid, name, email);
      await loadEntries(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to add email address:', error);
      return false;
    }
  };

  /**
   * アドレス帳を削除
   */
  const deleteEntry = async (entryId: string): Promise<boolean> => {
    try {
      await FirestoreService.deleteEmailAddress(entryId);
      await loadEntries(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to delete email address:', error);
      return false;
    }
  };

  /**
   * アドレス帳を更新
   */
  const updateEntry = async (entryId: string, name: string, email: string): Promise<boolean> => {
    try {
      await FirestoreService.updateEmailAddress(entryId, name, email);
      await loadEntries(); // 再読み込み
      return true;
    } catch (error) {
      console.error('Failed to update email address:', error);
      return false;
    }
  };

  // 初回読み込みとリアルタイム同期
  useEffect(() => {
    if (!user) return;

    // リアルタイムリスナーを設定
    setLoading(true);
    const unsubscribe = FirestoreService.subscribeToEmailAddresses(
      user.uid,
      (data) => {
        // Repository型からUI型に変換
        const entries = data.map(toEmailAddressEntry).filter((e): e is EmailAddressEntry => e !== null);
        setEntries(entries);
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
export type { EmailAddressEntry } from '@/types/userSettings';
