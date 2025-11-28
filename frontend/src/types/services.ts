/**
 * Service 関連型定義
 *
 * @description
 * サービス層のインターフェース、データ型など、サービスに関連する全ての型を定義
 */

import type { OrderFormData } from '@/schemas/orderSchema';
import type { DocumentSnapshot, Unsubscribe } from 'firebase/firestore';
import type { TemplateService } from '@/services/api/templateService';
import type { SessionStorageService } from '@/utils/sessionStorageService';
import type { OrderData, EmailAddressEntity, SupplierPresetEntity } from '@/types';

// ============================================================
// Service Interfaces (DI用)
// ============================================================

/**
 * Firestore Service インターフェース
 *
 * @description
 * Firestore操作のインターフェース定義
 * DIパターンに従い、実装を抽象化
 *
 * FirestoreServiceFacade のメソッドシグネチャに準拠
 */
export interface IFirestoreService {
  // 注文関連
  saveOrder(orderData: OrderData, userId: string): Promise<string>;
  getUserOrders(userId: string, limitCount?: number): Promise<OrderData[]>;
  getOrdersByDate(userId: string, deliveryDate: string): Promise<OrderData[]>;
  updateOrder(orderId: string, orderData: OrderData, userId: string): Promise<void>;
  deleteOrder(orderId: string): Promise<void>;

  // オートコンプリート履歴
  saveAutocompleteHistory(
    userId: string,
    field: 'productName' | 'origin' | 'specification' | 'supplier',
    value: string
  ): Promise<void>;
  getAutocompleteHistory(
    userId: string,
    field: 'productName' | 'origin' | 'specification' | 'supplier'
  ): Promise<string[]>;

  // 帳合先プリセット
  saveSupplierPreset(userId: string, supplier: string): Promise<string>;
  getSupplierPresets(userId: string): Promise<SupplierPresetEntity[]>;
  subscribeToSupplierPresets(
    userId: string,
    onSuccess: (presets: SupplierPresetEntity[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;
  deleteSupplierPreset(presetId: string): Promise<void>;
  updateSupplierPreset(presetId: string, supplier: string): Promise<void>;
  reorderSupplierPresets(
    reorderedItems: Array<{ id: string; displayOrder: number }>
  ): Promise<void>;

  // メールアドレス帳
  saveEmailAddress(userId: string, name: string, email: string): Promise<string>;
  getEmailAddresses(userId: string): Promise<EmailAddressEntity[]>;
  subscribeToEmailAddresses(
    userId: string,
    onSuccess: (addresses: EmailAddressEntity[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe;
  deleteEmailAddress(addressId: string): Promise<void>;
  updateEmailAddress(addressId: string, name: string, email: string): Promise<void>;
  reorderEmailAddresses(
    reorderedItems: Array<{ id: string; displayOrder: number }>
  ): Promise<void>;

  // 商品履歴
  saveProductHistory(
    userId: string,
    supplier: string,
    name: string,
    origin: string,
    specification: string,
    quantityPerPackage: number | null,
    unit: string,
    packageUnit: string,
    categoryCode?: string
  ): Promise<string>;
  getProductHistory(
    userId: string,
    supplier?: string
  ): Promise<
    Array<{
      id: string;
      supplier: string;
      categoryCode?: string;
      name: string;
      origin: string;
      specification: string;
      quantityPerPackage: number | null;
      unit: string;
      usageCount: number;
      pinned?: boolean;
      pinOrder?: number;
    }>
  >;
  deleteProductHistoryByCondition(
    userId: string,
    conditions: {
      supplier: string;
      name?: string;
      origin?: string;
      specification?: string;
      quantityPerPackage?: number | null;
      unit?: string;
    }
  ): Promise<number>;
  deleteProductHistoryById(historyId: string): Promise<void>;
  toggleProductHistoryPinned(
    historyId: string,
    pinned: boolean,
    userId?: string,
    supplier?: string
  ): Promise<void>;
  reorderPinnedPresets(
    reorderedItems: Array<{ id: string; pinOrder: number }>
  ): Promise<void>;

  // 価格履歴
  getPricingHistory(userId: string): Promise<any[]>;
  savePricingHistory(
    userId: string,
    productName: string,
    specification: string,
    quantityPerPackage: number,
    unit: string,
    packageUnit: string,
    centerCost: number,
    storeCost: number,
    priceExcludingTax: number,
    centerFeeRate?: number
  ): Promise<void>;
  deletePricingHistory(historyId: string): Promise<void>;
}

/**
 * Template Service インターフェース
 *
 * @description
 * テンプレート生成サービスのインターフェース定義
 */
export interface ITemplateService {
  generateTemplate: typeof TemplateService.generateTemplate;
}

/**
 * SessionStorage Service インターフェース
 *
 * @description
 * SessionStorage操作のインターフェース定義
 */
export interface ISessionStorageService {
  saveDraft: typeof SessionStorageService.saveDraft;
  loadDraft: typeof SessionStorageService.loadDraft;
  clearDraft: typeof SessionStorageService.clearDraft;
}

/**
 * Services 集合型
 *
 * @description
 * アプリケーション全体で使用する Service の集合
 * ServiceProvider で提供される
 */
export interface Services {
  firestoreService: IFirestoreService;
  templateService: ITemplateService;
  sessionStorageService: ISessionStorageService;
}

// ============================================================
// Data Types
// ============================================================

/**
 * IndexedDBに保存する注文データの型
 *
 * @description
 * オフライン時のデータ保存とFirestoreとの同期に使用
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
 * メール送信オプション
 *
 * @description
 * Gmail送信サービスで使用されるオプション
 */
export interface EmailSendOptions {
  /** 宛先メールアドレス */
  to: string;
  /** 件名 */
  subject: string;
  /** 本文（HTML形式） */
  body: string;
  /** 送信元の表示名（オプション） */
  senderName?: string;
  /** 添付ファイル（Blob） */
  attachment?: Blob;
  /** 添付ファイル名 */
  filename?: string;
}

/**
 * ページネーション結果
 *
 * @description
 * FirestoreBaseService で使用されるページネーション結果型
 */
export interface PaginatedResult<T> {
  /** アイテムリスト */
  items: T[];
  /** 次のページがあるか */
  hasMore: boolean;
  /** 最後のドキュメント（次ページ取得用） */
  lastDoc?: DocumentSnapshot;
}

/**
 * クエリオプション
 *
 * @description
 * FirestoreBaseService で使用されるクエリオプション
 */
export interface QueryOptions {
  /** 取得件数制限 */
  limit?: number;
  /** 開始位置（前回の最後のドキュメント） */
  startAfter?: DocumentSnapshot;
  /** ソートフィールド */
  orderBy?: string;
  /** ソート方向 */
  direction?: 'asc' | 'desc';
}
