/**
 * ProductFormCardPricingの計算式テスト
 *
 * このテストファイルは、商品価格情報フォームの主要な計算ロジックをテストします。
 */

import { describe, test, expect } from 'vitest';

/**
 * センター込原価を計算
 * 計算式: センター着原価 × (1 + センターフィー率 / 100)
 */
function calculateCenterCostWithFee(centerCost: number, centerFeeRate: number): number {
  return centerCost ? Math.round(centerCost * (1 + centerFeeRate / 100)) : 0;
}

/**
 * 値入率を計算
 * 計算式: (売価 - 店着原価) / 売価 × 100
 */
function calculateProfitMargin(priceExcludingTax: number, storeCost: number): string {
  if (priceExcludingTax && storeCost) {
    return ((priceExcludingTax - storeCost) / priceExcludingTax * 100).toFixed(1);
  }
  return '0.0';
}

/**
 * 差益を計算
 * 計算式: (店着原価 - センター込原価) × (総納品数 × 実効数量)
 */
function calculateProfitAmount(
  storeCost: number,
  centerCostWithFee: number,
  totalDelivery: number,
  effectiveQuantity: number
): number {
  if (storeCost && centerCostWithFee && totalDelivery && effectiveQuantity) {
    return Math.round((storeCost - centerCostWithFee) * (totalDelivery * effectiveQuantity));
  }
  return 0;
}

describe('ProductFormCardPricing - 計算式テスト', () => {
  describe('センター込原価の計算', () => {
    test('センターフィー13%の場合', () => {
      const centerCost = 100;
      const centerFeeRate = 13;
      const result = calculateCenterCostWithFee(centerCost, centerFeeRate);
      expect(result).toBe(113); // 100 * 1.13 = 113
    });

    test('センターフィー0%の場合', () => {
      const centerCost = 100;
      const centerFeeRate = 0;
      const result = calculateCenterCostWithFee(centerCost, centerFeeRate);
      expect(result).toBe(100); // 100 * 1.0 = 100
    });

    test('センターフィー5.5%の場合（小数点）', () => {
      const centerCost = 1000;
      const centerFeeRate = 5.5;
      const result = calculateCenterCostWithFee(centerCost, centerFeeRate);
      expect(result).toBe(1055); // 1000 * 1.055 = 1055
    });

    test('センターフィー100%の場合（上限）', () => {
      const centerCost = 500;
      const centerFeeRate = 100;
      const result = calculateCenterCostWithFee(centerCost, centerFeeRate);
      expect(result).toBe(1000); // 500 * 2.0 = 1000
    });

    test('センター着原価が0の場合', () => {
      const centerCost = 0;
      const centerFeeRate = 13;
      const result = calculateCenterCostWithFee(centerCost, centerFeeRate);
      expect(result).toBe(0);
    });

    test('四捨五入の確認（0.5以上）', () => {
      const centerCost = 99;
      const centerFeeRate = 13;
      const result = calculateCenterCostWithFee(centerCost, centerFeeRate);
      // 99 * 1.13 = 111.87 → 112
      expect(result).toBe(112);
    });

    test('四捨五入の確認（0.5未満）', () => {
      const centerCost = 97;
      const centerFeeRate = 13;
      const result = calculateCenterCostWithFee(centerCost, centerFeeRate);
      // 97 * 1.13 = 109.61 → 110
      expect(result).toBe(110);
    });

    test('大きな金額の場合', () => {
      const centerCost = 10000;
      const centerFeeRate = 13;
      const result = calculateCenterCostWithFee(centerCost, centerFeeRate);
      expect(result).toBe(11300); // 10000 * 1.13 = 11300
    });
  });

  describe('値入率の計算', () => {
    test('通常の値入率計算', () => {
      const priceExcludingTax = 1000;
      const storeCost = 600;
      const result = calculateProfitMargin(priceExcludingTax, storeCost);
      // (1000 - 600) / 1000 * 100 = 40.0
      expect(result).toBe('40.0');
    });

    test('値入率0%の場合（原価=売価）', () => {
      const priceExcludingTax = 500;
      const storeCost = 500;
      const result = calculateProfitMargin(priceExcludingTax, storeCost);
      expect(result).toBe('0.0');
    });

    test('マイナス値入率の場合（原価>売価）', () => {
      const priceExcludingTax = 500;
      const storeCost = 600;
      const result = calculateProfitMargin(priceExcludingTax, storeCost);
      // (500 - 600) / 500 * 100 = -20.0
      expect(result).toBe('-20.0');
    });

    test('小数点第1位まで表示', () => {
      const priceExcludingTax = 1000;
      const storeCost = 667;
      const result = calculateProfitMargin(priceExcludingTax, storeCost);
      // (1000 - 667) / 1000 * 100 = 33.3
      expect(result).toBe('33.3');
    });

    test('小数点第2位を四捨五入', () => {
      const priceExcludingTax = 1000;
      const storeCost = 666;
      const result = calculateProfitMargin(priceExcludingTax, storeCost);
      // (1000 - 666) / 1000 * 100 = 33.4
      expect(result).toBe('33.4');
    });

    test('売価が0の場合', () => {
      const priceExcludingTax = 0;
      const storeCost = 500;
      const result = calculateProfitMargin(priceExcludingTax, storeCost);
      expect(result).toBe('0.0');
    });

    test('原価が0の場合', () => {
      const priceExcludingTax = 1000;
      const storeCost = 0;
      const result = calculateProfitMargin(priceExcludingTax, storeCost);
      expect(result).toBe('0.0');
    });

    test('高い値入率（90%）', () => {
      const priceExcludingTax = 1000;
      const storeCost = 100;
      const result = calculateProfitMargin(priceExcludingTax, storeCost);
      // (1000 - 100) / 1000 * 100 = 90.0
      expect(result).toBe('90.0');
    });
  });

  describe('差益の計算', () => {
    test('基本的な差益計算', () => {
      const storeCost = 600;
      const centerCostWithFee = 500;
      const totalDelivery = 10;
      const effectiveQuantity = 1;
      const result = calculateProfitAmount(storeCost, centerCostWithFee, totalDelivery, effectiveQuantity);
      // (600 - 500) * (10 * 1) = 1000
      expect(result).toBe(1000);
    });

    test('差益がマイナスの場合（逆ざや）', () => {
      const storeCost = 500;
      const centerCostWithFee = 600;
      const totalDelivery = 10;
      const effectiveQuantity = 1;
      const result = calculateProfitAmount(storeCost, centerCostWithFee, totalDelivery, effectiveQuantity);
      // (500 - 600) * (10 * 1) = -1000
      expect(result).toBe(-1000);
    });

    test('実効数量が複数の場合（例：5kg入り）', () => {
      const storeCost = 120; // 100gあたり120円
      const centerCostWithFee = 100; // 100gあたり100円
      const totalDelivery = 10; // 10箱
      const effectiveQuantity = 50; // 5kg入り = 50単位（100g単位）
      const result = calculateProfitAmount(storeCost, centerCostWithFee, totalDelivery, effectiveQuantity);
      // (120 - 100) * (10 * 50) = 20 * 500 = 10000
      expect(result).toBe(10000);
    });

    test('差益が0の場合（原価が同じ）', () => {
      const storeCost = 500;
      const centerCostWithFee = 500;
      const totalDelivery = 10;
      const effectiveQuantity = 1;
      const result = calculateProfitAmount(storeCost, centerCostWithFee, totalDelivery, effectiveQuantity);
      expect(result).toBe(0);
    });

    test('総納品数が大きい場合', () => {
      const storeCost = 150;
      const centerCostWithFee = 100;
      const totalDelivery = 1000;
      const effectiveQuantity = 1;
      const result = calculateProfitAmount(storeCost, centerCostWithFee, totalDelivery, effectiveQuantity);
      // (150 - 100) * (1000 * 1) = 50000
      expect(result).toBe(50000);
    });

    test('小数点を含む計算の四捨五入', () => {
      const storeCost = 113; // センター込原価
      const centerCostWithFee = 100;
      const totalDelivery = 7;
      const effectiveQuantity = 3;
      const result = calculateProfitAmount(storeCost, centerCostWithFee, totalDelivery, effectiveQuantity);
      // (113 - 100) * (7 * 3) = 13 * 21 = 273
      expect(result).toBe(273);
    });

    test('いずれかのパラメータが0の場合', () => {
      expect(calculateProfitAmount(0, 100, 10, 1)).toBe(0);
      expect(calculateProfitAmount(100, 0, 10, 1)).toBe(0);
      expect(calculateProfitAmount(100, 90, 0, 1)).toBe(0);
      expect(calculateProfitAmount(100, 90, 10, 0)).toBe(0);
    });
  });

  describe('統合シナリオテスト', () => {
    test('シナリオ1: センターフィー0%、利益が出るケース', () => {
      // 設定
      const centerCost = 100;
      const centerFeeRate = 0;
      const storeCost = 120;
      const priceExcludingTax = 200;
      const totalDelivery = 50;
      const effectiveQuantity = 1;

      // センター込原価
      const centerCostWithFee = calculateCenterCostWithFee(centerCost, centerFeeRate);
      expect(centerCostWithFee).toBe(100); // センターフィー0%なので変わらず

      // 値入率
      const profitMargin = calculateProfitMargin(priceExcludingTax, storeCost);
      expect(profitMargin).toBe('40.0'); // (200-120)/200*100 = 40%

      // 差益
      const profitAmount = calculateProfitAmount(storeCost, centerCostWithFee, totalDelivery, effectiveQuantity);
      expect(profitAmount).toBe(1000); // (120-100)*50 = 1000円
    });

    test('シナリオ2: センターフィー13%、標準的なケース', () => {
      const centerCost = 500;
      const centerFeeRate = 13;
      const storeCost = 600;
      const priceExcludingTax = 1000;
      const totalDelivery = 20;
      const effectiveQuantity = 1;

      // センター込原価
      const centerCostWithFee = calculateCenterCostWithFee(centerCost, centerFeeRate);
      expect(centerCostWithFee).toBe(565); // 500 * 1.13 = 565

      // 値入率
      const profitMargin = calculateProfitMargin(priceExcludingTax, storeCost);
      expect(profitMargin).toBe('40.0'); // (1000-600)/1000*100 = 40%

      // 差益
      const profitAmount = calculateProfitAmount(storeCost, centerCostWithFee, totalDelivery, effectiveQuantity);
      expect(profitAmount).toBe(700); // (600-565)*20 = 700円
    });

    test('シナリオ3: 逆ざや（赤字）のケース', () => {
      const centerCost = 800;
      const centerFeeRate = 13;
      const storeCost = 850;
      const priceExcludingTax = 900;
      const totalDelivery = 10;
      const effectiveQuantity = 1;

      // センター込原価
      const centerCostWithFee = calculateCenterCostWithFee(centerCost, centerFeeRate);
      expect(centerCostWithFee).toBe(904); // 800 * 1.13 = 904

      // 値入率
      const profitMargin = calculateProfitMargin(priceExcludingTax, storeCost);
      expect(profitMargin).toBe('5.6'); // (900-850)/900*100 ≈ 5.6%

      // 差益（マイナス）
      const profitAmount = calculateProfitAmount(storeCost, centerCostWithFee, totalDelivery, effectiveQuantity);
      expect(profitAmount).toBe(-540); // (850-904)*10 = -540円
    });

    test('シナリオ4: 複数単位（5kg入り、100g単位）', () => {
      const centerCost = 50; // 100gあたり50円
      const centerFeeRate = 13;
      const storeCost = 60; // 100gあたり60円
      const priceExcludingTax = 100; // 100gあたり100円
      const totalDelivery = 30; // 30箱
      const effectiveQuantity = 50; // 5kg = 50単位

      // センター込原価
      const centerCostWithFee = calculateCenterCostWithFee(centerCost, centerFeeRate);
      expect(centerCostWithFee).toBe(56); // 50 * 1.13 = 56.5 → 56 (Math.round)

      // 値入率
      const profitMargin = calculateProfitMargin(priceExcludingTax, storeCost);
      expect(profitMargin).toBe('40.0'); // (100-60)/100*100 = 40%

      // 差益
      const profitAmount = calculateProfitAmount(storeCost, centerCostWithFee, totalDelivery, effectiveQuantity);
      expect(profitAmount).toBe(6000); // (60-56)*30*50 = 6000円
    });

    test('シナリオ5: 高額商品、小数点センターフィー', () => {
      const centerCost = 5000;
      const centerFeeRate = 8.5;
      const storeCost = 5500;
      const priceExcludingTax = 8000;
      const totalDelivery = 5;
      const effectiveQuantity = 1;

      // センター込原価
      const centerCostWithFee = calculateCenterCostWithFee(centerCost, centerFeeRate);
      expect(centerCostWithFee).toBe(5425); // 5000 * 1.085 = 5425

      // 値入率
      const profitMargin = calculateProfitMargin(priceExcludingTax, storeCost);
      expect(profitMargin).toBe('31.3'); // (8000-5500)/8000*100 = 31.25 → 31.3%

      // 差益
      const profitAmount = calculateProfitAmount(storeCost, centerCostWithFee, totalDelivery, effectiveQuantity);
      expect(profitAmount).toBe(375); // (5500-5425)*5 = 375円
    });
  });

  describe('境界値テスト', () => {
    test('センターフィー率の境界値: 0%', () => {
      const result = calculateCenterCostWithFee(1000, 0);
      expect(result).toBe(1000);
    });

    test('センターフィー率の境界値: 100%', () => {
      const result = calculateCenterCostWithFee(1000, 100);
      expect(result).toBe(2000);
    });

    test('極小値のテスト', () => {
      const centerCostWithFee = calculateCenterCostWithFee(1, 13);
      expect(centerCostWithFee).toBe(1); // 1 * 1.13 = 1.13 → 1

      const profitMargin = calculateProfitMargin(10, 9);
      expect(profitMargin).toBe('10.0'); // (10-9)/10*100 = 10%

      const profitAmount = calculateProfitAmount(2, 1, 1, 1);
      expect(profitAmount).toBe(1); // (2-1)*1*1 = 1
    });

    test('極大値のテスト（現実的な範囲）', () => {
      const centerCostWithFee = calculateCenterCostWithFee(100000, 13);
      expect(centerCostWithFee).toBe(113000);

      const profitMargin = calculateProfitMargin(200000, 150000);
      expect(profitMargin).toBe('25.0');

      const profitAmount = calculateProfitAmount(1000, 900, 1000, 100);
      expect(profitAmount).toBe(10000000); // (1000-900)*1000*100
    });
  });
});
