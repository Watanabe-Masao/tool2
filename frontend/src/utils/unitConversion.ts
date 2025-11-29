/**
 * 単位変換ユーティリティ
 *
 * 重量ベースの単位（gあたり、kgあたり等）と入数単位（kg、g等）を
 * 自動変換し、実効数量を計算します。
 *
 * 例：
 * - 規格単位: 100gあたり、入数: 5kg → 5000g / 100g = 50単位
 * - 規格単位: gあたり、入数: 3kg → 3000g / 1g = 3000単位
 */

/**
 * 単位パース結果
 */
export interface ParsedUnit {
  value: number;
  unit: 'g' | 'kg';
}

/**
 * 単位変換結果
 */
export interface UnitConversionResult {
  /** 変換後の実効数量 */
  effectiveQuantity: number;
  /** 変換が行われたかどうか */
  isConverted: boolean;
  /** 変換の説明（例: "5kg ÷ 100g = 50単位"） */
  conversionDescription?: string;
}

/**
 * 単位変換入力パラメータ
 */
export interface UnitConversionInput {
  /** 入数（パッケージあたりの数量） */
  quantityPerPackage: number | null;
  /** 入数の単位（kg、g、個など） */
  packageUnit: string;
  /** 規格の単位（100gあたり、gあたり、個など） */
  unit: string;
}

/**
 * 重量単位のパターン
 * 例: "100gあたり" -> { value: 100, unit: 'g' }
 *     "gあたり" -> { value: 1, unit: 'g' }
 *     "1kgあたり" -> { value: 1, unit: 'kg' }
 */
const WEIGHT_UNIT_PATTERN = /^(\d+)?(g|kg)あたり$/;

/**
 * 単位文字列をパースして数値と単位に分解
 *
 * @param unitString - 単位文字列（例: "100gあたり", "gあたり", "kgあたり"）
 * @returns パース結果、または非重量単位の場合はnull
 */
export function parseUnitValue(unitString: string | undefined): ParsedUnit | null {
  if (!unitString) {
    return null;
  }

  const match = unitString.match(WEIGHT_UNIT_PATTERN);
  if (!match) {
    return null;
  }

  const value = match[1] ? parseInt(match[1], 10) : 1;
  const unit = match[2] as 'g' | 'kg';

  return { value, unit };
}

/**
 * 指定された単位をグラムに変換
 *
 * @param quantity - 数量
 * @param packageUnit - 単位（kg, g）
 * @returns グラム数、または変換不可の場合はnull
 */
export function convertToGrams(quantity: number, packageUnit: string): number | null {
  const normalizedUnit = packageUnit.toLowerCase();

  switch (normalizedUnit) {
    case 'kg':
      return quantity * 1000;
    case 'g':
      return quantity;
    default:
      return null;
  }
}

/**
 * 単位が重量ベースかどうかを判定
 *
 * @param unit - 単位文字列
 * @returns 重量ベースの場合true
 */
export function isWeightBasedUnit(unit: string): boolean {
  if (!unit) {
    return false;
  }
  return WEIGHT_UNIT_PATTERN.test(unit);
}

/**
 * パッケージ単位が重量単位かどうかを判定
 *
 * @param packageUnit - パッケージ単位文字列
 * @returns 重量単位の場合true
 */
export function isWeightBasedPackageUnit(packageUnit: string): boolean {
  if (!packageUnit) {
    return false;
  }
  const normalized = packageUnit.toLowerCase();
  return normalized === 'kg' || normalized === 'g';
}

/**
 * 実効数量を計算
 *
 * 重量ベースの単位変換を行い、実際の販売単位数を計算します。
 *
 * 例：
 * - 入数5kg、単位100gあたり → 5000g / 100g = 50単位
 * - 入数3kg、単位gあたり → 3000g / 1g = 3000単位
 * - 入数20個、単位個 → 20単位（変換なし）
 *
 * @param input - 変換入力パラメータ
 * @returns 変換結果
 */
export function calculateEffectiveQuantity(input: UnitConversionInput): UnitConversionResult {
  const { quantityPerPackage, packageUnit, unit } = input;

  // 入数が無効な場合は0を返す
  if (quantityPerPackage === null || quantityPerPackage === 0) {
    return {
      effectiveQuantity: 0,
      isConverted: false,
    };
  }

  // 規格単位をパース
  const parsedUnit = parseUnitValue(unit);

  // 規格単位が重量ベースでない場合は変換しない
  if (!parsedUnit) {
    return {
      effectiveQuantity: quantityPerPackage,
      isConverted: false,
    };
  }

  // パッケージ単位が重量単位でない場合は変換しない
  if (!isWeightBasedPackageUnit(packageUnit)) {
    return {
      effectiveQuantity: quantityPerPackage,
      isConverted: false,
    };
  }

  // パッケージの総グラム数を計算
  const totalGrams = convertToGrams(quantityPerPackage, packageUnit);
  if (totalGrams === null) {
    return {
      effectiveQuantity: quantityPerPackage,
      isConverted: false,
    };
  }

  // 規格単位をグラムに統一
  let unitInGrams: number;
  if (parsedUnit.unit === 'kg') {
    unitInGrams = parsedUnit.value * 1000;
  } else {
    unitInGrams = parsedUnit.value;
  }

  // 実効数量を計算（切り捨て）
  const effectiveQuantity = Math.floor(totalGrams / unitInGrams);

  // 変換の説明を生成
  const packageDescription = `${quantityPerPackage}${packageUnit}`;
  const unitDescription = `${parsedUnit.value}${parsedUnit.unit}`;
  const conversionDescription = `${packageDescription} ÷ ${unitDescription} = ${effectiveQuantity}単位`;

  return {
    effectiveQuantity,
    isConverted: true,
    conversionDescription,
  };
}

/**
 * 差益計算用の実効数量を取得
 *
 * @param quantityPerPackage - 入数
 * @param packageUnit - 入数の単位
 * @param unit - 規格の単位
 * @returns 計算に使用する実効数量
 */
export function getEffectiveQuantityForCalculation(
  quantityPerPackage: number | null,
  packageUnit: string = '',
  unit: string = ''
): number {
  const result = calculateEffectiveQuantity({
    quantityPerPackage,
    packageUnit,
    unit,
  });
  return result.effectiveQuantity;
}
