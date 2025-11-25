/**
 * Service 関連型定義
 *
 * @description
 * サービス層のインターフェース、データ型など、サービスに関連する全ての型を定義
 */

import type { OrderFormData } from '@/schemas/orderSchema';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { FirestoreService } from '@/services/firebase/firestoreService';
import type { TemplateService } from '@/services/api/templateService';
import type { SessionStorageService } from '@/utils/sessionStorageService';

// ============================================================
// Service Interfaces (DI用)
// ============================================================

/**
 * Firestore Service インターフェース
 *
 * @description
 * Firestore操作のインターフェース定義
 * DIパターンに従い、実装を抽象化
 */
export interface IFirestoreService {
  saveProductHistory: typeof FirestoreService.saveProductHistory;
  savePricingHistory: typeof FirestoreService.savePricingHistory;
  saveAutocompleteHistory: typeof FirestoreService.saveAutocompleteHistory;
  getAutocompleteHistory: typeof FirestoreService.getAutocompleteHistory;
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
