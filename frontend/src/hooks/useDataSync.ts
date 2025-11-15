import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useIndexedDB } from './useIndexedDB';
import { FirestoreService } from '@/services/firebase/firestoreService';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * useDataSync戻り値の型
 */
export interface UseDataSyncReturn {
  /** オンライン状態 */
  isOnline: boolean;
  /** 同期中かどうか */
  isSyncing: boolean;
  /** 未同期データの数 */
  unsyncedCount: number;
  /** 注文を保存（オンライン/オフラインを自動判定） */
  saveOrder: (order: OrderFormData, buyerName: string) => Promise<void>;
  /** 手動で同期を実行 */
  syncNow: () => Promise<void>;
}

/**
 * オフライン同期カスタムフック
 *
 * オンライン/オフライン状態を監視し、データの保存先を自動で切り替えます。
 * オンライン時はFirestoreに保存、オフライン時はIndexedDBに保存します。
 * オフラインからオンラインに復帰した際は、自動的にIndexedDBのデータをFirestoreに同期します。
 *
 * 同期戦略:
 * 1. オンライン時: Firestoreに直接保存
 * 2. オフライン時: IndexedDBに保存（synced: false）
 * 3. 再接続時: IndexedDBの未同期データをFirestoreに同期（synced: true）
 *
 * 使用例:
 * ```tsx
 * const { isOnline, saveOrder, unsyncedCount } = useDataSync();
 *
 * // オンライン状態を表示
 * {!isOnline && <Alert>オフラインモードです</Alert>}
 * {unsyncedCount > 0 && <Alert>{unsyncedCount}件の未同期データがあります</Alert>}
 *
 * // データを保存（オンライン/オフライン自動判定）
 * await saveOrder(formData, 'バイヤー名');
 * ```
 */
export const useDataSync = (): UseDataSyncReturn => {
  const { user } = useAuthContext();
  const { showSuccess, showError, showWarning } = useNotification();
  const { saveOrder: saveToIndexedDB, getUnsyncedOrders, updateOrder } = useIndexedDB();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  /**
   * オンライン/オフライン状態のイベントリスナー
   */
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 オンラインに復帰しました');
      setIsOnline(true);
      showSuccess('オンラインに復帰しました');
    };

    const handleOffline = () => {
      console.log('📴 オフラインモードです');
      setIsOnline(false);
      showWarning('オフラインモードです。データはローカルに保存されます。');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showSuccess, showWarning]);

  /**
   * 未同期データの数を更新
   */
  const updateUnsyncedCount = useCallback(async () => {
    const unsyncedOrders = await getUnsyncedOrders();
    setUnsyncedCount(unsyncedOrders.length);
  }, [getUnsyncedOrders]);

  /**
   * 初回マウント時のみ未同期データの数を更新
   */
  useEffect(() => {
    updateUnsyncedCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * IndexedDBからFirestoreに同期
   */
  const syncIndexedDBToFirestore = useCallback(async () => {
    if (!user) {
      console.log('ユーザーがログインしていないため、同期をスキップします');
      return;
    }

    if (!isOnline) {
      console.log('オフラインのため、同期をスキップします');
      return;
    }

    setIsSyncing(true);

    try {
      const unsyncedOrders = await getUnsyncedOrders();

      if (unsyncedOrders.length === 0) {
        console.log('未同期データはありません');
        setIsSyncing(false);
        return;
      }

      console.log(`${unsyncedOrders.length}件のデータを同期中...`);

      for (const order of unsyncedOrders) {
        try {
          // IndexedDB固有のフィールドを除外してFirestoreに保存
          const { id, synced, firestoreId, ...orderData } = order;

          // Firestoreに保存
          const docId = await FirestoreService.saveOrder(
            {
              ...orderData,
              // deliveryDateをDateオブジェクトに変換（IndexedDBではDateが文字列化されている可能性があるため）
              deliveryDate:
                orderData.deliveryDate instanceof Date
                  ? orderData.deliveryDate
                  : new Date(orderData.deliveryDate),
            },
            user.uid
          );

          // IndexedDBの同期フラグを更新
          if (id) {
            await updateOrder(id, {
              synced: true,
              firestoreId: docId,
            });
          }

          console.log(`✅ 同期完了: ${docId}`);
        } catch (error) {
          console.error('同期エラー:', error);
          showError(`データの同期に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
        }
      }

      await updateUnsyncedCount();
      showSuccess(`${unsyncedOrders.length}件のデータを同期しました`);
    } catch (error) {
      console.error('同期処理エラー:', error);
      showError('同期処理に失敗しました');
    } finally {
      setIsSyncing(false);
    }
  }, [user, isOnline, getUnsyncedOrders, updateOrder, updateUnsyncedCount, showSuccess, showError]);

  /**
   * オンライン復帰時に自動同期（デバウンス付き）
   */
  useEffect(() => {
    if (isOnline && !isSyncing) {
      console.log('オンライン復帰を検知。2秒後に同期を開始します...');
      // 2秒後に同期を実行（ネットワークが安定するまで待つ）
      const timer = setTimeout(() => {
        syncIndexedDBToFirestore();
      }, 2000);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  /**
   * 注文を保存（オンライン/オフライン自動判定）
   */
  const saveOrder = async (order: OrderFormData, buyerName: string): Promise<void> => {
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }

    if (isOnline) {
      // オンライン時: Firestoreに直接保存
      console.log('🌐 オンライン: Firestoreに保存');
      const orderData = {
        ...order,
        buyerName,
        userId: user.uid,
        timestamp: new Date(),
      };
      await FirestoreService.saveOrder(orderData, user.uid);
    } else {
      // オフライン時: IndexedDBに保存
      console.log('📴 オフライン: IndexedDBに保存');
      await saveToIndexedDB({
        ...order,
        buyerName,
      });
      await updateUnsyncedCount();
    }
  };

  /**
   * 手動で同期を実行
   */
  const syncNow = async (): Promise<void> => {
    if (!isOnline) {
      showWarning('オフラインのため同期できません');
      return;
    }

    await syncIndexedDBToFirestore();
  };

  return {
    isOnline,
    isSyncing,
    unsyncedCount,
    saveOrder,
    syncNow,
  };
};
