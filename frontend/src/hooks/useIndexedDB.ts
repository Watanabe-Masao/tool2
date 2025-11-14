import { useLiveQuery } from 'dexie-react-hooks';
import { db, type IndexedDBOrderData } from '@/services/storage/indexeddb';
import { useAuthContext } from '@/context/AuthContext';

/**
 * useIndexedDB戻り値の型
 */
export interface UseIndexedDBReturn {
  /** すべての注文（ユーザーでフィルタ済み） */
  orders: IndexedDBOrderData[] | undefined;
  /** ローディング中かどうか */
  isLoading: boolean;
  /** 注文を保存 */
  saveOrder: (order: Omit<IndexedDBOrderData, 'id' | 'timestamp' | 'userId' | 'synced'>) => Promise<number>;
  /** 注文を更新 */
  updateOrder: (id: number, changes: Partial<IndexedDBOrderData>) => Promise<number>;
  /** 注文を削除 */
  deleteOrder: (id: number) => Promise<void>;
  /** 未同期の注文を取得 */
  getUnsyncedOrders: () => Promise<IndexedDBOrderData[]>;
  /** 特定の日付の注文を取得 */
  getOrdersByDate: (date: Date) => Promise<IndexedDBOrderData[]>;
  /** すべてのデータをクリア */
  clearAllData: () => Promise<void>;
}

/**
 * IndexedDBカスタムフック
 *
 * Dexie.jsを使用してIndexedDBにアクセスするためのReactフックです。
 * useLiveQueryを使用してリアルタイムでデータの変更を監視します。
 *
 * 機能:
 * - 注文データのCRUD操作
 * - 未同期データの取得
 * - 日付によるフィルタリング
 * - リアルタイムデータ同期
 *
 * 使用例:
 * ```tsx
 * const { orders, saveOrder, deleteOrder } = useIndexedDB();
 *
 * // 注文を保存
 * await saveOrder({
 *   deliveryDate: new Date(),
 *   supplier: '株式会社〇〇',
 *   products: [...],
 *   totalDelivery: 100,
 *   buyerName: '田中太郎'
 * });
 *
 * // 注文を削除
 * await deleteOrder(1);
 * ```
 */
export const useIndexedDB = (): UseIndexedDBReturn => {
  const { user } = useAuthContext();

  /**
   * ユーザーの注文をリアルタイムで取得
   *
   * useLiveQueryはIndexedDBの変更を監視し、
   * データが変更されると自動的に再レンダリングします。
   */
  const orders = useLiveQuery(
    async () => {
      if (!user) return [];
      return db.getOrdersByUser(user.uid);
    },
    [user?.uid]
  );

  /**
   * 注文を保存
   */
  const saveOrder = async (
    order: Omit<IndexedDBOrderData, 'id' | 'timestamp' | 'userId' | 'synced'>
  ): Promise<number> => {
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }

    const orderData: IndexedDBOrderData = {
      ...order,
      userId: user.uid,
      timestamp: new Date(),
      synced: false, // デフォルトは未同期
    };

    return db.saveOrder(orderData);
  };

  /**
   * 注文を更新
   */
  const updateOrder = async (id: number, changes: Partial<IndexedDBOrderData>): Promise<number> => {
    return db.updateOrder(id, changes);
  };

  /**
   * 注文を削除
   */
  const deleteOrder = async (id: number): Promise<void> => {
    return db.deleteOrder(id);
  };

  /**
   * 未同期の注文を取得
   */
  const getUnsyncedOrders = async (): Promise<IndexedDBOrderData[]> => {
    if (!user) {
      return [];
    }
    return db.getUnsyncedOrders(user.uid);
  };

  /**
   * 特定の日付の注文を取得
   */
  const getOrdersByDate = async (date: Date): Promise<IndexedDBOrderData[]> => {
    if (!user) {
      return [];
    }
    return db.getOrdersByDate(user.uid, date);
  };

  /**
   * すべてのデータをクリア（開発・テスト用）
   */
  const clearAllData = async (): Promise<void> => {
    return db.clearAllData();
  };

  return {
    orders,
    isLoading: orders === undefined,
    saveOrder,
    updateOrder,
    deleteOrder,
    getUnsyncedOrders,
    getOrdersByDate,
    clearAllData,
  };
};
