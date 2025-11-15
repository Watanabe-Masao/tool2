import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * IndexedDBに保存する注文データの型
 */
export interface IndexedDBOrderData extends OrderFormData {
  /** IndexedDB自動採番ID */
  id?: number;
  /** バイヤー名 */
  buyerName: string;
  /** ユーザーID */
  userId: string;
  /** 作成日時 */
  timestamp: Date;
  /** Firestoreと同期済みかどうか */
  synced: boolean;
  /** Firestore上のドキュメントID (同期後に設定) */
  firestoreId?: string;
}

/**
 * Haibun配分表アプリのIndexedDBデータベース
 *
 * Dexie.jsを使用してIndexedDBを操作します。
 * オフライン時のデータ保存とFirestoreとの同期に使用します。
 *
 * スキーマバージョン:
 * - v1: 初期スキーマ (orders テーブル)
 */
export class HaibunDatabase extends Dexie {
  /** 注文データテーブル */
  orders!: Table<IndexedDBOrderData, number>;

  constructor() {
    super('HaibunDB');

    /**
     * バージョン1のスキーマ定義
     *
     * インデックス:
     * - ++id: 自動採番主キー
     * - deliveryDate: 店着日で検索可能
     * - supplier: 帳合先で検索可能
     * - timestamp: 作成日時で検索可能
     * - synced: 同期状態で絞り込み可能
     * - userId: ユーザーIDで絞り込み可能
     */
    this.version(1).stores({
      orders: '++id, deliveryDate, supplier, timestamp, synced, userId',
    });
  }

  /**
   * すべての注文を取得
   */
  async getAllOrders(): Promise<IndexedDBOrderData[]> {
    return this.orders.toArray();
  }

  /**
   * ユーザーIDで注文を絞り込み
   */
  async getOrdersByUser(userId: string): Promise<IndexedDBOrderData[]> {
    return this.orders.where('userId').equals(userId).toArray();
  }

  /**
   * 未同期の注文を取得
   */
  async getUnsyncedOrders(userId: string): Promise<IndexedDBOrderData[]> {
    return this.orders.where({ userId, synced: false }).toArray();
  }

  /**
   * 注文を保存
   */
  async saveOrder(order: IndexedDBOrderData): Promise<number> {
    return this.orders.add(order);
  }

  /**
   * 注文を更新
   */
  async updateOrder(id: number, changes: Partial<IndexedDBOrderData>): Promise<number> {
    return this.orders.update(id, changes);
  }

  /**
   * 注文を削除
   */
  async deleteOrder(id: number): Promise<void> {
    return this.orders.delete(id);
  }

  /**
   * 特定の日付の注文を取得
   */
  async getOrdersByDate(userId: string, deliveryDate: Date): Promise<IndexedDBOrderData[]> {
    const startOfDay = new Date(deliveryDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(deliveryDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.orders
      .where('userId')
      .equals(userId)
      .and((order) => {
        const orderDate = new Date(order.deliveryDate);
        return orderDate >= startOfDay && orderDate <= endOfDay;
      })
      .toArray();
  }

  /**
   * データベースをクリア（テスト用）
   */
  async clearAllData(): Promise<void> {
    await this.orders.clear();
  }
}

/**
 * シングルトンインスタンス
 */
export const db = new HaibunDatabase();
