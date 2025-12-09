import { describe, it, expect } from 'vitest';
import { OrderService } from '../OrderService';

describe('OrderService', () => {
  describe('calculateCenterCostWithFee', () => {
    it('should calculate center cost with fee correctly', () => {
      expect(OrderService.calculateCenterCostWithFee(100, 13)).toBe(113);
      expect(OrderService.calculateCenterCostWithFee(100, 10)).toBe(110);
      expect(OrderService.calculateCenterCostWithFee(200, 15)).toBe(230);
    });

    it('should round to nearest integer', () => {
      expect(OrderService.calculateCenterCostWithFee(100, 13.5)).toBe(114); // 113.5 → 114
      expect(OrderService.calculateCenterCostWithFee(100, 13.4)).toBe(113); // 113.4 → 113
    });

    it('should return 0 for zero or negative center cost', () => {
      expect(OrderService.calculateCenterCostWithFee(0, 13)).toBe(0);
      expect(OrderService.calculateCenterCostWithFee(-100, 13)).toBe(0);
    });
  });

  describe('calculateProfitMargin', () => {
    it('should calculate profit margin correctly', () => {
      expect(OrderService.calculateProfitMargin(150, 100)).toBe(33.3);
      expect(OrderService.calculateProfitMargin(200, 150)).toBe(25.0);
      expect(OrderService.calculateProfitMargin(100, 70)).toBe(30.0);
    });

    it('should return 0 for invalid inputs', () => {
      expect(OrderService.calculateProfitMargin(0, 100)).toBe(0); // 売価0は無効
      expect(OrderService.calculateProfitMargin(-150, 100)).toBe(0); // 負の売価は無効
    });

    it('should handle zero store cost (free promotional items)', () => {
      // storeCost=0は有効（無料プロモーション商品）→ 100%マージン
      expect(OrderService.calculateProfitMargin(150, 0)).toBe(100);
    });

    it('should handle negative margins', () => {
      expect(OrderService.calculateProfitMargin(100, 120)).toBe(-20.0);
    });
  });

  describe('calculateProfitAmount', () => {
    it('should calculate profit amount correctly', () => {
      expect(OrderService.calculateProfitAmount(120, 113, 10, 10)).toBe(700);
      expect(OrderService.calculateProfitAmount(100, 110, 5, 20)).toBe(-1000);
      expect(OrderService.calculateProfitAmount(150, 100, 8, 12)).toBe(4800);
    });

    it('should return 0 when quantity is zero', () => {
      // 数量が0の場合は結果も0
      expect(OrderService.calculateProfitAmount(120, 113, 0, 10)).toBe(0);
      expect(OrderService.calculateProfitAmount(120, 113, 10, 0)).toBe(0);
    });

    it('should handle zero cost values (promotional items)', () => {
      // storeCost=0は有効（無料プロモーション商品）→ 損失が発生
      expect(OrderService.calculateProfitAmount(0, 113, 10, 10)).toBe(-11300);
      // centerCostWithFee=0は有効 → 全額利益
      expect(OrderService.calculateProfitAmount(120, 0, 10, 10)).toBe(12000);
    });
  });

  describe('estimateStoreCost', () => {
    it('should estimate store cost from center cost', () => {
      expect(OrderService.estimateStoreCost(100, 13)).toBe(113);
      expect(OrderService.estimateStoreCost(200, 10)).toBe(220);
    });
  });

  describe('estimatePrice', () => {
    it('should estimate price from store cost and target margin', () => {
      expect(OrderService.estimatePrice(100, 30)).toBe(143); // 100 / 0.7 ≒ 142.857
      expect(OrderService.estimatePrice(150, 25)).toBe(200); // 150 / 0.75 = 200
      expect(OrderService.estimatePrice(70, 40)).toBe(117); // 70 / 0.6 ≒ 116.667
    });

    it('should return 0 for invalid inputs', () => {
      expect(OrderService.estimatePrice(-100, 30)).toBe(0); // 負の原価は無効
      expect(OrderService.estimatePrice(100, 0)).toBe(0);    // 0%マージンは無効
      expect(OrderService.estimatePrice(100, 100)).toBe(0);  // 100%マージンは無効（ゼロ除算）
      expect(OrderService.estimatePrice(100, -10)).toBe(0);  // 負のマージンは無効
    });

    it('should handle zero store cost (free promotional items)', () => {
      // storeCost=0は有効（無料プロモーション商品）→ 売価も0
      expect(OrderService.estimatePrice(0, 30)).toBe(0);
    });
  });

  describe('validateAllocation', () => {
    it('should validate matching allocations', () => {
      expect(OrderService.validateAllocation([2, 3, 5], 10)).toBe(true);
      expect(OrderService.validateAllocation([1, 1, 1, 1], 4)).toBe(true);
      expect(OrderService.validateAllocation([0, 0, 10], 10)).toBe(true);
    });

    it('should reject non-matching allocations', () => {
      expect(OrderService.validateAllocation([2, 3, 5], 11)).toBe(false);
      expect(OrderService.validateAllocation([1, 1, 1], 4)).toBe(false);
    });

    it('should handle empty or zero allocations', () => {
      expect(OrderService.validateAllocation([], 0)).toBe(true);
      expect(OrderService.validateAllocation([0, 0, 0], 0)).toBe(true);
    });
  });

  describe('calculateAllocationTotal', () => {
    it('should calculate total correctly', () => {
      expect(OrderService.calculateAllocationTotal([2, 3, 5])).toBe(10);
      expect(OrderService.calculateAllocationTotal([1, 1, 1, 1])).toBe(4);
      expect(OrderService.calculateAllocationTotal([0, 10, 0])).toBe(10);
    });

    it('should handle empty array', () => {
      expect(OrderService.calculateAllocationTotal([])).toBe(0);
    });

    it('should ignore null/undefined values', () => {
      expect(OrderService.calculateAllocationTotal([1, null as any, 3])).toBe(4);
      expect(OrderService.calculateAllocationTotal([1, undefined as any, 3])).toBe(4);
    });
  });

  describe('calculateEvenAllocation', () => {
    it('should distribute evenly when divisible', () => {
      expect(OrderService.calculateEvenAllocation(9, 3)).toEqual([3, 3, 3]);
      expect(OrderService.calculateEvenAllocation(10, 5)).toEqual([2, 2, 2, 2, 2]);
    });

    it('should distribute remainder to first stores', () => {
      expect(OrderService.calculateEvenAllocation(10, 3)).toEqual([4, 3, 3]);
      expect(OrderService.calculateEvenAllocation(11, 4)).toEqual([3, 3, 3, 2]);
      expect(OrderService.calculateEvenAllocation(7, 3)).toEqual([3, 2, 2]);
    });

    it('should handle zero or negative inputs', () => {
      expect(OrderService.calculateEvenAllocation(0, 3)).toEqual([0, 0, 0]);
      expect(OrderService.calculateEvenAllocation(-10, 3)).toEqual([0, 0, 0]);
      expect(OrderService.calculateEvenAllocation(10, 0)).toEqual([]);
    });

    it('should handle single store', () => {
      expect(OrderService.calculateEvenAllocation(10, 1)).toEqual([10]);
    });
  });

  describe('calculateProportionalAllocation', () => {
    it('should maintain proportion when scaling up', () => {
      expect(OrderService.calculateProportionalAllocation([2, 3, 5], 20)).toEqual([4, 6, 10]);
      expect(OrderService.calculateProportionalAllocation([1, 2, 3], 12)).toEqual([2, 4, 6]);
    });

    it('should maintain proportion when scaling down', () => {
      expect(OrderService.calculateProportionalAllocation([4, 6, 10], 10)).toEqual([2, 3, 5]);
    });

    it('should handle rounding by adding shortfall to largest', () => {
      // 3:2:1 を 11に配分 → 理想: [5.5, 3.67, 1.83] → 実際: [5, 3, 1] → 足りない2を最大に追加 → [7, 3, 1]
      expect(OrderService.calculateProportionalAllocation([3, 2, 1], 11)).toEqual([7, 3, 1]);
    });

    it('should handle zero current allocations', () => {
      expect(OrderService.calculateProportionalAllocation([0, 0, 0], 10)).toEqual([4, 3, 3]);
    });

    it('should handle zero new total delivery', () => {
      expect(OrderService.calculateProportionalAllocation([2, 3, 5], 0)).toEqual([0, 0, 0]);
    });

    it('should handle negative new total delivery', () => {
      expect(OrderService.calculateProportionalAllocation([2, 3, 5], -10)).toEqual([0, 0, 0]);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with commas', () => {
      expect(OrderService.formatCurrency(1234)).toBe('1,234円');
      expect(OrderService.formatCurrency(1234567)).toBe('1,234,567円');
      expect(OrderService.formatCurrency(100)).toBe('100円');
    });

    it('should handle zero and negative', () => {
      expect(OrderService.formatCurrency(0)).toBe('0円');
      expect(OrderService.formatCurrency(-1234)).toBe('-1,234円');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default 1 decimal', () => {
      expect(OrderService.formatPercentage(33.333)).toBe('33.3%');
      expect(OrderService.formatPercentage(25.0)).toBe('25.0%');
      expect(OrderService.formatPercentage(10.567)).toBe('10.6%');
    });

    it('should respect custom decimal places', () => {
      expect(OrderService.formatPercentage(33.333, 0)).toBe('33%');
      expect(OrderService.formatPercentage(33.333, 2)).toBe('33.33%');
      expect(OrderService.formatPercentage(33.333, 3)).toBe('33.333%');
    });

    it('should handle zero and negative', () => {
      expect(OrderService.formatPercentage(0)).toBe('0.0%');
      expect(OrderService.formatPercentage(-10.5)).toBe('-10.5%');
    });
  });
});
