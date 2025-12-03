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
 * 重量単位のパターン（V1形式の互換性チェック用）
 * 例: "100gあたり" -> { value: 100, unit: 'g' }
 *     "gあたり" -> { value: 1, unit: 'g' }
 */
const WEIGHT_UNIT_PATTERN = /^(\d+)?(g|kg)あたり$/;

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
 * 単位互換性チェック結果
 */
export interface UnitCompatibilityResult {
  /** 互換性があるかどうか */
  isCompatible: boolean;
  /** 警告メッセージ（互換性がない場合） */
  warningMessage?: string;
}

/**
 * 規格単位と入数単位の互換性をチェック
 *
 * @param unit - 規格の単位（例: "100gあたり", "個"）
 * @param packageUnit - 入数の単位（例: "kg", "個"）
 * @returns 互換性チェック結果
 */
export function checkUnitCompatibility(unit: string, packageUnit: string): UnitCompatibilityResult {
  const isUnitWeightBased = isWeightBasedUnit(unit);
  const isPackageWeightBased = isWeightBasedPackageUnit(packageUnit);

  // 規格が重量ベースの場合
  if (isUnitWeightBased) {
    // 入数の単位が空の場合
    if (!packageUnit) {
      return {
        isCompatible: false,
        warningMessage: '規格が重量単位のため、入数の単位（kg/g）を設定してください',
      };
    }
    // 入数の単位が重量でない場合（例: 100gあたり + 5個入り）
    if (!isPackageWeightBased) {
      return {
        isCompatible: false,
        warningMessage: `規格「${unit}」と入数単位「${packageUnit}」の組み合わせが不整合です`,
      };
    }
  }

  return { isCompatible: true };
}

/**
 * 箱単価から単位単価計算の結果
 */
export interface BoxPriceToUnitPriceResult {
  /** 計算された単位単価 */
  unitPrice: number;
  /** 計算に使用した実効数量 */
  effectiveQuantity: number;
  /** 計算が有効かどうか */
  isValid: boolean;
  /** 変換の説明（例: "2,500円 ÷ 50単位 = 50円/単位"） */
  conversionDescription?: string;
  /** エラーメッセージ（無効な場合） */
  errorMessage?: string;
}

/**
 * ========================================
 * V2: 完全分離型 - specification と unit を独立管理
 * ========================================
 */

/**
 * 単位変換入力パラメータ V2
 *
 * specification と unit を完全に分離して管理する新しいインターフェース
 */
export interface UnitConversionInputV2 {
  /** 規格の数値または文字列（例: "100", "2L", "M"） */
  specification: string | number;
  /** 単位の基本形式（例: "gあたり", "kgあたり", "個", "本"） */
  unit: string;
  /** 入数（パッケージあたりの数量） */
  quantityPerPackage: number | null;
  /** 入数の単位（kg、g、個など） */
  packageUnit: string;
}

/**
 * 基本単位のパターン（数値を含まない形式）
 * 例: "gあたり" -> { unit: 'g' }
 *     "kgあたり" -> { unit: 'kg' }
 */
const BASE_WEIGHT_UNIT_PATTERN = /^(g|kg)あたり$/;

/**
 * 規格と単位を組み合わせてパース（V2）
 *
 * specification と unit を分離したデータ構造に対応。
 * 規格の数値部分と単位の基本形式を組み合わせて解釈します。
 *
 * @example
 * ```typescript
 * parseUnitValueV2("100", "gあたり")  // → {value: 100, unit: 'g'}
 * parseUnitValueV2("", "kgあたり")    // → {value: 1, unit: 'kg'}
 * parseUnitValueV2("1", "個")         // → null（個数ベース）
 * ```
 *
 * @param specification - 規格の数値部分（"100", "50" など）
 * @param unit - 単位の基本形式（"gあたり", "kgあたり", "個" など）
 * @returns パース結果、または非重量単位の場合はnull
 */
export function parseUnitValueV2(
  specification: string | number,
  unit: string
): ParsedUnit | null {
  if (!unit) {
    return null;
  }

  // 基本単位パターンのマッチング
  const match = unit.match(BASE_WEIGHT_UNIT_PATTERN);
  if (!match) {
    return null; // 個数ベース（"個", "本" など）
  }

  // specification から数値を取得
  let value: number;
  if (typeof specification === 'number') {
    value = specification;
  } else if (specification === '' || specification === null || specification === undefined) {
    value = 1; // 規格が空の場合は1として扱う（"gあたり" → "1gあたり"）
  } else {
    const parsed = parseInt(String(specification), 10);
    if (isNaN(parsed) || parsed <= 0) {
      // 数値でない規格（"L", "M" など）は重量ベースとして扱わない
      return null;
    }
    value = parsed;
  }

  const unitType = match[1] as 'g' | 'kg';

  return { value, unit: unitType };
}

/**
 * 実効数量を計算（V2）
 *
 * specification と unit を分離したデータ構造に対応した新しい計算関数。
 * 重量ベースの単位変換を行い、実際の販売単位数を計算します。
 *
 * @example
 * ```typescript
 * // 重量ベース: 100gあたり + 5kg
 * calculateEffectiveQuantityV2({
 *   specification: "100",
 *   unit: "gあたり",
 *   quantityPerPackage: 5,
 *   packageUnit: "kg",
 * });
 * // → { effectiveQuantity: 50, isConverted: true }
 *
 * // 個数ベース: 1個 + 10入り
 * calculateEffectiveQuantityV2({
 *   specification: "1",
 *   unit: "個",
 *   quantityPerPackage: 10,
 *   packageUnit: "入り",
 * });
 * // → { effectiveQuantity: 10, isConverted: false }
 * ```
 *
 * @param input - 変換入力パラメータ（V2形式）
 * @returns 変換結果
 */
export function calculateEffectiveQuantityV2(
  input: UnitConversionInputV2
): UnitConversionResult {
  const { specification, unit, quantityPerPackage, packageUnit } = input;

  // 入数が無効な場合は0を返す
  if (quantityPerPackage === null || quantityPerPackage === 0) {
    return {
      effectiveQuantity: 0,
      isConverted: false,
    };
  }

  // 規格と単位を組み合わせてパース
  const parsedUnit = parseUnitValueV2(specification, unit);

  // 規格単位が重量ベースでない場合は変換しない（個数ベース）
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
 * 箱単価から単位単価計算の入力パラメータ V2
 */
export interface BoxPriceToUnitPriceInputV2 {
  /** 箱単価（1箱あたりの価格） */
  boxPrice: number;
  /** 規格の数値または文字列（例: "100", "2L", "M"） */
  specification: string | number;
  /** 単位の基本形式（例: "gあたり", "kgあたり", "個", "本"） */
  unit: string;
  /** 入数（パッケージあたりの数量） */
  quantityPerPackage: number | null;
  /** 入数の単位（kg、g、個など） */
  packageUnit: string;
}

/**
 * 箱単価から単位単価を計算（V2）
 *
 * specification と unit を分離したデータ構造に対応した新しい箱単価計算関数。
 * 箱単価を実効数量で割って、1単位あたりの価格を算出します。
 *
 * @example
 * ```typescript
 * // 5kg箱 2500円、100gあたりの単価を計算
 * const result = calculateUnitPriceFromBoxPriceV2({
 *   boxPrice: 2500,
 *   specification: "100",
 *   unit: "gあたり",
 *   quantityPerPackage: 5,
 *   packageUnit: 'kg',
 * });
 * // 5kg = 5000g, 5000g / 100g = 50単位
 * // 2500円 / 50単位 = 50円/単位
 * console.log(result.unitPrice); // 50
 * ```
 *
 * @param input - 変換入力パラメータ（V2形式）
 * @returns 変換結果
 */
export function calculateUnitPriceFromBoxPriceV2(
  input: BoxPriceToUnitPriceInputV2
): BoxPriceToUnitPriceResult {
  const { boxPrice, specification, unit, quantityPerPackage, packageUnit } = input;

  // バリデーション: 箱単価が0の場合
  if (boxPrice === 0) {
    return {
      unitPrice: 0,
      effectiveQuantity: 0,
      isValid: false,
      errorMessage: '箱単価を入力してください',
    };
  }

  // バリデーション: 箱単価が負の場合
  if (boxPrice < 0) {
    return {
      unitPrice: 0,
      effectiveQuantity: 0,
      isValid: false,
      errorMessage: '箱単価は0より大きい値を入力してください',
    };
  }

  // バリデーション: 入数が設定されていない場合
  if (quantityPerPackage === null || quantityPerPackage === 0) {
    return {
      unitPrice: 0,
      effectiveQuantity: 0,
      isValid: false,
      errorMessage: '入数が設定されていません',
    };
  }

  // バリデーション: 単位の互換性チェック（V2形式用に完全な単位を構築）
  const parsedUnit = parseUnitValueV2(specification, unit);
  const fullUnitForCompatibility = parsedUnit
    ? `${parsedUnit.value}${parsedUnit.unit}あたり`
    : unit;

  const compatibilityResult = checkUnitCompatibility(fullUnitForCompatibility, packageUnit);
  if (!compatibilityResult.isCompatible) {
    return {
      unitPrice: 0,
      effectiveQuantity: 0,
      isValid: false,
      errorMessage: compatibilityResult.warningMessage,
    };
  }

  // 実効数量を計算（V2形式）
  const conversionResult = calculateEffectiveQuantityV2({
    specification,
    unit,
    quantityPerPackage,
    packageUnit,
  });
  const effectiveQuantity = conversionResult.effectiveQuantity;

  // バリデーション: 実効数量が0の場合（念のため）
  if (effectiveQuantity === 0) {
    return {
      unitPrice: 0,
      effectiveQuantity: 0,
      isValid: false,
      errorMessage: '入数が設定されていません',
    };
  }

  // 単位単価を計算（切り捨て）
  const unitPrice = Math.floor(boxPrice / effectiveQuantity);

  // 変換の説明を生成
  const formattedBoxPrice = boxPrice.toLocaleString();
  const conversionDescription = `${formattedBoxPrice}円 ÷ ${effectiveQuantity}単位 = ${unitPrice}円/単位`;

  return {
    unitPrice,
    effectiveQuantity,
    isValid: true,
    conversionDescription,
  };
}

