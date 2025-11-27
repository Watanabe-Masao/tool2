import { useMemo } from 'react';
import { useAutocomplete } from './useAutocomplete';

/**
 * オートコンプリートフィールド統合フック
 *
 * 注文フォームで使用する複数のオートコンプリートフィールドを
 * 一つのフックで管理します。
 *
 * NOTE: 返り値のオブジェクトをuseMemoでメモ化し、
 * 無限ループ(React #185)を防止
 *
 * @returns 各フィールドのオートコンプリート状態
 *
 * @example
 * ```tsx
 * const autocomplete = useAutocompleteFields();
 *
 * <Autocomplete options={autocomplete.supplier.options} ... />
 * <Autocomplete options={autocomplete.productName.options} ... />
 * <Autocomplete options={autocomplete.origin.options} ... />
 * ```
 */
export const useAutocompleteFields = () => {
  const supplier = useAutocomplete('supplier');
  const productName = useAutocomplete('productName');
  const origin = useAutocomplete('origin');

  // オブジェクトをメモ化して安定した参照を維持
  return useMemo(
    () => ({
      supplier,
      productName,
      origin,
      // Convenience accessors for options only
      supplierOptions: supplier.options,
      productNameOptions: productName.options,
      originOptions: origin.options,
    }),
    [supplier, productName, origin]
  );
};

export type UseAutocompleteFieldsReturn = ReturnType<typeof useAutocompleteFields>;
