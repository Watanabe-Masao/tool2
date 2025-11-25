import { describe, it, expect } from 'vitest';
import {
  UserIdSchema,
  OrderIdSchema,
  StoreIdSchema,
  StoreCodeSchema,
  FileNameSchema,
  DownloadUrlSchema,
  unbrand,
  unbrandAll,
  safeParseBrand,
  isUserId,
  isOrderId,
  isStoreId,
  isStoreCode,
  type UserId,
  type OrderId,
  type StoreId,
} from '@/utils/brandedTypes';

describe('brandedTypes', () => {
  describe('UserIdSchema', () => {
    it('should parse valid user ID', () => {
      const userId = UserIdSchema.parse('user-123');
      expect(userId).toBe('user-123');
    });

    it('should reject empty string', () => {
      expect(() => UserIdSchema.parse('')).toThrow();
    });

    it('should be distinct from OrderId at type level', () => {
      const userId: UserId = UserIdSchema.parse('123');
      const orderId: OrderId = OrderIdSchema.parse('123');

      // TypeScript コンパイル時エラー（実行時は同じ値）
      // @ts-expect-error - UserId と OrderId は型レベルで異なる
      const _typeError: UserId = orderId;

      // 実行時は同じ値
      expect(userId).toBe(orderId);
    });
  });

  describe('OrderIdSchema', () => {
    it('should parse valid order ID', () => {
      const orderId = OrderIdSchema.parse('order-456');
      expect(orderId).toBe('order-456');
    });

    it('should reject empty string', () => {
      expect(() => OrderIdSchema.parse('')).toThrow();
    });
  });

  describe('StoreIdSchema', () => {
    it('should parse valid store ID (0-35)', () => {
      const storeId = StoreIdSchema.parse(0);
      expect(storeId).toBe(0);

      const maxStoreId = StoreIdSchema.parse(35);
      expect(maxStoreId).toBe(35);
    });

    it('should reject out of range values', () => {
      expect(() => StoreIdSchema.parse(-1)).toThrow();
      expect(() => StoreIdSchema.parse(36)).toThrow();
    });

    it('should reject non-integer values', () => {
      expect(() => StoreIdSchema.parse(1.5)).toThrow();
    });
  });

  describe('StoreCodeSchema', () => {
    it('should parse valid store code', () => {
      const storeCode = StoreCodeSchema.parse('01');
      expect(storeCode).toBe('01');

      const storeCode2 = StoreCodeSchema.parse('911');
      expect(storeCode2).toBe('911');
    });

    it('should reject non-numeric strings', () => {
      expect(() => StoreCodeSchema.parse('ABC')).toThrow();
      expect(() => StoreCodeSchema.parse('01A')).toThrow();
    });
  });

  describe('FileNameSchema', () => {
    it('should parse valid file name', () => {
      const fileName = FileNameSchema.parse('template.xlsx');
      expect(fileName).toBe('template.xlsx');
    });

    it('should reject empty string', () => {
      expect(() => FileNameSchema.parse('')).toThrow();
    });
  });

  describe('DownloadUrlSchema', () => {
    it('should parse valid URL', () => {
      const url = DownloadUrlSchema.parse('https://example.com/file.xlsx');
      expect(url).toBe('https://example.com/file.xlsx');
    });

    it('should reject invalid URL', () => {
      expect(() => DownloadUrlSchema.parse('not-a-url')).toThrow();
      expect(() => DownloadUrlSchema.parse('/relative/path')).toThrow();
    });
  });

  describe('unbrand', () => {
    it('should convert branded type to primitive', () => {
      const userId = UserIdSchema.parse('user-123');
      const plainString = unbrand(userId);
      expect(plainString).toBe('user-123');
    });

    it('should convert branded number to primitive', () => {
      const storeId = StoreIdSchema.parse(5);
      const plainNumber = unbrand(storeId);
      expect(plainNumber).toBe(5);
    });
  });

  describe('unbrandAll', () => {
    it('should convert array of branded types', () => {
      const userIds = [
        UserIdSchema.parse('user-1'),
        UserIdSchema.parse('user-2'),
        UserIdSchema.parse('user-3'),
      ];
      const plainStrings = unbrandAll(userIds);
      expect(plainStrings).toEqual(['user-1', 'user-2', 'user-3']);
    });
  });

  describe('safeParseBrand', () => {
    it('should return success result for valid value', () => {
      const result = safeParseBrand(UserIdSchema, 'user-123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('user-123');
      }
    });

    it('should return error result for invalid value', () => {
      const result = safeParseBrand(UserIdSchema, '');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should not throw on invalid value', () => {
      expect(() => safeParseBrand(StoreIdSchema, 100)).not.toThrow();
    });
  });

  describe('Type Guards', () => {
    describe('isUserId', () => {
      it('should return true for valid user ID', () => {
        expect(isUserId('user-123')).toBe(true);
      });

      it('should return false for invalid user ID', () => {
        expect(isUserId('')).toBe(false);
        expect(isUserId(123)).toBe(false);
        expect(isUserId(null)).toBe(false);
      });
    });

    describe('isOrderId', () => {
      it('should return true for valid order ID', () => {
        expect(isOrderId('order-456')).toBe(true);
      });

      it('should return false for invalid order ID', () => {
        expect(isOrderId('')).toBe(false);
      });
    });

    describe('isStoreId', () => {
      it('should return true for valid store ID', () => {
        expect(isStoreId(0)).toBe(true);
        expect(isStoreId(35)).toBe(true);
      });

      it('should return false for invalid store ID', () => {
        expect(isStoreId(-1)).toBe(false);
        expect(isStoreId(36)).toBe(false);
        expect(isStoreId('5')).toBe(false);
      });
    });

    describe('isStoreCode', () => {
      it('should return true for valid store code', () => {
        expect(isStoreCode('01')).toBe(true);
        expect(isStoreCode('911')).toBe(true);
      });

      it('should return false for invalid store code', () => {
        expect(isStoreCode('ABC')).toBe(false);
        expect(isStoreCode(1)).toBe(false);
      });
    });
  });

  describe('Type Safety', () => {
    it('should prevent mixing different branded types', () => {
      const userId: UserId = UserIdSchema.parse('123');
      const storeId: StoreId = StoreIdSchema.parse(5);

      // 実行時は異なる型（string vs number）
      expect(typeof userId).toBe('string');
      expect(typeof storeId).toBe('number');

      // TypeScript コンパイル時に型エラーが発生する
      // @ts-expect-error - UserId と StoreId は互換性がない
      const _typeError1: UserId = storeId;

      // @ts-expect-error - StoreId と UserId は互換性がない
      const _typeError2: StoreId = userId;
    });

    it('should allow same branded type assignment', () => {
      const userId1: UserId = UserIdSchema.parse('user-1');
      const userId2: UserId = userId1; // OK

      expect(userId2).toBe(userId1);
    });
  });
});
