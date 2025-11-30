/**
 * 帳合先カラー定義
 *
 * 最大7色の帳合先カラーを定義。8件目以降はグレーを使用。
 */

export const SUPPLIER_COLORS = [
  '#6366f1', // Indigo - 1番目
  '#10b981', // Emerald - 2番目
  '#f59e0b', // Amber - 3番目
  '#ef4444', // Red - 4番目
  '#8b5cf6', // Violet - 5番目
  '#06b6d4', // Cyan - 6番目
  '#ec4899', // Pink - 7番目
] as const;

export const SUPPLIER_COLOR_OVERFLOW = '#9ca3af'; // Gray-400 - 8番目以降

/**
 * displayOrderに基づいて帳合先カラーを取得
 *
 * @param displayOrder - 表示順序（0-indexed）
 * @returns カラーコード
 */
export const getSupplierColor = (displayOrder: number): string => {
  if (displayOrder < 0 || displayOrder >= SUPPLIER_COLORS.length) {
    return SUPPLIER_COLOR_OVERFLOW;
  }
  return SUPPLIER_COLORS[displayOrder];
};

/**
 * 帳合先名からカラーを取得（プリセット配列から検索）
 *
 * @param supplierName - 帳合先名
 * @param presets - プリセット配列（displayOrder順にソート済み想定）
 * @returns カラーコード
 */
export const getSupplierColorByName = (
  supplierName: string,
  presets: Array<{ supplier: string; displayOrder?: number }>
): string => {
  const index = presets.findIndex((p) => p.supplier === supplierName);
  if (index === -1 || index >= SUPPLIER_COLORS.length) {
    return SUPPLIER_COLOR_OVERFLOW;
  }
  return SUPPLIER_COLORS[index];
};

/**
 * カラーコードから半透明背景色を生成
 *
 * @param color - カラーコード
 * @param opacity - 透明度（0-1）
 * @returns rgba形式のカラー
 */
export const getSupplierColorWithOpacity = (color: string, opacity: number = 0.1): string => {
  // Hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
