/**
 * 型定義の単一情報源（Single Source of Truth）
 *
 * @description
 * アプリケーション全体で使用される型定義を一元管理します。
 * ドメインごとにファイルを分割し、このファイルで re-export することで、
 * 既存のインポートパスを変更せずに段階的な移行が可能です。
 *
 * ## 使用方法
 *
 * ### 推奨: ドメイン別インポート（新規コード）
 * ```typescript
 * import type { ProductData } from '@/types/product';
 * import type { OrderData } from '@/types/order';
 * import type { StoreData } from '@/types/store';
 * ```
 *
 * ### 後方互換性: 統合インポート（既存コード）
 * ```typescript
 * import type { ProductData, OrderData, StoreData } from '@/types';
 * ```
 *
 * ## ファイル構成
 * - `product.ts` - 商品関連型
 * - `order.ts` - 注文関連型
 * - `store.ts` - 店舗関連型
 * - `api.ts` - API 通信型
 * - `firebase.ts` - Firebase 型
 * - `repository.ts` - Repository 層型
 * - `ui.ts` - UI utility 型
 * - `hooks.ts` - Hook 戻り値型
 * - `services.ts` - Service interfaces
 * - `utils.ts` - Utility 型（カテゴリー、プロファイラー、ブランド型）
 * - `userSettings.ts` - ユーザー設定型
 * - `storeSettings.ts` - 店舗設定型
 * - `storeCategory.ts` - 店舗カテゴリ型
 */

// ============================================================
// Product Types
// ============================================================
export type { ProductData, ProductFormData } from './product';

// ============================================================
// Order Types
// ============================================================
export type { OrderData, OrderFormData, CalendarEvent } from './order';

// ============================================================
// Store Types
// ============================================================
export type { StoreData } from './store';
export { STORE_NAMES } from './store';

// ============================================================
// API Types
// ============================================================
export type {
  TemplateRequest,
  TemplateResponse,
  ErrorResponse,
  VersionResponse,
  FirebaseConfigResponse,
} from './api';

// ============================================================
// Firebase Types
// ============================================================
export type { FirestoreOrderData, AutocompleteHistoryData } from './firebase';

// ============================================================
// Repository Types
// ============================================================
export type {
  AutocompleteField,
  AutocompleteHistory,
  EmailAddress,
  SupplierPreset,
  PricingHistory,
  ProductHistory,
  DeleteProductHistoryConditions,
} from './repository';

// ============================================================
// UI Types
// ============================================================
export type {
  DeviceInfo,
  NotificationData,
  NotificationSeverity,
  GestureType,
  HapticType,
  FormStep,
  DeleteDialogState,
  BookNameDialogState,
  SupplierRemovalDialogState,
  ModalState,
} from './ui';

// ============================================================
// Hook Types
// ============================================================
export type {
  UseAuthReturn,
  UseDataSyncReturn,
  UseIndexedDBReturn,
  ProductHistoryItem,
  PricingHistoryItem,
  KeyboardShortcut,
  GeneratedFiles,
} from './hooks';

// ============================================================
// Service Types
// ============================================================
export type {
  IFirestoreService,
  ITemplateService,
  ISessionStorageService,
  Services,
  IndexedDBOrderData,
  EmailSendOptions,
  PaginatedResult,
  QueryOptions,
} from './services';

// ============================================================
// Utility Types
// ============================================================
export type {
  Category,
  MainCategory,
  ProfilerMeasurement,
  ProfilerCallback,
  UserId,
  OrderId,
  StoreId,
  StoreCode,
  SupplierId,
  ProductHistoryId,
  PresetId,
  EmailAddressId,
  FileName,
  DownloadUrl,
} from './utils';

export {
  UserIdSchema,
  OrderIdSchema,
  StoreIdSchema,
  StoreCodeSchema,
  SupplierIdSchema,
  ProductHistoryIdSchema,
  PresetIdSchema,
  EmailAddressIdSchema,
  FileNameSchema,
  DownloadUrlSchema,
} from './utils';

// ============================================================
// Settings Types
// ============================================================
export type { UserSettings, EmailAddressEntry, SupplierPresetEntry } from './userSettings';
export type { StoreSettings } from './storeSettings';
export type { StoreCategory } from './storeCategory';
