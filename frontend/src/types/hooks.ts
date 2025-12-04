/**
 * Hooks 戻り値型定義
 *
 * @description
 * カスタムフックの戻り値型を一元管理します。
 * Hook の戻り値型、Hook が返すデータ構造など、Hook に関連する全ての型を定義
 */

import type { User } from 'firebase/auth';
import type { OrderFormData } from '@/schemas/orderSchema';
import type { IndexedDBOrderData } from '@/types/services';

/**
 * useAuth フックの戻り値
 */
export interface UseAuthReturn {
  /** 現在のユーザー */
  user: User | null;
  /** ローディング中かどうか */
  loading: boolean;
  /** エラー */
  error: Error | null;
  /** Googleでサインイン */
  signInWithGoogle: () => Promise<void>;
  /** サインアウト */
  signOut: () => Promise<void>;
}

/**
 * useDataSync フックの戻り値
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
 * useIndexedDB フックの戻り値
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
 * 商品履歴アイテム
 *
 * @description
 * useProductHistory フックで使用される商品履歴データ
 */
export interface ProductHistoryItem {
  id: string;
  supplier: string;
  categoryCode?: string;
  name: string;
  origin: string;
  specification: string;
  quantityPerPackage: number | null;
  specificationUnit: string;
  packageUnit: string;
  usageCount: number;
  pinned?: boolean;
  pinOrder?: number;
}

/**
 * 価格履歴アイテム
 *
 * @description
 * usePricingHistory フックで使用される価格履歴データ
 */
export interface PricingHistoryItem {
  id: string;
  /** 商品名 */
  productName: string;
  /** 規格 */
  specification: string;
  /** 入数 */
  quantityPerPackage: number;
  /** 規格の単位 */
  specificationUnit: string;
  /** 入数の単位 */
  packageUnit: string;
  /** センター着原価 */
  centerCost: number;
  /** 店着原価 */
  storeCost: number;
  /** 本体価格（税抜売価） */
  priceExcludingTax: number;
  /** センターフィー率（デフォルト13%） */
  centerFeeRate?: number;
  /** 使用回数 */
  usageCount: number;
  /** 最終使用日 */
  lastUsedAt: Date;
  /** 作成日 */
  createdAt: Date;
}

/**
 * キーボードショートカットの定義
 */
export interface KeyboardShortcut {
  /** キーの組み合わせ（例: 'ctrl+s', 'cmd+enter'） */
  key: string;
  /** 説明 */
  description: string;
  /** 実行する関数 */
  handler: () => void;
  /** 有効/無効フラグ */
  enabled?: boolean;
}

/**
 * 生成されたファイル情報
 *
 * @description
 * useTemplateGeneration, useOrderSubmit フックで使用される
 * テンプレート生成後のファイル情報
 */
export interface GeneratedFiles {
  filename: string;
  downloadUrl: string;
  pdfFilename?: string;
  pdfDownloadUrl?: string;
}
