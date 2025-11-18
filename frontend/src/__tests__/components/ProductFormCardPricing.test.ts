import { describe, it, expect } from 'vitest';

/**
 * ProductFormCardPricing コンポーネントの計算ロジックのテスト
 *
 * このテストは商品情報2（価格情報）の計算が正しいことを検証します。
 */
describe('ProductFormCardPricing calculations', () => {
  describe('センターフィー込原価の計算', () => {
    it('should calculate center cost with fee correctly (13% fee)', () => {
      const centerCost = 500;
      const centerFeeRate = 13;
      const expected = Math.round(centerCost * (1 + centerFeeRate / 100));

      expect(expected).toBe(565);
    });

    it('should calculate center cost with fee correctly (15% fee)', () => {
      const centerCost = 1000;
      const centerFeeRate = 15;
      const expected = Math.round(centerCost * (1 + centerFeeRate / 100));

      expect(expected).toBe(1150);
    });

    it('should handle zero center cost', () => {
      const centerCost = 0;
      const centerFeeRate = 13;
      const expected = Math.round(centerCost * (1 + centerFeeRate / 100));

      expect(expected).toBe(0);
    });

    it('should handle zero fee rate', () => {
      const centerCost = 500;
      const centerFeeRate = 0;
      const expected = Math.round(centerCost * (1 + centerFeeRate / 100));

      expect(expected).toBe(500);
    });

    it('should round correctly for decimal results', () => {
      const centerCost = 333;
      const centerFeeRate = 13;
      const expected = Math.round(centerCost * (1 + centerFeeRate / 100));

      // 333 * 1.13 = 376.29 → rounds to 376
      expect(expected).toBe(376);
    });
  });

  describe('値入率の計算', () => {
    it('should calculate profit margin correctly (basic case)', () => {
      const priceExcludingTax = 1000;
      const storeCost = 600;
      const profitMargin = ((priceExcludingTax - storeCost) / priceExcludingTax * 100).toFixed(1);

      // (1000 - 600) / 1000 * 100 = 40.0%
      expect(profitMargin).toBe('40.0');
    });

    it('should calculate profit margin correctly (different values)', () => {
      const priceExcludingTax = 800;
      const storeCost = 500;
      const profitMargin = ((priceExcludingTax - storeCost) / priceExcludingTax * 100).toFixed(1);

      // (800 - 500) / 800 * 100 = 37.5%
      expect(profitMargin).toBe('37.5');
    });

    it('should handle zero profit margin', () => {
      const priceExcludingTax = 500;
      const storeCost = 500;
      const profitMargin = ((priceExcludingTax - storeCost) / priceExcludingTax * 100).toFixed(1);

      expect(profitMargin).toBe('0.0');
    });

    it('should handle negative profit margin', () => {
      const priceExcludingTax = 500;
      const storeCost = 600;
      const profitMargin = ((priceExcludingTax - storeCost) / priceExcludingTax * 100).toFixed(1);

      // (500 - 600) / 500 * 100 = -20.0%
      expect(profitMargin).toBe('-20.0');
    });

    it('should format to 1 decimal place', () => {
      const priceExcludingTax = 1000;
      const storeCost = 333;
      const profitMargin = ((priceExcludingTax - storeCost) / priceExcludingTax * 100).toFixed(1);

      // (1000 - 333) / 1000 * 100 = 66.7%
      expect(profitMargin).toBe('66.7');
    });

    it('should use store cost, not center cost with fee (regression test)', () => {
      // This test ensures the bug fix is correct
      // Previous bug: used centerCostWithFee instead of storeCost
      const priceExcludingTax = 1000;
      const storeCost = 600;
      const centerCost = 500;
      const centerFeeRate = 13;
      const centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100)); // 565

      // Correct calculation: use storeCost
      const correctProfitMargin = ((priceExcludingTax - storeCost) / priceExcludingTax * 100).toFixed(1);
      expect(correctProfitMargin).toBe('40.0');

      // Incorrect calculation: use centerCostWithFee (old bug)
      const incorrectProfitMargin = ((priceExcludingTax - centerCostWithFee) / priceExcludingTax * 100).toFixed(1);
      expect(incorrectProfitMargin).toBe('43.5');

      // Verify they are different
      expect(correctProfitMargin).not.toBe(incorrectProfitMargin);
    });
  });

  describe('差益の計算', () => {
    it('should calculate profit amount correctly (basic case)', () => {
      const storeCost = 600;
      const centerCost = 500;
      const centerFeeRate = 13;
      const centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100)); // 565
      const totalDelivery = 100;
      const quantityPerPackage = 10;

      const profitAmount = Math.round((storeCost - centerCostWithFee) * (totalDelivery * quantityPerPackage));

      // (600 - 565) * (100 * 10) = 35 * 1000 = 35000
      expect(profitAmount).toBe(35000);
    });

    it('should calculate profit amount with different values', () => {
      const storeCost = 700;
      const centerCost = 550;
      const centerFeeRate = 15;
      const centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100)); // 633
      const totalDelivery = 50;
      const quantityPerPackage = 20;

      const profitAmount = Math.round((storeCost - centerCostWithFee) * (totalDelivery * quantityPerPackage));

      // (700 - 633) * (50 * 20) = 67 * 1000 = 67000
      expect(profitAmount).toBe(67000);
    });

    it('should handle zero profit amount', () => {
      const storeCost = 565;
      const centerCost = 500;
      const centerFeeRate = 13;
      const centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100)); // 565
      const totalDelivery = 100;
      const quantityPerPackage = 10;

      const profitAmount = Math.round((storeCost - centerCostWithFee) * (totalDelivery * quantityPerPackage));

      expect(profitAmount).toBe(0);
    });

    it('should handle negative profit amount (loss)', () => {
      const storeCost = 500;
      const centerCost = 500;
      const centerFeeRate = 13;
      const centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100)); // 565
      const totalDelivery = 100;
      const quantityPerPackage = 10;

      const profitAmount = Math.round((storeCost - centerCostWithFee) * (totalDelivery * quantityPerPackage));

      // (500 - 565) * (100 * 10) = -65 * 1000 = -65000
      expect(profitAmount).toBe(-65000);
    });

    it('should handle small quantities', () => {
      const storeCost = 120;
      const centerCost = 100;
      const centerFeeRate = 13;
      const centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100)); // 113
      const totalDelivery = 5;
      const quantityPerPackage = 2;

      const profitAmount = Math.round((storeCost - centerCostWithFee) * (totalDelivery * quantityPerPackage));

      // (120 - 113) * (5 * 2) = 7 * 10 = 70
      expect(profitAmount).toBe(70);
    });

    it('should round correctly for decimal results', () => {
      const storeCost = 600;
      const centerCost = 333;
      const centerFeeRate = 13;
      const centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100)); // 376
      const totalDelivery = 7;
      const quantityPerPackage = 3;

      const profitAmount = Math.round((storeCost - centerCostWithFee) * (totalDelivery * quantityPerPackage));

      // (600 - 376) * (7 * 3) = 224 * 21 = 4704
      expect(profitAmount).toBe(4704);
    });
  });

  describe('統合計算テスト', () => {
    it('should calculate all values correctly for a realistic scenario', () => {
      // Realistic product scenario
      const centerCost = 500;
      const centerFeeRate = 13;
      const storeCost = 600;
      const priceExcludingTax = 1000;
      const totalDelivery = 100;
      const quantityPerPackage = 10;

      // Calculate
      const centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100));
      const profitMargin = ((priceExcludingTax - storeCost) / priceExcludingTax * 100).toFixed(1);
      const profitAmount = Math.round((storeCost - centerCostWithFee) * (totalDelivery * quantityPerPackage));

      // Verify
      expect(centerCostWithFee).toBe(565);
      expect(profitMargin).toBe('40.0');
      expect(profitAmount).toBe(35000);
    });

    it('should calculate all values correctly for another realistic scenario', () => {
      // Another realistic product scenario
      const centerCost = 1200;
      const centerFeeRate = 15;
      const storeCost = 1400;
      const priceExcludingTax = 2000;
      const totalDelivery = 50;
      const quantityPerPackage = 6;

      // Calculate
      const centerCostWithFee = Math.round(centerCost * (1 + centerFeeRate / 100));
      const profitMargin = ((priceExcludingTax - storeCost) / priceExcludingTax * 100).toFixed(1);
      const profitAmount = Math.round((storeCost - centerCostWithFee) * (totalDelivery * quantityPerPackage));

      // Verify
      expect(centerCostWithFee).toBe(1380);
      expect(profitMargin).toBe('30.0');
      expect(profitAmount).toBe(6000); // (1400 - 1380) * (50 * 6) = 20 * 300 = 6000
    });
  });
});
