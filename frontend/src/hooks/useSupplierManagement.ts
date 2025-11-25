import { useState, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';
import { createMessage } from '@/messages';

/**
 * 帳合先削除確認ダイアログの状態
 */
interface SupplierRemovalDialog {
  open: boolean;
  suppliersToRemove: string[];
  affectedProductsCount: number;
  newSuppliers: string[];
}

/**
 * useSupplierManagementのパラメータ
 */
interface UseSupplierManagementParams {
  methods: UseFormReturn<OrderFormData>;
  suppliers: string[] | undefined;
  isInitialLoad: React.MutableRefObject<boolean>;
  showSuccess: (message: string) => void;
}

/**
 * useSupplierManagement
 *
 * 帳合先の変更・削除に関するロジックを管理するカスタムフック
 *
 * 責務:
 * - 帳合先変更時の商品カードへの影響チェック
 * - 削除確認ダイアログの表示・非表示
 * - 帳合先削除時の商品カード削除処理
 *
 * @example
 * ```typescript
 * const {
 *   supplierRemovalDialog,
 *   handleSuppliersChange,
 *   handleConfirmSupplierRemoval,
 *   handleCancelSupplierRemoval,
 * } = useSupplierManagement({
 *   methods,
 *   suppliers,
 *   isInitialLoad,
 *   showSuccess,
 * });
 * ```
 */
export const useSupplierManagement = ({
  methods,
  suppliers,
  isInitialLoad,
  showSuccess,
}: UseSupplierManagementParams) => {
  const [supplierRemovalDialog, setSupplierRemovalDialog] = useState<SupplierRemovalDialog>({
    open: false,
    suppliersToRemove: [],
    affectedProductsCount: 0,
    newSuppliers: [],
  });

  const previousSuppliers = useRef<string[]>([]);

  /**
   * 帳合先変更ハンドラー
   *
   * 削除される帳合先が商品カードで使用されている場合、
   * 確認ダイアログを表示します。
   */
  const handleSuppliersChange = (newSuppliers: string[]) => {
    // 最新の商品データを取得
    const currentProducts = methods.getValues('products');

    // 初回ロード時や商品がない場合はそのまま適用
    if (isInitialLoad.current || !currentProducts || currentProducts.length === 0) {
      previousSuppliers.current = newSuppliers;
      return newSuppliers;
    }

    const currentSuppliers = suppliers || [];

    // 削除される帳合先を検出
    const removedSuppliers = currentSuppliers.filter(
      (supplier) => !newSuppliers.includes(supplier)
    );

    if (removedSuppliers.length > 0) {
      // 削除される帳合先を使用している商品を検出
      const affectedProducts = currentProducts.filter(
        (product) => product.supplier && removedSuppliers.includes(product.supplier)
      );

      if (affectedProducts.length > 0) {
        // 確認ダイアログを表示
        setSupplierRemovalDialog({
          open: true,
          suppliersToRemove: removedSuppliers,
          affectedProductsCount: affectedProducts.length,
          newSuppliers,
        });
        // 変更を保留
        return currentSuppliers;
      }
    }

    // 問題ない場合はそのまま適用
    previousSuppliers.current = newSuppliers;
    return newSuppliers;
  };

  /**
   * 帳合先削除の確認
   *
   * ユーザーが削除を確認した場合、削除される帳合先を使用している
   * 商品カードを削除します。
   */
  const handleConfirmSupplierRemoval = () => {
    const { suppliersToRemove, newSuppliers, affectedProductsCount } = supplierRemovalDialog;

    // 最新の商品データを取得
    const currentProducts = methods.getValues('products');

    // 削除される帳合先を使用していない商品のみを残す
    const remainingProducts = currentProducts.filter(
      (product) => !product.supplier || !suppliersToRemove.includes(product.supplier)
    );

    // 残った商品がない場合は、デフォルトの空の商品を1つ追加
    const newProducts = remainingProducts.length > 0
      ? remainingProducts
      : [{
          ...DEFAULT_PRODUCT_FORM_DATA,
          totalDelivery: 0,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        }];

    // 商品配列を更新
    methods.setValue('products', newProducts);

    // 帳合先を更新
    methods.setValue('suppliers', newSuppliers);
    previousSuppliers.current = newSuppliers;

    // メッセージを表示
    const removedSupplierNames = suppliersToRemove.join('、');
    showSuccess(
      `帳合先「${removedSupplierNames}」を削除し、関連する商品カード${affectedProductsCount}件を削除しました`
    );

    // ダイアログを閉じる
    setSupplierRemovalDialog({
      open: false,
      suppliersToRemove: [],
      affectedProductsCount: 0,
      newSuppliers: [],
    });
  };

  /**
   * 帳合先削除のキャンセル
   *
   * ユーザーが削除をキャンセルした場合、ダイアログを閉じます。
   */
  const handleCancelSupplierRemoval = () => {
    setSupplierRemovalDialog({
      open: false,
      suppliersToRemove: [],
      affectedProductsCount: 0,
      newSuppliers: [],
    });
  };

  return {
    supplierRemovalDialog,
    handleSuppliersChange,
    handleConfirmSupplierRemoval,
    handleCancelSupplierRemoval,
  };
};
