/**
 * 注文関連型定義
 *
 * @description
 * 注文データ、注文フォーム、注文履歴など、注文ドメインに関連する全ての型を定義
 */

import type { ProductData, ProductFormData } from './product';

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
 * React Hook Form用のフォームデータ
 *
 * @deprecated この型は orderSchema.ts から自動生成される型と重複しています
 * 将来的には Zod schema から生成される型を使用してください
 */
export interface OrderFormData {
  /** 店着日 */
  deliveryDate: Date;
  /** 帳合先リスト */
  suppliers: string[];
  /** 商品リスト */
  products: ProductFormData[];
}

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
