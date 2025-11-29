import { describe, it, expect } from 'vitest';
import {
  parseUnitValue,
  convertToGrams,
  calculateEffectiveQuantity,
  isWeightBasedUnit,
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
});
