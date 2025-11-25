import { z } from 'zod';
import {
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
} from '@/types/utils';

/**
 * ブランド型ユーティリティ
 *
 * @description
 * Zod のブランド型機能を使用して、文字列や数値に型レベルの意味を付与します。
 * これにより、異なる種類のIDや識別子を誤って混同することを防ぎます。
 *
 * @example
 * ```typescript
 * const userId: UserId = '123' as UserId; // Type error!
 * const userId = UserIdSchema.parse('123'); // OK
 *
 * function getUserOrders(userId: UserId): Order[] {
 *   // userId は UserId 型であることが保証される
 * }
 *
 * const orderId: OrderId = '456' as OrderId;
 * getUserOrders(orderId); // Type error! OrderId と UserId は互換性がない
 * ```
 */

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
} from '@/types/utils';

export type {
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
} from '@/types/utils';

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * ブランド型から元の型に変換
 *
 * @description
 * ブランド型の値を元のプリミティブ型として扱う必要がある場合に使用します。
 * 主にレガシーコードとの互換性のために使用します。
 *
 * @example
 * ```typescript
 * const userId = UserIdSchema.parse('123');
 * const plainString = unbrand(userId); // string型
 * ```
 */
export function unbrand<T extends string | number>(value: T): T {
  return value;
}

/**
 * 複数のブランド型値を一括で変換
 *
 * @example
 * ```typescript
 * const userIds = [
 *   UserIdSchema.parse('123'),
 *   UserIdSchema.parse('456'),
 * ];
 * const plainStrings = unbrandAll(userIds);
 * ```
 */
export function unbrandAll<T extends string | number>(values: T[]): T[] {
  return values;
}

/**
 * 安全なブランド型パース
 *
 * @description
 * バリデーションエラーを throw せずに、成功/失敗を Result 型で返します。
 *
 * @example
 * ```typescript
 * const result = safeParseBrand(UserIdSchema, '123');
 * if (result.success) {
 *   console.log(result.data); // UserId
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function safeParseBrand<T extends z.ZodBranded<any, any>>(
  schema: T,
  value: unknown
): z.SafeParseReturnType<unknown, z.infer<T>> {
  return schema.safeParse(value);
}

// ============================================================
// 型ガード
// ============================================================

/**
 * UserId 型ガード
 */
export function isUserId(value: unknown): value is UserId {
  return UserIdSchema.safeParse(value).success;
}

/**
 * OrderId 型ガード
 */
export function isOrderId(value: unknown): value is OrderId {
  return OrderIdSchema.safeParse(value).success;
}

/**
 * StoreId 型ガード
 */
export function isStoreId(value: unknown): value is StoreId {
  return StoreIdSchema.safeParse(value).success;
}

/**
 * StoreCode 型ガード
 */
export function isStoreCode(value: unknown): value is StoreCode {
  return StoreCodeSchema.safeParse(value).success;
}
