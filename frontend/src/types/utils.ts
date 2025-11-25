/**
 * Utility 関連型定義
 *
 * @description
 * カテゴリー、プロファイラー、ブランド型など、
 * ユーティリティ関連の全ての型を定義
 */

import { z } from 'zod';

// ============================================================
// Category Types
// ============================================================

/**
 * 商品カテゴリー
 */
export interface Category {
  code: string;
  name: string;
}

/**
 * 大カテゴリー
 */
export interface MainCategory {
  code: string;
  name: string;
  subCategories: Category[];
}

// ============================================================
// Profiler Types
// ============================================================

/**
 * プロファイラー測定結果
 */
export interface ProfilerMeasurement {
  /** プロファイラーID */
  id: string;
  /** フェーズ（mount, update, or nested-update） */
  phase: 'mount' | 'update' | 'nested-update';
  /** 実際のレンダリング時間（ミリ秒） */
  actualDuration: number;
  /** ベースレンダリング時間（ミリ秒） */
  baseDuration: number;
  /** レンダリング開始時刻 */
  startTime: number;
  /** コミット時刻 */
  commitTime: number;
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * プロファイラーコールバック関数の型
 */
export type ProfilerCallback = (measurement: ProfilerMeasurement) => void;

// ============================================================
// Branded Types (ID types)
// ============================================================

/**
 * ユーザーID（Firebase Auth UID）
 */
export const UserIdSchema = z.string().min(1).brand('UserId');
export type UserId = z.infer<typeof UserIdSchema>;

/**
 * 注文ID（Firestore Document ID）
 */
export const OrderIdSchema = z.string().min(1).brand('OrderId');
export type OrderId = z.infer<typeof OrderIdSchema>;

/**
 * 店舗ID（0-35 の範囲）
 */
export const StoreIdSchema = z.number().int().min(0).max(35).brand('StoreId');
export type StoreId = z.infer<typeof StoreIdSchema>;

/**
 * 店舗コード（Firestore で使用される文字列コード）
 */
export const StoreCodeSchema = z.string().regex(/^\d+$/).brand('StoreCode');
export type StoreCode = z.infer<typeof StoreCodeSchema>;

/**
 * 帳合先ID
 */
export const SupplierIdSchema = z.string().min(1).brand('SupplierId');
export type SupplierId = z.infer<typeof SupplierIdSchema>;

/**
 * 商品履歴ID
 */
export const ProductHistoryIdSchema = z.string().min(1).brand('ProductHistoryId');
export type ProductHistoryId = z.infer<typeof ProductHistoryIdSchema>;

/**
 * プリセットID
 */
export const PresetIdSchema = z.string().min(1).brand('PresetId');
export type PresetId = z.infer<typeof PresetIdSchema>;

/**
 * メールアドレスID
 */
export const EmailAddressIdSchema = z.string().min(1).brand('EmailAddressId');
export type EmailAddressId = z.infer<typeof EmailAddressIdSchema>;

/**
 * ファイル名（拡張子を含む）
 */
export const FileNameSchema = z.string().min(1).brand('FileName');
export type FileName = z.infer<typeof FileNameSchema>;

/**
 * ダウンロードURL
 */
export const DownloadUrlSchema = z.string().url().brand('DownloadUrl');
export type DownloadUrl = z.infer<typeof DownloadUrlSchema>;
