import { describe, it, expect } from 'vitest';
import {
  parseUnitValue,
  convertToGrams,
  calculateEffectiveQuantity,
  isWeightBasedUnit,
  isWeightBasedPackageUnit,
  checkUnitCompatibility,
  calculateUnitPriceFromBoxPrice,
} from '@/utils/unitConversion';

describe('unitConversion', () => {
  describe('parseUnitValue', () => {
    it('should parse "gあたり" as 1g', () => {
      const result = parseUnitValue('gあたり');
      expect(result).toEqual({ value: 1, unit: 'g' });
    });

    it('should parse "100gあたり" as 100g', () => {
      const result = parseUnitValue('100gあたり');
      expect(result).toEqual({ value: 100, unit: 'g' });
    });

    it('should parse "200gあたり" as 200g', () => {
      const result = parseUnitValue('200gあたり');
      expect(result).toEqual({ value: 200, unit: 'g' });
    });

    it('should parse "1kgあたり" as 1kg', () => {
      const result = parseUnitValue('1kgあたり');
      expect(result).toEqual({ value: 1, unit: 'kg' });
    });

    it('should parse "kgあたり" as 1kg', () => {
      const result = parseUnitValue('kgあたり');
      expect(result).toEqual({ value: 1, unit: 'kg' });
    });

    it('should return null for non-weight units like "個"', () => {
      const result = parseUnitValue('個');
      expect(result).toBeNull();
    });

    it('should return null for non-weight units like "玉"', () => {
      const result = parseUnitValue('玉');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseUnitValue('');
      expect(result).toBeNull();
    });

    it('should return null for undefined', () => {
      const result = parseUnitValue(undefined);
      expect(result).toBeNull();
    });
  });

  describe('convertToGrams', () => {
    it('should convert kg to g', () => {
      expect(convertToGrams(5, 'kg')).toBe(5000);
    });

    it('should keep g as g', () => {
      expect(convertToGrams(500, 'g')).toBe(500);
    });

    it('should return null for unknown units', () => {
      expect(convertToGrams(5, '個')).toBeNull();
    });

    it('should return null for empty packageUnit', () => {
      expect(convertToGrams(5, '')).toBeNull();
    });

    it('should handle decimal values', () => {
      expect(convertToGrams(1.5, 'kg')).toBe(1500);
    });
  });

  describe('isWeightBasedUnit', () => {
    it('should return true for "gあたり"', () => {
      expect(isWeightBasedUnit('gあたり')).toBe(true);
    });

    it('should return true for "100gあたり"', () => {
      expect(isWeightBasedUnit('100gあたり')).toBe(true);
    });

    it('should return true for "kgあたり"', () => {
      expect(isWeightBasedUnit('kgあたり')).toBe(true);
    });

    it('should return false for "個"', () => {
      expect(isWeightBasedUnit('個')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isWeightBasedUnit('')).toBe(false);
    });
  });

  describe('isWeightBasedPackageUnit', () => {
    it('should return true for "kg"', () => {
      expect(isWeightBasedPackageUnit('kg')).toBe(true);
    });

    it('should return true for "g"', () => {
      expect(isWeightBasedPackageUnit('g')).toBe(true);
    });

    it('should return true for "KG" (case insensitive)', () => {
      expect(isWeightBasedPackageUnit('KG')).toBe(true);
    });

    it('should return false for "個"', () => {
      expect(isWeightBasedPackageUnit('個')).toBe(false);
    });

    it('should return false for "本"', () => {
      expect(isWeightBasedPackageUnit('本')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isWeightBasedPackageUnit('')).toBe(false);
    });
  });

  describe('checkUnitCompatibility', () => {
    describe('compatible combinations', () => {
      it('should be compatible: 100gあたり + kg', () => {
        const result = checkUnitCompatibility('100gあたり', 'kg');
        expect(result.isCompatible).toBe(true);
        expect(result.warningMessage).toBeUndefined();
      });

      it('should be compatible: gあたり + g', () => {
        const result = checkUnitCompatibility('gあたり', 'g');
        expect(result.isCompatible).toBe(true);
      });

      it('should be compatible: 個 + 個', () => {
        const result = checkUnitCompatibility('個', '個');
        expect(result.isCompatible).toBe(true);
      });

      it('should be compatible: 玉 + 個 (both non-weight)', () => {
        const result = checkUnitCompatibility('玉', '個');
        expect(result.isCompatible).toBe(true);
      });

      it('should be compatible: empty unit + empty packageUnit', () => {
        const result = checkUnitCompatibility('', '');
        expect(result.isCompatible).toBe(true);
      });
    });

    describe('incompatible combinations', () => {
      it('should be incompatible: 100gあたり + 個 (weight unit with count package)', () => {
        const result = checkUnitCompatibility('100gあたり', '個');
        expect(result.isCompatible).toBe(false);
        expect(result.warningMessage).toContain('100gあたり');
        expect(result.warningMessage).toContain('個');
      });

      it('should be incompatible: gあたり + 本 (weight unit with count package)', () => {
        const result = checkUnitCompatibility('gあたり', '本');
        expect(result.isCompatible).toBe(false);
        expect(result.warningMessage).toContain('gあたり');
        expect(result.warningMessage).toContain('本');
      });

      it('should be incompatible: kgあたり + パック (weight unit with count package)', () => {
        const result = checkUnitCompatibility('kgあたり', 'パック');
        expect(result.isCompatible).toBe(false);
      });

      it('should be incompatible: 100gあたり + empty (weight unit without packageUnit)', () => {
        const result = checkUnitCompatibility('100gあたり', '');
        expect(result.isCompatible).toBe(false);
        expect(result.warningMessage).toContain('入数の単位（kg/g）を設定してください');
      });
    });
  });

  describe('calculateEffectiveQuantity', () => {
    describe('weight-based conversions', () => {
      it('should calculate 5kg package with 100gあたり unit = 50 units', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 5,
          packageUnit: 'kg',
          unit: '100gあたり',
        });
        expect(result.effectiveQuantity).toBe(50);
        expect(result.isConverted).toBe(true);
        expect(result.conversionDescription).toBe('5kg ÷ 100g = 50単位');
      });

      it('should calculate 3kg package with gあたり unit = 3000 units', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 3,
          packageUnit: 'kg',
          unit: 'gあたり',
        });
        expect(result.effectiveQuantity).toBe(3000);
        expect(result.isConverted).toBe(true);
      });

      it('should calculate 500g package with 100gあたり unit = 5 units', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 500,
          packageUnit: 'g',
          unit: '100gあたり',
        });
        expect(result.effectiveQuantity).toBe(5);
        expect(result.isConverted).toBe(true);
      });

      it('should calculate 2kg package with 200gあたり unit = 10 units', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 2,
          packageUnit: 'kg',
          unit: '200gあたり',
        });
        expect(result.effectiveQuantity).toBe(10);
        expect(result.isConverted).toBe(true);
      });

      it('should calculate 1kg package with 1kgあたり unit = 1 unit', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 1,
          packageUnit: 'kg',
          unit: '1kgあたり',
        });
        expect(result.effectiveQuantity).toBe(1);
        expect(result.isConverted).toBe(true);
      });

      it('should calculate 5kg package with kgあたり unit = 5 units', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 5,
          packageUnit: 'kg',
          unit: 'kgあたり',
        });
        expect(result.effectiveQuantity).toBe(5);
        expect(result.isConverted).toBe(true);
      });
    });

    describe('non-weight units (passthrough)', () => {
      it('should return original quantity for 個 unit', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 20,
          packageUnit: '個',
          unit: '玉',
        });
        expect(result.effectiveQuantity).toBe(20);
        expect(result.isConverted).toBe(false);
        expect(result.conversionDescription).toBeUndefined();
      });

      it('should return original quantity when unit is empty', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 15,
          packageUnit: '',
          unit: '',
        });
        expect(result.effectiveQuantity).toBe(15);
        expect(result.isConverted).toBe(false);
      });

      it('should return original quantity for 箱 unit', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 10,
          packageUnit: '箱',
          unit: '個',
        });
        expect(result.effectiveQuantity).toBe(10);
        expect(result.isConverted).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle null quantityPerPackage', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: null,
          packageUnit: 'kg',
          unit: '100gあたり',
        });
        expect(result.effectiveQuantity).toBe(0);
        expect(result.isConverted).toBe(false);
      });

      it('should handle zero quantityPerPackage', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 0,
          packageUnit: 'kg',
          unit: '100gあたり',
        });
        expect(result.effectiveQuantity).toBe(0);
        expect(result.isConverted).toBe(false);
      });

      it('should handle weight unit but non-weight packageUnit', () => {
        // e.g., "100gあたり" with packageUnit "個" - should not convert
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 5,
          packageUnit: '個',
          unit: '100gあたり',
        });
        expect(result.effectiveQuantity).toBe(5);
        expect(result.isConverted).toBe(false);
      });

      it('should round down for non-integer results', () => {
        // 7kg / 200g = 35 (exact)
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 7,
          packageUnit: 'kg',
          unit: '200gあたり',
        });
        expect(result.effectiveQuantity).toBe(35);
      });

      it('should floor non-exact divisions', () => {
        // 1kg / 300g = 3.333... -> 3
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 1,
          packageUnit: 'kg',
          unit: '300gあたり',
        });
        expect(result.effectiveQuantity).toBe(3);
      });
    });

    describe('real-world scenarios', () => {
      it('scenario: みかん 5kg箱 100gあたり価格', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 5,
          packageUnit: 'kg',
          unit: '100gあたり',
        });
        expect(result.effectiveQuantity).toBe(50);
        expect(result.isConverted).toBe(true);
      });

      it('scenario: りんご 3kg袋 200gあたり価格', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 3,
          packageUnit: 'kg',
          unit: '200gあたり',
        });
        expect(result.effectiveQuantity).toBe(15);
        expect(result.isConverted).toBe(true);
      });

      it('scenario: 野菜 1箱20個入り (個数ベース)', () => {
        const result = calculateEffectiveQuantity({
          quantityPerPackage: 20,
          packageUnit: '個',
          unit: '個',
        });
        expect(result.effectiveQuantity).toBe(20);
        expect(result.isConverted).toBe(false);
      });
    });
  });

  describe('calculateUnitPriceFromBoxPrice', () => {
    describe('weight-based conversions', () => {
      it('should calculate unit price: 2500円/箱, 5kg, 100gあたり → 50円', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 2500,
          quantityPerPackage: 5,
          packageUnit: 'kg',
          unit: '100gあたり',
        });
        expect(result.unitPrice).toBe(50);
        expect(result.effectiveQuantity).toBe(50);
        expect(result.isValid).toBe(true);
        expect(result.conversionDescription).toBe('2,500円 ÷ 50単位 = 50円/単位');
      });

      it('should calculate unit price: 3000円/箱, 3kg, gあたり → 1円', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 3000,
          quantityPerPackage: 3,
          packageUnit: 'kg',
          unit: 'gあたり',
        });
        expect(result.unitPrice).toBe(1);
        expect(result.effectiveQuantity).toBe(3000);
        expect(result.isValid).toBe(true);
      });

      it('should calculate unit price: 1500円/箱, 500g, 100gあたり → 300円', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 1500,
          quantityPerPackage: 500,
          packageUnit: 'g',
          unit: '100gあたり',
        });
        expect(result.unitPrice).toBe(300);
        expect(result.effectiveQuantity).toBe(5);
        expect(result.isValid).toBe(true);
      });
    });

    describe('count-based conversions', () => {
      it('should calculate unit price: 4000円/箱, 20個入り → 200円', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 4000,
          quantityPerPackage: 20,
          packageUnit: '個',
          unit: '個',
        });
        expect(result.unitPrice).toBe(200);
        expect(result.effectiveQuantity).toBe(20);
        expect(result.isValid).toBe(true);
      });

      it('should calculate unit price: 3600円/箱, 12本入り → 300円', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 3600,
          quantityPerPackage: 12,
          packageUnit: '本',
          unit: '本',
        });
        expect(result.unitPrice).toBe(300);
        expect(result.effectiveQuantity).toBe(12);
        expect(result.isValid).toBe(true);
      });

      it('should calculate unit price: 5000円/箱, 20パック入り → 250円', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 5000,
          quantityPerPackage: 20,
          packageUnit: 'パック',
          unit: 'パック',
        });
        expect(result.unitPrice).toBe(250);
        expect(result.effectiveQuantity).toBe(20);
        expect(result.isValid).toBe(true);
      });
    });

    describe('rounding behavior', () => {
      it('should round down for non-integer results', () => {
        // 1000円 / 3 = 333.33... → 333円
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 1000,
          quantityPerPackage: 3,
          packageUnit: '個',
          unit: '個',
        });
        expect(result.unitPrice).toBe(333);
        expect(result.isValid).toBe(true);
      });

      it('should handle exact division', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 1000,
          quantityPerPackage: 4,
          packageUnit: '個',
          unit: '個',
        });
        expect(result.unitPrice).toBe(250);
        expect(result.isValid).toBe(true);
      });
    });

    describe('edge cases and validation', () => {
      it('should return invalid for zero box price', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 0,
          quantityPerPackage: 20,
          packageUnit: '個',
          unit: '個',
        });
        expect(result.isValid).toBe(false);
        expect(result.unitPrice).toBe(0);
        expect(result.errorMessage).toBe('箱単価を入力してください');
      });

      it('should return invalid for negative box price', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: -100,
          quantityPerPackage: 20,
          packageUnit: '個',
          unit: '個',
        });
        expect(result.isValid).toBe(false);
        expect(result.unitPrice).toBe(0);
        expect(result.errorMessage).toBe('箱単価は0より大きい値を入力してください');
      });

      it('should return invalid for null quantityPerPackage', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 1000,
          quantityPerPackage: null,
          packageUnit: '個',
          unit: '個',
        });
        expect(result.isValid).toBe(false);
        expect(result.unitPrice).toBe(0);
        expect(result.errorMessage).toBe('入数が設定されていません');
      });

      it('should return invalid for zero effective quantity', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 1000,
          quantityPerPackage: 0,
          packageUnit: '個',
          unit: '個',
        });
        expect(result.isValid).toBe(false);
        expect(result.unitPrice).toBe(0);
        expect(result.errorMessage).toBe('入数が設定されていません');
      });

      it('should handle undefined unit gracefully', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 2000,
          quantityPerPackage: 10,
          packageUnit: '',
          unit: '',
        });
        expect(result.unitPrice).toBe(200);
        expect(result.effectiveQuantity).toBe(10);
        expect(result.isValid).toBe(true);
      });

      it('should return invalid for incompatible units: 100gあたり + 個', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 2500,
          quantityPerPackage: 5,
          packageUnit: '個',
          unit: '100gあたり',
        });
        expect(result.isValid).toBe(false);
        expect(result.unitPrice).toBe(0);
        expect(result.errorMessage).toContain('100gあたり');
        expect(result.errorMessage).toContain('個');
      });

      it('should return invalid for weight unit without packageUnit', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 2500,
          quantityPerPackage: 5,
          packageUnit: '',
          unit: '100gあたり',
        });
        expect(result.isValid).toBe(false);
        expect(result.unitPrice).toBe(0);
        expect(result.errorMessage).toContain('入数の単位（kg/g）を設定してください');
      });
    });

    describe('real-world scenarios', () => {
      it('scenario: みかん 5kg箱 100gあたり価格で箱単価2500円', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 2500,
          quantityPerPackage: 5,
          packageUnit: 'kg',
          unit: '100gあたり',
        });
        expect(result.unitPrice).toBe(50);
        expect(result.effectiveQuantity).toBe(50);
        expect(result.isValid).toBe(true);
      });

      it('scenario: りんご 3kg袋 200gあたり価格で箱単価1800円', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 1800,
          quantityPerPackage: 3,
          packageUnit: 'kg',
          unit: '200gあたり',
        });
        // 3kg = 3000g, 3000g / 200g = 15単位
        // 1800 / 15 = 120円
        expect(result.unitPrice).toBe(120);
        expect(result.effectiveQuantity).toBe(15);
        expect(result.isValid).toBe(true);
      });

      it('scenario: 野菜 1箱20個入り 箱単価4000円', () => {
        const result = calculateUnitPriceFromBoxPrice({
          boxPrice: 4000,
          quantityPerPackage: 20,
          packageUnit: '個',
          unit: '個',
        });
        expect(result.unitPrice).toBe(200);
        expect(result.effectiveQuantity).toBe(20);
        expect(result.isValid).toBe(true);
      });
    });
  });
});
