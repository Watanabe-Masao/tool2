import { useEffect, useRef, useState, useCallback } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderFormSchema } from '@/schemas/orderSchema';
import type { OrderFormData } from '@/schemas/orderSchema';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';
import { SessionStorageService } from '@/utils/sessionStorageService';
import { useNotification } from '@/context/NotificationContext';
import type { SupplierRemovalDialogState } from '@/types/ui';

/**
 * 注文フォームの状態管理フック
 *
 * React Hook Formを使用したフォーム状態管理、
 * 自動保存、下書き復元、商品管理機能を提供
 *
 * @param userId - ユーザーID
 * @returns フォーム状態とメソッド
 */
export const useOrderFormState = (userId: string | undefined) => {
  const { showSuccess } = useNotification();

  // 下書き復元ダイアログの状態
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  // 未保存変更フラグ
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 帳合先削除確認ダイアログの状態
  const [supplierRemovalDialog, setSupplierRemovalDialog] = useState<SupplierRemovalDialogState>({
    open: false,
    suppliersToRemove: [],
    affectedProductsCount: 0,
    newSuppliers: [],
  });

  // 自動保存用のタイマー
  const autoSaveTimer = useRef<number | null>(null);

  // 初回ロードフラグ
  const isInitialLoad = useRef(true);

  // 前回の帳合先リスト
  const previousSuppliers = useRef<string[]>([]);

  /**
   * React Hook Form セットアップ
   */
  const methods = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      deliveryDate: new Date(),
      suppliers: [],
      products: [
        {
          ...DEFAULT_PRODUCT_FORM_DATA,
          totalDelivery: 0,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        },
      ],
    },
    mode: 'onChange',
  });

  const {
    control,
    reset,
    setValue,
    getValues,
  } = methods;

  // 商品フィールド配列
  const {
    fields: productFields,
    append: appendProduct,
    remove: removeProduct,
    move: moveProduct
  } = useFieldArray({
    control,
    name: 'products',
  });

  // 監視するフィールド
  const suppliers = useWatch({ control, name: 'suppliers' });
  const products = useWatch({ control, name: 'products' });
  const deliveryDate = useWatch({ control, name: 'deliveryDate' });

  /**
   * 商品削除ハンドラー
   */
  const handleRemoveProduct = useCallback((index: number) => {
    if (productFields.length <= 1) return; // 最後の1つは削除しない
    removeProduct(index);
  }, [productFields.length, removeProduct]);

  /**
   * 商品フィールドクリアハンドラー
   */
  const handleClearProduct = useCallback((index: number) => {
    const currentSuppliers = getValues('suppliers');
    const defaultSupplier = currentSuppliers && currentSuppliers.length > 0 ? currentSuppliers[0] : '';

    setValue(`products.${index}.categoryCode`, '');
    setValue(`products.${index}.supplier`, defaultSupplier);
    setValue(`products.${index}.name`, '');
    setValue(`products.${index}.origin`, '');
    setValue(`products.${index}.specification`, '');
    setValue(`products.${index}.quantityPerPackage`, null);
    setValue(`products.${index}.unit`, '');
  }, [getValues, setValue]);

  /**
   * 商品追加ハンドラー
   */
  const handleAddProduct = useCallback(() => {
    const currentSuppliers = getValues('suppliers');
    const defaultSupplier = currentSuppliers && currentSuppliers.length > 0 ? currentSuppliers[0] : '';

    appendProduct({
      ...DEFAULT_PRODUCT_FORM_DATA,
      supplier: defaultSupplier,
      totalDelivery: 0,
      storeAllocations: new Array(STORE_COUNT).fill(0),
    });
  }, [appendProduct, getValues]);

  /**
   * 帳合先変更時のハンドラー
   */
  const handleSuppliersChange = useCallback((newSuppliers: string[]) => {
    const currentProducts = getValues('products');

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
  }, [getValues, suppliers]);

  /**
   * 帳合先削除の確認
   */
  const handleConfirmSupplierRemoval = useCallback(() => {
    const { suppliersToRemove, newSuppliers, affectedProductsCount } = supplierRemovalDialog;

    const currentProducts = getValues('products');

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
    setValue('products', newProducts);

    // 帳合先を更新
    setValue('suppliers', newSuppliers);
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
  }, [supplierRemovalDialog, getValues, setValue, showSuccess]);

  /**
   * 帳合先削除のキャンセル
   */
  const handleCancelSupplierRemoval = useCallback(() => {
    setSupplierRemovalDialog({
      open: false,
      suppliersToRemove: [],
      affectedProductsCount: 0,
      newSuppliers: [],
    });
  }, []);

  /**
   * 下書きの復元
   */
  const handleRestoreDraft = useCallback(() => {
    if (!userId) return;

    const draft = SessionStorageService.loadDraft(userId);
    if (draft) {
      reset(draft);
      showSuccess('下書きを復元しました');
    }
    setRestoreDialogOpen(false);
  }, [userId, reset, showSuccess]);

  /**
   * 下書きの破棄
   */
  const handleDiscardDraft = useCallback(() => {
    if (!userId) return;

    SessionStorageService.clearDraft(userId);
    setRestoreDialogOpen(false);
    showSuccess('下書きを破棄しました');
  }, [userId, showSuccess]);

  /**
   * フォームのクリア
   */
  const handleClearForm = useCallback(() => {
    if (!userId) return;

    reset({
      deliveryDate: new Date(),
      suppliers: [],
      products: [
        {
          ...DEFAULT_PRODUCT_FORM_DATA,
          totalDelivery: 0,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        },
      ],
    });

    SessionStorageService.clearDraft(userId);
    setHasUnsavedChanges(false);
    showSuccess('フォームをクリアしました');
  }, [userId, reset, showSuccess]);

  /**
   * ページロード時に下書きを復元
   */
  useEffect(() => {
    if (!userId || !isInitialLoad.current) return;

    isInitialLoad.current = false;

    const draft = SessionStorageService.loadDraft(userId);
    if (draft) {
      setRestoreDialogOpen(true);
    }
  }, [userId]);

  /**
   * フォームデータの自動保存（debounce付き）
   */
  useEffect(() => {
    if (!userId || isInitialLoad.current) return;

    // 変更があることをマーク
    setHasUnsavedChanges(true);

    // 既存のタイマーをクリア
    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current);
    }

    // 2秒後に自動保存
    autoSaveTimer.current = window.setTimeout(() => {
      const currentFormData = getValues();
      SessionStorageService.saveDraft(userId, currentFormData);
      console.log('Form auto-saved');
    }, 2000);

    return () => {
      if (autoSaveTimer.current) {
        window.clearTimeout(autoSaveTimer.current);
      }
    };
  }, [products, suppliers, deliveryDate, userId, getValues]);

  /**
   * ページ離脱時の警告
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return {
    // React Hook Form メソッド
    methods,
    control,
    reset,
    setValue,
    getValues,

    // フィールド配列
    productFields,
    appendProduct,
    removeProduct,
    moveProduct,

    // 監視するフィールド
    suppliers,
    products,
    deliveryDate,

    // 状態
    hasUnsavedChanges,
    setHasUnsavedChanges,
    restoreDialogOpen,
    setRestoreDialogOpen,
    supplierRemovalDialog,

    // ハンドラー
    handleRemoveProduct,
    handleClearProduct,
    handleAddProduct,
    handleSuppliersChange,
    handleConfirmSupplierRemoval,
    handleCancelSupplierRemoval,
    handleRestoreDraft,
    handleDiscardDraft,
    handleClearForm,
  };
};
