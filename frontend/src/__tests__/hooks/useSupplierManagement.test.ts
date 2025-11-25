import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSupplierManagement } from '@/hooks/useSupplierManagement';
import { DEFAULT_PRODUCT_FORM_DATA, STORE_COUNT } from '@/utils/constants';
import type { OrderFormData } from '@/schemas/orderSchema';

describe('useSupplierManagement', () => {
  const mockGetValues = vi.fn<() => OrderFormData>();
  const mockSetValue = vi.fn();
  const mockMethods = {
    getValues: mockGetValues,
    setValue: mockSetValue,
  } as any;

  const mockShowSuccess = vi.fn();
  const mockIsInitialLoad = { current: false };

  const defaultParams = {
    methods: mockMethods,
    suppliers: ['supplier1', 'supplier2'],
    isInitialLoad: mockIsInitialLoad,
    showSuccess: mockShowSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsInitialLoad.current = false;
  });

  describe('初期状態', () => {
    it('supplierRemovalDialogの初期値', () => {
      const { result } = renderHook(() => useSupplierManagement(defaultParams));

      expect(result.current.supplierRemovalDialog).toEqual({
        open: false,
        suppliersToRemove: [],
        affectedProductsCount: 0,
        newSuppliers: [],
      });
    });
  });

  describe('handleSuppliersChange', () => {
    it('初回ロード時はそのまま新しい帳合先を返す', () => {
      mockIsInitialLoad.current = true;
      mockGetValues.mockReturnValue([] as any);

      const { result } = renderHook(() => useSupplierManagement(defaultParams));

      const newSuppliers = ['supplier3', 'supplier4'];
      const returnValue = result.current.handleSuppliersChange(newSuppliers);

      expect(returnValue).toEqual(newSuppliers);
      expect(result.current.supplierRemovalDialog.open).toBe(false);
    });

    it('商品がない場合はそのまま新しい帳合先を返す', () => {
      // getValues('products')は商品配列を直接返す
      mockGetValues.mockReturnValue([] as any);

      const { result } = renderHook(() => useSupplierManagement(defaultParams));

      const newSuppliers = ['supplier3'];
      const returnValue = result.current.handleSuppliersChange(newSuppliers);

      expect(returnValue).toEqual(newSuppliers);
      expect(result.current.supplierRemovalDialog.open).toBe(false);
    });

    it('削除される帳合先が商品で使用されていない場合はそのまま適用', () => {
      const products = [
        { supplier: 'supplier1', name: 'Product A' },
        { supplier: 'supplier2', name: 'Product B' },
      ];
      mockGetValues.mockReturnValue(products as any);

      const { result } = renderHook(() => useSupplierManagement(defaultParams));

      // supplier3を追加してsupplier1を削除（supplier1は使用されている）
      // ただし、このテストでは削除されない帳合先を確認
      const newSuppliers = ['supplier1', 'supplier2', 'supplier3'];
      const returnValue = result.current.handleSuppliersChange(newSuppliers);

      expect(returnValue).toEqual(newSuppliers);
      expect(result.current.supplierRemovalDialog.open).toBe(false);
    });

    it('削除される帳合先が商品で使用されている場合は確認ダイアログを表示', () => {
      const products = [
        { supplier: 'supplier1', name: 'Product A' },
        { supplier: 'supplier2', name: 'Product B' },
        { supplier: 'supplier2', name: 'Product C' },
      ];
      mockGetValues.mockReturnValue(products as any);

      const { result } = renderHook(() => useSupplierManagement(defaultParams));

      // supplier2を削除（2つの商品が使用している）
      const newSuppliers = ['supplier1'];
      let returnValue: string[];

      act(() => {
        returnValue = result.current.handleSuppliersChange(newSuppliers);
      });

      // 変更は保留される（現在の帳合先を返す）
      expect(returnValue!).toEqual(['supplier1', 'supplier2']);

      // ダイアログが開く
      expect(result.current.supplierRemovalDialog).toEqual({
        open: true,
        suppliersToRemove: ['supplier2'],
        affectedProductsCount: 2,
        newSuppliers: ['supplier1'],
      });
    });

    it('複数の帳合先を削除する場合もダイアログ表示', () => {
      const products = [
        { supplier: 'supplier1', name: 'Product A' },
        { supplier: 'supplier2', name: 'Product B' },
      ];
      mockGetValues.mockReturnValue(products as any);

      const { result } = renderHook(() =>
        useSupplierManagement({
          ...defaultParams,
          suppliers: ['supplier1', 'supplier2', 'supplier3'],
        })
      );

      // supplier1とsupplier2を削除
      const newSuppliers = ['supplier3'];
      let returnValue: string[];

      act(() => {
        returnValue = result.current.handleSuppliersChange(newSuppliers);
      });

      expect(returnValue!).toEqual(['supplier1', 'supplier2', 'supplier3']);

      expect(result.current.supplierRemovalDialog).toEqual({
        open: true,
        suppliersToRemove: ['supplier1', 'supplier2'],
        affectedProductsCount: 2,
        newSuppliers: ['supplier3'],
      });
    });

    it('supplierがundefinedの商品は影響を受けない', () => {
      const products = [
        { supplier: undefined, name: 'Product A' },
        { supplier: 'supplier1', name: 'Product B' },
      ];
      mockGetValues.mockReturnValue(products as any);

      const { result } = renderHook(() => useSupplierManagement(defaultParams));

      // supplier1を削除
      const newSuppliers = ['supplier2'];
      let returnValue: string[];

      act(() => {
        returnValue = result.current.handleSuppliersChange(newSuppliers);
      });

      expect(returnValue!).toEqual(['supplier1', 'supplier2']);

      expect(result.current.supplierRemovalDialog).toEqual({
        open: true,
        suppliersToRemove: ['supplier1'],
        affectedProductsCount: 1, // Product Bのみ
        newSuppliers: ['supplier2'],
      });
    });
  });

  describe('handleConfirmSupplierRemoval', () => {
    it('削除される帳合先を使用している商品を削除する', () => {
      const products = [
        { supplier: 'supplier1', name: 'Product A' },
        { supplier: 'supplier2', name: 'Product B' },
        { supplier: 'supplier2', name: 'Product C' },
      ];
      mockGetValues.mockReturnValue(products as any);

      const { result } = renderHook(() => useSupplierManagement(defaultParams));

      // supplier2を削除するダイアログを表示
      act(() => {
        result.current.handleSuppliersChange(['supplier1']);
      });

      // 削除を確認
      act(() => {
        result.current.handleConfirmSupplierRemoval();
      });

      // supplier2を使用している商品が削除される
      expect(mockSetValue).toHaveBeenCalledWith('products', [
        { supplier: 'supplier1', name: 'Product A' },
      ]);

      // 帳合先が更新される
      expect(mockSetValue).toHaveBeenCalledWith('suppliers', ['supplier1']);

      // 成功メッセージが表示される
      expect(mockShowSuccess).toHaveBeenCalledWith(
        '帳合先「supplier2」を削除し、関連する商品カード2件を削除しました'
      );

      // ダイアログが閉じる
      expect(result.current.supplierRemovalDialog.open).toBe(false);
    });

    it('すべての商品が削除される場合はデフォルトの商品を追加', () => {
      const products = [
        { supplier: 'supplier1', name: 'Product A' },
        { supplier: 'supplier1', name: 'Product B' },
      ];
      mockGetValues.mockReturnValue(products as any);

      const { result } = renderHook(() => useSupplierManagement(defaultParams));

      // supplier1を削除するダイアログを表示
      act(() => {
        result.current.handleSuppliersChange(['supplier2']);
      });

      // 削除を確認
      act(() => {
        result.current.handleConfirmSupplierRemoval();
      });

      // デフォルトの空の商品が追加される
      expect(mockSetValue).toHaveBeenCalledWith('products', [
        {
          ...DEFAULT_PRODUCT_FORM_DATA,
          totalDelivery: 0,
          storeAllocations: new Array(STORE_COUNT).fill(0),
        },
      ]);
    });

    it('複数の帳合先を削除する場合のメッセージ', () => {
      const products = [
        { supplier: 'supplier1', name: 'Product A' },
        { supplier: 'supplier2', name: 'Product B' },
      ];
      mockGetValues.mockReturnValue(products as any);

      const { result } = renderHook(() =>
        useSupplierManagement({
          ...defaultParams,
          suppliers: ['supplier1', 'supplier2', 'supplier3'],
        })
      );

      // supplier1とsupplier2を削除
      act(() => {
        result.current.handleSuppliersChange(['supplier3']);
      });

      act(() => {
        result.current.handleConfirmSupplierRemoval();
      });

      expect(mockShowSuccess).toHaveBeenCalledWith(
        '帳合先「supplier1、supplier2」を削除し、関連する商品カード2件を削除しました'
      );
    });

    it('supplier=undefinedの商品は削除されない', () => {
      const products = [
        { supplier: undefined, name: 'Product A' },
        { supplier: 'supplier1', name: 'Product B' },
      ];
      mockGetValues.mockReturnValue(products as any);

      const { result } = renderHook(() => useSupplierManagement(defaultParams));

      // supplier1を削除
      act(() => {
        result.current.handleSuppliersChange(['supplier2']);
      });

      act(() => {
        result.current.handleConfirmSupplierRemoval();
      });

      // supplier=undefinedの商品は残る
      expect(mockSetValue).toHaveBeenCalledWith('products', [
        { supplier: undefined, name: 'Product A' },
      ]);
    });
  });

  describe('handleCancelSupplierRemoval', () => {
    it('ダイアログを閉じる', () => {
      const products = [
        { supplier: 'supplier1', name: 'Product A' },
      ];
      mockGetValues.mockReturnValue(products as any);

      const { result } = renderHook(() => useSupplierManagement(defaultParams));

      // ダイアログを開く
      act(() => {
        result.current.handleSuppliersChange(['supplier2']);
      });

      expect(result.current.supplierRemovalDialog.open).toBe(true);

      // キャンセル
      act(() => {
        result.current.handleCancelSupplierRemoval();
      });

      // ダイアログが閉じる
      expect(result.current.supplierRemovalDialog).toEqual({
        open: false,
        suppliersToRemove: [],
        affectedProductsCount: 0,
        newSuppliers: [],
      });

      // setValueは呼ばれない（変更がキャンセルされる）
      expect(mockSetValue).not.toHaveBeenCalled();
      expect(mockShowSuccess).not.toHaveBeenCalled();
    });
  });
});
