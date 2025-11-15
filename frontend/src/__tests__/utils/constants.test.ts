import { describe, it, expect } from 'vitest';
import { STORE_NAMES, STORE_COUNT, DEFAULT_PRODUCT_FORM_DATA, MAX_LENGTH } from '@/utils/constants';

describe('constants', () => {
  describe('STORE_NAMES', () => {
    it('should have exactly 36 stores', () => {
      expect(STORE_NAMES).toHaveLength(36);
    });

    it('should match STORE_COUNT', () => {
      expect(STORE_NAMES.length).toBe(STORE_COUNT);
    });

    it('should contain valid store names', () => {
      expect(STORE_NAMES[0]).toBe('阪急1');
      expect(STORE_NAMES[6]).toBe('阪急百貨店本店');
      expect(STORE_NAMES[35]).toBe('神戸阪急');
    });

    it('should not have duplicate names', () => {
      const uniqueNames = new Set(STORE_NAMES);
      expect(uniqueNames.size).toBe(STORE_NAMES.length);
    });
  });

  describe('DEFAULT_PRODUCT_FORM_DATA', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_PRODUCT_FORM_DATA.name).toBe('');
      expect(DEFAULT_PRODUCT_FORM_DATA.origin).toBe('');
      expect(DEFAULT_PRODUCT_FORM_DATA.specification).toBe('');
      expect(DEFAULT_PRODUCT_FORM_DATA.quantityPerPackage).toBe(1);
      expect(DEFAULT_PRODUCT_FORM_DATA.storeCost).toBe(0);
      expect(DEFAULT_PRODUCT_FORM_DATA.priceExcludingTax).toBe(0);
    });

    it('should not have storeAllocations by default', () => {
      expect(DEFAULT_PRODUCT_FORM_DATA.storeAllocations).toBeUndefined();
    });
  });

  describe('MAX_LENGTH', () => {
    it('should have sensible max lengths', () => {
      expect(MAX_LENGTH.PRODUCT_NAME).toBeGreaterThan(0);
      expect(MAX_LENGTH.ORIGIN).toBeGreaterThan(0);
      expect(MAX_LENGTH.SPECIFICATION).toBeGreaterThan(0);
      expect(MAX_LENGTH.SUPPLIER).toBeGreaterThan(0);
    });

    it('should have reasonable limits', () => {
      expect(MAX_LENGTH.PRODUCT_NAME).toBeLessThanOrEqual(200);
      expect(MAX_LENGTH.ORIGIN).toBeLessThanOrEqual(200);
      expect(MAX_LENGTH.SPECIFICATION).toBeLessThanOrEqual(500);
      expect(MAX_LENGTH.SUPPLIER).toBeLessThanOrEqual(200);
    });
  });
});
