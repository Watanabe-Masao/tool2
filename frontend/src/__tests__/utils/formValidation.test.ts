import { describe, it, expect } from 'vitest';
import {
  getMissingPricingFields,
  isPricingComplete,
  calculateAllocationStatus,
  getIncompleteProductsPricing,
} from '@/utils/formValidation';
import type { ProductFormData } from '@/schemas/orderSchema';

describe('formValidation', () => {
  describe('getMissingPricingFields', () => {
    it('すべてのフィールドが入力されている場合、空配列を返す', () => {
      const product = {
        centerCost: 100,
        centerFeeRate: 5,
        storeCost: 120,
        priceExcludingTax: 200,
        totalDelivery: 50,
      } as ProductFormData;

      expect(getMissingPricingFields(product)).toEqual([]);
    });

    it('すべてのフィールドがnullの場合、全フィールド名を返す', () => {
      const product = {
        centerCost: null,
        centerFeeRate: null,
        storeCost: null,
        priceExcludingTax: null,
        totalDelivery: null,
      } as ProductFormData;

      const result = getMissingPricingFields(product);
      expect(result).toContain('センター着原価');
      expect(result).toContain('センターフィー率');
      expect(result).toContain('店着原価');
      expect(result).toContain('本体価格');
      expect(result).toContain('総納品数');
      expect(result).toHaveLength(5);
    });

    it('一部のフィールドのみnullの場合、そのフィールド名のみ返す', () => {
      const product = {
        centerCost: 100,
        centerFeeRate: null,
        storeCost: 120,
        priceExcludingTax: null,
        totalDelivery: 50,
      } as ProductFormData;

      const result = getMissingPricingFields(product);
      expect(result).toContain('センターフィー率');
      expect(result).toContain('本体価格');
      expect(result).toHaveLength(2);
    });

    it('0は有効な値として扱われる', () => {
      const product = {
        centerCost: 0,
        centerFeeRate: 0,
        storeCost: 0,
        priceExcludingTax: 0,
        totalDelivery: 0,
      } as ProductFormData;

      expect(getMissingPricingFields(product)).toEqual([]);
    });
  });

  describe('isPricingComplete', () => {
    it('すべてのフィールドが入力されている場合、trueを返す', () => {
      const product = {
        centerCost: 100,
        centerFeeRate: 5,
        storeCost: 120,
        priceExcludingTax: 200,
        totalDelivery: 50,
      } as ProductFormData;

      expect(isPricingComplete(product)).toBe(true);
    });

    it('未入力フィールドがある場合、falseを返す', () => {
      const product = {
        centerCost: null,
        centerFeeRate: 5,
        storeCost: 120,
        priceExcludingTax: 200,
        totalDelivery: 50,
      } as ProductFormData;

      expect(isPricingComplete(product)).toBe(false);
    });
  });

  describe('calculateAllocationStatus', () => {
    it('配分が完了している場合、isCompleteがtrueになる', () => {
      const allocations = [10, 20, 30, 40]; // 合計 100
      const totalDelivery = 100;

      const result = calculateAllocationStatus(allocations, totalDelivery);

      expect(result.totalAllocated).toBe(100);
      expect(result.remaining).toBe(0);
      expect(result.isComplete).toBe(true);
      expect(result.isExceeded).toBe(false);
    });

    it('配分が不足している場合、remainingが正の値になる', () => {
      const allocations = [10, 20]; // 合計 30
      const totalDelivery = 100;

      const result = calculateAllocationStatus(allocations, totalDelivery);

      expect(result.totalAllocated).toBe(30);
      expect(result.remaining).toBe(70);
      expect(result.isComplete).toBe(false);
      expect(result.isExceeded).toBe(false);
    });

    it('配分が超過している場合、isExceededがtrueになる', () => {
      const allocations = [50, 60]; // 合計 110
      const totalDelivery = 100;

      const result = calculateAllocationStatus(allocations, totalDelivery);

      expect(result.totalAllocated).toBe(110);
      expect(result.remaining).toBe(-10);
      expect(result.isComplete).toBe(false);
      expect(result.isExceeded).toBe(true);
    });

    it('空の配列の場合、totalAllocatedが0になる', () => {
      const allocations: number[] = [];
      const totalDelivery = 100;

      const result = calculateAllocationStatus(allocations, totalDelivery);

      expect(result.totalAllocated).toBe(0);
      expect(result.remaining).toBe(100);
      expect(result.isComplete).toBe(false);
      expect(result.isExceeded).toBe(false);
    });
  });

  describe('getIncompleteProductsPricing', () => {
    it('すべての商品が完了している場合、空配列を返す', () => {
      const products = [
        {
          centerCost: 100,
          centerFeeRate: 5,
          storeCost: 120,
          priceExcludingTax: 200,
          totalDelivery: 50,
        },
        {
          centerCost: 150,
          centerFeeRate: 3,
          storeCost: 180,
          priceExcludingTax: 300,
          totalDelivery: 30,
        },
      ] as ProductFormData[];

      expect(getIncompleteProductsPricing(products)).toEqual([]);
    });

    it('未入力がある商品のインデックスとフィールド名を返す', () => {
      const products = [
        {
          centerCost: 100,
          centerFeeRate: 5,
          storeCost: 120,
          priceExcludingTax: 200,
          totalDelivery: 50,
        },
        {
          centerCost: null,
          centerFeeRate: null,
          storeCost: 180,
          priceExcludingTax: 300,
          totalDelivery: 30,
        },
        {
          centerCost: 200,
          centerFeeRate: 5,
          storeCost: null,
          priceExcludingTax: null,
          totalDelivery: null,
        },
      ] as ProductFormData[];

      const result = getIncompleteProductsPricing(products);

      expect(result).toHaveLength(2);

      // 商品2（インデックス1）
      expect(result[0].index).toBe(1);
      expect(result[0].fields).toContain('センター着原価');
      expect(result[0].fields).toContain('センターフィー率');

      // 商品3（インデックス2）
      expect(result[1].index).toBe(2);
      expect(result[1].fields).toContain('店着原価');
      expect(result[1].fields).toContain('本体価格');
      expect(result[1].fields).toContain('総納品数');
    });

    it('空の配列の場合、空配列を返す', () => {
      expect(getIncompleteProductsPricing([])).toEqual([]);
    });
  });
});
