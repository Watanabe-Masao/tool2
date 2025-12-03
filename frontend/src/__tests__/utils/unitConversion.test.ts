import { describe, it, expect } from 'vitest';
import {
  convertToGrams,
  isWeightBasedUnit,
  isWeightBasedPackageUnit,
  checkUnitCompatibility,
  parseUnitValueV2,
  calculateEffectiveQuantityV2,
} from '@/utils/unitConversion';

describe('unitConversion', () => {
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

  describe('parseUnitValueV2', () => {
    describe('重量ベース - 規格と単位を分離', () => {
      it('規格"100" + 単位"gあたり" → {value: 100, unit: "g"}', () => {
        const result = parseUnitValueV2('100', 'gあたり');
        expect(result).toEqual({ value: 100, unit: 'g' });
      });

      it('規格"50" + 単位"gあたり" → {value: 50, unit: "g"}', () => {
        const result = parseUnitValueV2('50', 'gあたり');
        expect(result).toEqual({ value: 50, unit: 'g' });
      });

      it('規格"" + 単位"gあたり" → {value: 1, unit: "g"} (デフォルト1)', () => {
        const result = parseUnitValueV2('', 'gあたり');
        expect(result).toEqual({ value: 1, unit: 'g' });
      });

      it('規格100 (数値) + 単位"kgあたり" → {value: 100, unit: "kg"}', () => {
        const result = parseUnitValueV2(100, 'kgあたり');
        expect(result).toEqual({ value: 100, unit: 'kg' });
      });

      it('規格"1" + 単位"kgあたり" → {value: 1, unit: "kg"}', () => {
        const result = parseUnitValueV2('1', 'kgあたり');
        expect(result).toEqual({ value: 1, unit: 'kg' });
      });

      it('規格"" + 単位"kgあたり" → {value: 1, unit: "kg"} (デフォルト1)', () => {
        const result = parseUnitValueV2('', 'kgあたり');
        expect(result).toEqual({ value: 1, unit: 'kg' });
      });
    });

    describe('個数ベース - 変換不要', () => {
      it('規格"1" + 単位"個" → null（個数ベース）', () => {
        const result = parseUnitValueV2('1', '個');
        expect(result).toBeNull();
      });

      it('規格"5" + 単位"本" → null（個数ベース）', () => {
        const result = parseUnitValueV2('5', '本');
        expect(result).toBeNull();
      });

      it('規格"10" + 単位"玉" → null（個数ベース）', () => {
        const result = parseUnitValueV2('10', '玉');
        expect(result).toBeNull();
      });

      it('規格"" + 単位"個" → null（個数ベース）', () => {
        const result = parseUnitValueV2('', '個');
        expect(result).toBeNull();
      });
    });

    describe('エッジケース', () => {
      it('規格"0" + 単位"gあたり" → null（0以下は無効）', () => {
        const result = parseUnitValueV2('0', 'gあたり');
        expect(result).toBeNull();
      });

      it('規格"-10" + 単位"gあたり" → null（負数は無効）', () => {
        const result = parseUnitValueV2('-10', 'gあたり');
        expect(result).toBeNull();
      });

      it('規格"abc" + 単位"gあたり" → null（数値でない）', () => {
        const result = parseUnitValueV2('abc', 'gあたり');
        expect(result).toBeNull();
      });

      it('規格"L" + 単位"gあたり" → null（数値でないサイズ表記）', () => {
        const result = parseUnitValueV2('L', 'gあたり');
        expect(result).toBeNull();
      });

      it('規格"100" + 単位"" → null（単位なし）', () => {
        const result = parseUnitValueV2('100', '');
        expect(result).toBeNull();
      });
    });
  });

  describe('calculateEffectiveQuantityV2', () => {
    describe('重量ベースの変換', () => {
      it('規格"100" + "gあたり" + 5kg → 50単位', () => {
        const result = calculateEffectiveQuantityV2({
          specification: '100',
          unit: 'gあたり',
          quantityPerPackage: 5,
          packageUnit: 'kg',
        });
        expect(result.effectiveQuantity).toBe(50);
        expect(result.isConverted).toBe(true);
        expect(result.conversionDescription).toBe('5kg ÷ 100g = 50単位');
      });

      it('規格"" + "gあたり" + 3kg → 3000単位（デフォルト1g）', () => {
        const result = calculateEffectiveQuantityV2({
          specification: '',
          unit: 'gあたり',
          quantityPerPackage: 3,
          packageUnit: 'kg',
        });
        expect(result.effectiveQuantity).toBe(3000);
        expect(result.isConverted).toBe(true);
        expect(result.conversionDescription).toBe('3kg ÷ 1g = 3000単位');
      });

      it('規格"50" + "gあたり" + 2kg → 40単位', () => {
        const result = calculateEffectiveQuantityV2({
          specification: '50',
          unit: 'gあたり',
          quantityPerPackage: 2,
          packageUnit: 'kg',
        });
        expect(result.effectiveQuantity).toBe(40);
        expect(result.isConverted).toBe(true);
      });

      it('規格"1" + "kgあたり" + 5000g → 5単位', () => {
        const result = calculateEffectiveQuantityV2({
          specification: '1',
          unit: 'kgあたり',
          quantityPerPackage: 5000,
          packageUnit: 'g',
        });
        expect(result.effectiveQuantity).toBe(5);
        expect(result.isConverted).toBe(true);
      });

      it('規格"200" + "gあたり" + 3kg → 15単位', () => {
        const result = calculateEffectiveQuantityV2({
          specification: '200',
          unit: 'gあたり',
          quantityPerPackage: 3,
          packageUnit: 'kg',
        });
        expect(result.effectiveQuantity).toBe(15);
        expect(result.isConverted).toBe(true);
        expect(result.conversionDescription).toBe('3kg ÷ 200g = 15単位');
      });
    });

    describe('個数ベース - 変換なし', () => {
      it('規格"1" + "個" + 30入り → 30単位（変換なし）', () => {
        const result = calculateEffectiveQuantityV2({
          specification: '1',
          unit: '個',
          quantityPerPackage: 30,
          packageUnit: '入り',
        });
        expect(result.effectiveQuantity).toBe(30);
        expect(result.isConverted).toBe(false);
      });

      it('規格"" + "本" + 10本 → 10単位（変換なし）', () => {
        const result = calculateEffectiveQuantityV2({
          specification: '',
          unit: '本',
          quantityPerPackage: 10,
          packageUnit: '本',
        });
        expect(result.effectiveQuantity).toBe(10);
        expect(result.isConverted).toBe(false);
      });

      it('規格"5" + "玉" + 20玉 → 20単位（変換なし）', () => {
        const result = calculateEffectiveQuantityV2({
          specification: '5',
          unit: '玉',
          quantityPerPackage: 20,
          packageUnit: '玉',
        });
        expect(result.effectiveQuantity).toBe(20);
        expect(result.isConverted).toBe(false);
      });
    });


    describe('エッジケース', () => {
      it('入数がnull → effectiveQuantity: 0', () => {
        const result = calculateEffectiveQuantityV2({
          specification: '100',
          unit: 'gあたり',
          quantityPerPackage: null,
          packageUnit: 'kg',
        });
        expect(result.effectiveQuantity).toBe(0);
        expect(result.isConverted).toBe(false);
      });

      it('入数が0 → effectiveQuantity: 0', () => {
        const result = calculateEffectiveQuantityV2({
          specification: '100',
          unit: 'gあたり',
          quantityPerPackage: 0,
          packageUnit: 'kg',
        });
        expect(result.effectiveQuantity).toBe(0);
        expect(result.isConverted).toBe(false);
      });

      it('重量ベース単位 + 個数ベース入数 → 変換なし', () => {
        const result = calculateEffectiveQuantityV2({
          specification: '100',
          unit: 'gあたり',
          quantityPerPackage: 10,
          packageUnit: '入り',
        });
        expect(result.effectiveQuantity).toBe(10);
        expect(result.isConverted).toBe(false);
      });

      it('切り捨て確認: 5.9kg ÷ 1kg → 5単位', () => {
        const result = calculateEffectiveQuantityV2({
          specification: '1',
          unit: 'kgあたり',
          quantityPerPackage: 5900,
          packageUnit: 'g',
        });
        expect(result.effectiveQuantity).toBe(5);
        expect(result.isConverted).toBe(true);
      });
    });
  });
});
