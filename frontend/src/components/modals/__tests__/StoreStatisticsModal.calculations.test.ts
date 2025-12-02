/**
 * StoreStatisticsModal - 配分統計計算のテスト
 *
 * 重量ベース（100gあたり + 5kg）と個数ベース（1個 + 30入り）の
 * 統計計算が正しく行われることを検証します。
 */

import { describe, it, expect } from 'vitest';
import { calculateEffectiveQuantity } from '@/utils/unitConversion';
import type { OrderFormData, Product } from '@/schemas/orderSchema';

/**
 * 配分統計の計算結果
 */
interface StoreStatistics {
  storeCode: string;
  storeName: string;
  allocationQuantity: number;
  allocationAmount: number;
  salesAmount: number;
  grossProfit: number;
  grossProfitMargin: number;
}

/**
 * StoreStatisticsModalと同じロジックで統計を計算
 */
function calculateStoreStatistics(formData: OrderFormData): StoreStatistics[] {
  const STORE_DATA = [
    { code: 'S001', name: '店舗1' },
    { code: 'S002', name: '店舗2' },
    { code: 'S003', name: '店舗3' },
  ];

  const stats: Record<string, StoreStatistics> = {};

  // 各店舗を初期化
  STORE_DATA.forEach((store) => {
    stats[store.code] = {
      storeCode: store.code,
      storeName: store.name,
      allocationQuantity: 0,
      allocationAmount: 0,
      salesAmount: 0,
      grossProfit: 0,
      grossProfitMargin: 0,
    };
  });

  // 各商品の配分を集計
  formData.products.forEach((product) => {
    const storeCost = product.storeCost || 0;
    const priceExcludingTax = product.priceExcludingTax || 0;

    // 1箱あたりの実効数量を計算（規格と入数から）
    const conversionResult = calculateEffectiveQuantity({
      quantityPerPackage: product.quantityPerPackage,
      packageUnit: product.packageUnit || '',
      unit: product.unit || '',
    });
    const effectiveQuantity = conversionResult.effectiveQuantity;

    // 1箱あたりの価格を計算
    const boxStoreCost = storeCost * effectiveQuantity;
    const boxPriceExcludingTax = priceExcludingTax * effectiveQuantity;

    product.storeAllocations.forEach((quantity, index) => {
      if (quantity > 0) {
        const storeCode = STORE_DATA[index].code;
        const stat = stats[storeCode];

        stat.allocationQuantity += quantity;
        stat.allocationAmount += boxStoreCost * quantity;
        stat.salesAmount += boxPriceExcludingTax * quantity;
        stat.grossProfit += (boxPriceExcludingTax - boxStoreCost) * quantity;
      }
    });
  });

  // 値入率を計算
  Object.values(stats).forEach((stat) => {
    if (stat.salesAmount > 0) {
      stat.grossProfitMargin = (stat.grossProfit / stat.salesAmount) * 100;
    }
  });

  // 配分がある店舗のみを返す
  return Object.values(stats).filter((stat) => stat.allocationQuantity > 0);
}

describe('StoreStatisticsModal - 配分統計計算', () => {
  describe('重量ベースの計算（100gあたり + 5kg）', () => {
    it('1箱配分の場合、正しく原価・売価・粗利を計算する', () => {
      const mockFormData: OrderFormData = {
        deliveryDate: new Date('2024-01-01'),
        suppliers: ['supplier1'],
        products: [
          {
            name: '商品A',
            supplier: 'supplier1',
            origin: '産地A',
            specification: '100',
            unit: '100gあたり',
            quantityPerPackage: 5,
            packageUnit: 'kg',
            categoryCode: 'CAT001',
            centerCost: 50,
            storeCost: 60, // 100gあたり60円
            priceExcludingTax: 78, // 100gあたり78円
            centerFeeRate: 0,
            storeAllocations: [1, 0, 0], // 店舗1に1箱
          } as Product,
        ],
      };

      const stats = calculateStoreStatistics(mockFormData);

      expect(stats).toHaveLength(1);
      expect(stats[0].storeCode).toBe('S001');
      expect(stats[0].allocationQuantity).toBe(1);

      // 5kg ÷ 100g = 50単位
      // 原価: 60円 × 50 = 3,000円
      // 売価: 78円 × 50 = 3,900円
      // 粗利: 900円
      expect(stats[0].allocationAmount).toBe(3000);
      expect(stats[0].salesAmount).toBe(3900);
      expect(stats[0].grossProfit).toBe(900);
      expect(stats[0].grossProfitMargin).toBeCloseTo(23.08, 1);
    });

    it('複数箱配分の場合、正しく集計する', () => {
      const mockFormData: OrderFormData = {
        deliveryDate: new Date('2024-01-01'),
        suppliers: ['supplier1'],
        products: [
          {
            name: '商品A',
            supplier: 'supplier1',
            origin: '産地A',
            specification: '100',
            unit: '100gあたり',
            quantityPerPackage: 5,
            packageUnit: 'kg',
            categoryCode: 'CAT001',
            centerCost: 50,
            storeCost: 60,
            priceExcludingTax: 78,
            centerFeeRate: 0,
            storeAllocations: [3, 0, 0], // 店舗1に3箱
          } as Product,
        ],
      };

      const stats = calculateStoreStatistics(mockFormData);

      expect(stats[0].allocationQuantity).toBe(3);
      // 3箱 × 3,000円 = 9,000円
      expect(stats[0].allocationAmount).toBe(9000);
      // 3箱 × 3,900円 = 11,700円
      expect(stats[0].salesAmount).toBe(11700);
      // 3箱 × 900円 = 2,700円
      expect(stats[0].grossProfit).toBe(2700);
    });

    it('複数店舗への配分の場合、店舗別に集計する', () => {
      const mockFormData: OrderFormData = {
        deliveryDate: new Date('2024-01-01'),
        suppliers: ['supplier1'],
        products: [
          {
            name: '商品A',
            supplier: 'supplier1',
            origin: '産地A',
            specification: '100',
            unit: '100gあたり',
            quantityPerPackage: 5,
            packageUnit: 'kg',
            categoryCode: 'CAT001',
            centerCost: 50,
            storeCost: 60,
            priceExcludingTax: 78,
            centerFeeRate: 0,
            storeAllocations: [2, 3, 1], // 店舗1に2箱、店舗2に3箱、店舗3に1箱
          } as Product,
        ],
      };

      const stats = calculateStoreStatistics(mockFormData);

      expect(stats).toHaveLength(3);

      // 店舗1: 2箱
      expect(stats[0].storeCode).toBe('S001');
      expect(stats[0].allocationQuantity).toBe(2);
      expect(stats[0].allocationAmount).toBe(6000);
      expect(stats[0].salesAmount).toBe(7800);
      expect(stats[0].grossProfit).toBe(1800);

      // 店舗2: 3箱
      expect(stats[1].storeCode).toBe('S002');
      expect(stats[1].allocationQuantity).toBe(3);
      expect(stats[1].allocationAmount).toBe(9000);
      expect(stats[1].salesAmount).toBe(11700);
      expect(stats[1].grossProfit).toBe(2700);

      // 店舗3: 1箱
      expect(stats[2].storeCode).toBe('S003');
      expect(stats[2].allocationQuantity).toBe(1);
      expect(stats[2].allocationAmount).toBe(3000);
      expect(stats[2].salesAmount).toBe(3900);
      expect(stats[2].grossProfit).toBe(900);
    });
  });

  describe('個数ベースの計算（1個 + 30入り）', () => {
    it('1箱配分の場合、正しく原価・売価・粗利を計算する', () => {
      const mockFormData: OrderFormData = {
        deliveryDate: new Date('2024-01-01'),
        suppliers: ['supplier1'],
        products: [
          {
            name: '商品B',
            supplier: 'supplier1',
            origin: '産地B',
            specification: '1',
            unit: '個',
            quantityPerPackage: 30,
            packageUnit: '個',
            categoryCode: 'CAT002',
            centerCost: 8,
            storeCost: 10, // 1個あたり10円
            priceExcludingTax: 15, // 1個あたり15円
            centerFeeRate: 0,
            storeAllocations: [1, 0, 0], // 店舗1に1箱
          } as Product,
        ],
      };

      const stats = calculateStoreStatistics(mockFormData);

      expect(stats).toHaveLength(1);
      expect(stats[0].storeCode).toBe('S001');
      expect(stats[0].allocationQuantity).toBe(1);

      // 30個入り
      // 原価: 10円 × 30 = 300円
      // 売価: 15円 × 30 = 450円
      // 粗利: 150円
      expect(stats[0].allocationAmount).toBe(300);
      expect(stats[0].salesAmount).toBe(450);
      expect(stats[0].grossProfit).toBe(150);
      expect(stats[0].grossProfitMargin).toBeCloseTo(33.33, 1);
    });

    it('複数箱配分の場合、正しく集計する', () => {
      const mockFormData: OrderFormData = {
        deliveryDate: new Date('2024-01-01'),
        suppliers: ['supplier1'],
        products: [
          {
            name: '商品B',
            supplier: 'supplier1',
            origin: '産地B',
            specification: '1',
            unit: '個',
            quantityPerPackage: 30,
            packageUnit: '個',
            categoryCode: 'CAT002',
            centerCost: 8,
            storeCost: 10,
            priceExcludingTax: 15,
            centerFeeRate: 0,
            storeAllocations: [5, 0, 0], // 店舗1に5箱
          } as Product,
        ],
      };

      const stats = calculateStoreStatistics(mockFormData);

      expect(stats[0].allocationQuantity).toBe(5);
      // 5箱 × 300円 = 1,500円
      expect(stats[0].allocationAmount).toBe(1500);
      // 5箱 × 450円 = 2,250円
      expect(stats[0].salesAmount).toBe(2250);
      // 5箱 × 150円 = 750円
      expect(stats[0].grossProfit).toBe(750);
    });
  });

  describe('複数商品の集計', () => {
    it('異なる単位の商品を混在させても正しく集計する', () => {
      const mockFormData: OrderFormData = {
        deliveryDate: new Date('2024-01-01'),
        suppliers: ['supplier1'],
        products: [
          // 商品A: 重量ベース
          {
            name: '商品A',
            supplier: 'supplier1',
            origin: '産地A',
            specification: '100',
            unit: '100gあたり',
            quantityPerPackage: 5,
            packageUnit: 'kg',
            categoryCode: 'CAT001',
            centerCost: 50,
            storeCost: 60,
            priceExcludingTax: 78,
            centerFeeRate: 0,
            storeAllocations: [2, 0, 0], // 店舗1に2箱
          } as Product,
          // 商品B: 個数ベース
          {
            name: '商品B',
            supplier: 'supplier1',
            origin: '産地B',
            specification: '1',
            unit: '個',
            quantityPerPackage: 30,
            packageUnit: '個',
            categoryCode: 'CAT002',
            centerCost: 8,
            storeCost: 10,
            priceExcludingTax: 15,
            centerFeeRate: 0,
            storeAllocations: [3, 0, 0], // 店舗1に3箱
          } as Product,
        ],
      };

      const stats = calculateStoreStatistics(mockFormData);

      expect(stats).toHaveLength(1);
      expect(stats[0].storeCode).toBe('S001');

      // 配分数量: 2箱 + 3箱 = 5箱
      expect(stats[0].allocationQuantity).toBe(5);

      // 原価合計: (3,000円 × 2箱) + (300円 × 3箱) = 6,900円
      expect(stats[0].allocationAmount).toBe(6900);

      // 売価合計: (3,900円 × 2箱) + (450円 × 3箱) = 9,150円
      expect(stats[0].salesAmount).toBe(9150);

      // 粗利合計: (900円 × 2箱) + (150円 × 3箱) = 2,250円
      expect(stats[0].grossProfit).toBe(2250);

      // 値入率: 2,250円 ÷ 9,150円 × 100 = 24.59%
      expect(stats[0].grossProfitMargin).toBeCloseTo(24.59, 1);
    });

    it('複数商品を複数店舗に配分した場合、正しく集計する', () => {
      const mockFormData: OrderFormData = {
        deliveryDate: new Date('2024-01-01'),
        suppliers: ['supplier1'],
        products: [
          // 商品A: 店舗1に2箱、店舗2に1箱
          {
            name: '商品A',
            supplier: 'supplier1',
            origin: '産地A',
            specification: '100',
            unit: '100gあたり',
            quantityPerPackage: 5,
            packageUnit: 'kg',
            categoryCode: 'CAT001',
            centerCost: 50,
            storeCost: 60,
            priceExcludingTax: 78,
            centerFeeRate: 0,
            storeAllocations: [2, 1, 0],
          } as Product,
          // 商品B: 店舗1に3箱、店舗2に2箱
          {
            name: '商品B',
            supplier: 'supplier1',
            origin: '産地B',
            specification: '1',
            unit: '個',
            quantityPerPackage: 30,
            packageUnit: '個',
            categoryCode: 'CAT002',
            centerCost: 8,
            storeCost: 10,
            priceExcludingTax: 15,
            centerFeeRate: 0,
            storeAllocations: [3, 2, 0],
          } as Product,
        ],
      };

      const stats = calculateStoreStatistics(mockFormData);

      expect(stats).toHaveLength(2);

      // 店舗1: 商品A 2箱 + 商品B 3箱
      expect(stats[0].storeCode).toBe('S001');
      expect(stats[0].allocationQuantity).toBe(5);
      expect(stats[0].allocationAmount).toBe(6900); // 6,000 + 900
      expect(stats[0].salesAmount).toBe(9150); // 7,800 + 1,350
      expect(stats[0].grossProfit).toBe(2250); // 1,800 + 450

      // 店舗2: 商品A 1箱 + 商品B 2箱
      expect(stats[1].storeCode).toBe('S002');
      expect(stats[1].allocationQuantity).toBe(3);
      expect(stats[1].allocationAmount).toBe(3600); // 3,000 + 600
      expect(stats[1].salesAmount).toBe(4800); // 3,900 + 900
      expect(stats[1].grossProfit).toBe(1200); // 900 + 300
    });
  });

  describe('エッジケース', () => {
    it('配分数が0の店舗は統計に含まれない', () => {
      const mockFormData: OrderFormData = {
        deliveryDate: new Date('2024-01-01'),
        suppliers: ['supplier1'],
        products: [
          {
            name: '商品A',
            supplier: 'supplier1',
            origin: '産地A',
            specification: '100',
            unit: '100gあたり',
            quantityPerPackage: 5,
            packageUnit: 'kg',
            categoryCode: 'CAT001',
            centerCost: 50,
            storeCost: 60,
            priceExcludingTax: 78,
            centerFeeRate: 0,
            storeAllocations: [1, 0, 0], // 店舗1のみ
          } as Product,
        ],
      };

      const stats = calculateStoreStatistics(mockFormData);

      expect(stats).toHaveLength(1);
      expect(stats[0].storeCode).toBe('S001');
    });

    it('価格が0の場合でも計算できる', () => {
      const mockFormData: OrderFormData = {
        deliveryDate: new Date('2024-01-01'),
        suppliers: ['supplier1'],
        products: [
          {
            name: '商品A',
            supplier: 'supplier1',
            origin: '産地A',
            specification: '100',
            unit: '100gあたり',
            quantityPerPackage: 5,
            packageUnit: 'kg',
            categoryCode: 'CAT001',
            centerCost: 0,
            storeCost: 0,
            priceExcludingTax: 0,
            centerFeeRate: 0,
            storeAllocations: [1, 0, 0],
          } as Product,
        ],
      };

      const stats = calculateStoreStatistics(mockFormData);

      expect(stats[0].allocationAmount).toBe(0);
      expect(stats[0].salesAmount).toBe(0);
      expect(stats[0].grossProfit).toBe(0);
      expect(stats[0].grossProfitMargin).toBe(0);
    });

    it('入数がnullの場合、effectiveQuantityは0になる', () => {
      const mockFormData: OrderFormData = {
        deliveryDate: new Date('2024-01-01'),
        suppliers: ['supplier1'],
        products: [
          {
            name: '商品A',
            supplier: 'supplier1',
            origin: '産地A',
            specification: '100',
            unit: '100gあたり',
            quantityPerPackage: null,
            packageUnit: 'kg',
            categoryCode: 'CAT001',
            centerCost: 50,
            storeCost: 60,
            priceExcludingTax: 78,
            centerFeeRate: 0,
            storeAllocations: [1, 0, 0],
          } as Product,
        ],
      };

      const stats = calculateStoreStatistics(mockFormData);

      // 実効数量が0なので、全て0円
      expect(stats[0].allocationAmount).toBe(0);
      expect(stats[0].salesAmount).toBe(0);
      expect(stats[0].grossProfit).toBe(0);
    });
  });
});
