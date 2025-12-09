/**
 * 注文関連型定義
 *
 * @description
 * 注文データ、注文フォーム、注文履歴など、注文ドメインに関連する全ての型を定義
 *
 * NOTE: フォーム用の型 (OrderFormData) は @/schemas/orderSchema からインポートしてください
 */

import type { ProductData } from './product';

/**
 * 注文データ
 */
export interface OrderData {
  /** Firestore ID */
  id?: string;
  /** 店着日 */
  deliveryDate: Date;
  /** 帳合先リスト */
  suppliers: string[];
  /** 商品リスト */
  products: ProductData[];
  /** バイヤー名 */
  buyerName: string;
  /** 作成日時 */
  timestamp: Date;
  /** ユーザーID */
  userId: string;
}

/**
 * OrderFormData型のre-export
 *
 * @description
 * 後方互換性のため、OrderFormDataを@/schemas/orderSchemaから再エクスポート
 * 新規コードでは直接 @/schemas/orderSchema からインポートしてください
 */
export type { OrderFormData } from '@/schemas/orderSchema';

/**
 * カレンダーイベント
 */
export interface CalendarEvent {
  /** イベントID */
  id: string;
  /** 日付 */
  date: Date;
  /** 帳合先リスト */
  suppliers: string[];
  /** 商品数 */
  productCount: number;
  /** 注文データ */
  orderData: OrderData;
}
