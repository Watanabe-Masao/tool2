import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProductActions } from '@/hooks/useProductActions';

describe('useProductActions', () => {
  const mockSetValue = vi.fn();
  const mockRemoveProduct = vi.fn();
  const mockSetActiveProductIndex = vi.fn();

  const defaultParams = {
    setValue: mockSetValue,
    productFields: [
      { id: '1', name: 'Product 1' },
      { id: '2', name: 'Product 2' },
      { id: '3', name: 'Product 3' },
    ] as any,
    removeProduct: mockRemoveProduct,
    activeProductIndex: 1,
    setActiveProductIndex: mockSetActiveProductIndex,
    suppliers: ['supplier1', 'supplier2'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleRemoveProduct', () => {
    it('商品を削除できる（通常ケース）', () => {
      const { result } = renderHook(() => useProductActions(defaultParams));

      act(() => {
        result.current.handleRemoveProduct(2);
      });

      expect(mockRemoveProduct).toHaveBeenCalledWith(2);
    });

    it('最後の1つの商品は削除できない', () => {
      const { result } = renderHook(() =>
        useProductActions({
          ...defaultParams,
          productFields: [{ id: '1', name: 'Product 1' }] as any,
        })
      );

      act(() => {
        result.current.handleRemoveProduct(0);
      });

      expect(mockRemoveProduct).not.toHaveBeenCalled();
    });

    it('削除位置より後ろのactiveProductIndexは調整されない', () => {
      const { result } = renderHook(() =>
        useProductActions({
          ...defaultParams,
          activeProductIndex: 0,
        })
      );

      act(() => {
        result.current.handleRemoveProduct(2);
      });

      expect(mockRemoveProduct).toHaveBeenCalledWith(2);
      expect(mockSetActiveProductIndex).not.toHaveBeenCalled();
    });

    it('削除位置と同じactiveProductIndexは1つ前に移動する', () => {
      const { result } = renderHook(() =>
        useProductActions({
          ...defaultParams,
          activeProductIndex: 2,
        })
      );

      act(() => {
        result.current.handleRemoveProduct(2);
      });

      expect(mockRemoveProduct).toHaveBeenCalledWith(2);
      expect(mockSetActiveProductIndex).toHaveBeenCalledWith(1);
    });

    it('削除位置より前のactiveProductIndexは1つ前に移動する', () => {
      const { result } = renderHook(() =>
        useProductActions({
          ...defaultParams,
          activeProductIndex: 2,
        })
      );

      act(() => {
        result.current.handleRemoveProduct(1);
      });

      expect(mockRemoveProduct).toHaveBeenCalledWith(1);
      expect(mockSetActiveProductIndex).toHaveBeenCalledWith(1);
    });

    it('activeProductIndex=0の場合は調整されない', () => {
      const { result } = renderHook(() =>
        useProductActions({
          ...defaultParams,
          activeProductIndex: 0,
        })
      );

      act(() => {
        result.current.handleRemoveProduct(0);
      });

      expect(mockRemoveProduct).toHaveBeenCalledWith(0);
      expect(mockSetActiveProductIndex).not.toHaveBeenCalled();
    });
  });

  describe('handleClearProduct', () => {
    it('商品フィールドをクリアできる（帳合先あり）', () => {
      const { result } = renderHook(() => useProductActions(defaultParams));

      act(() => {
        result.current.handleClearProduct(1);
      });

      expect(mockSetValue).toHaveBeenCalledWith('products.1.categoryCode', '');
      expect(mockSetValue).toHaveBeenCalledWith('products.1.supplier', 'supplier1');
      expect(mockSetValue).toHaveBeenCalledWith('products.1.name', '');
      expect(mockSetValue).toHaveBeenCalledWith('products.1.origin', '');
      expect(mockSetValue).toHaveBeenCalledWith('products.1.specification', '');
      expect(mockSetValue).toHaveBeenCalledWith('products.1.quantityPerPackage', null);
      expect(mockSetValue).toHaveBeenCalledWith('products.1.specificationUnit', '');
    });

    it('帳合先がない場合は空文字をセットする', () => {
      const { result } = renderHook(() =>
        useProductActions({
          ...defaultParams,
          suppliers: [],
        })
      );

      act(() => {
        result.current.handleClearProduct(0);
      });

      expect(mockSetValue).toHaveBeenCalledWith('products.0.supplier', '');
    });

    it('帳合先がundefinedの場合は空文字をセットする', () => {
      const { result } = renderHook(() =>
        useProductActions({
          ...defaultParams,
          suppliers: undefined,
        })
      );

      act(() => {
        result.current.handleClearProduct(0);
      });

      expect(mockSetValue).toHaveBeenCalledWith('products.0.supplier', '');
    });

    it('異なるインデックスで複数回クリアできる', () => {
      const { result } = renderHook(() => useProductActions(defaultParams));

      act(() => {
        result.current.handleClearProduct(0);
        result.current.handleClearProduct(2);
      });

      // 各フィールドが2回ずつ呼ばれる（0と2のインデックス）
      expect(mockSetValue).toHaveBeenCalledWith('products.0.name', '');
      expect(mockSetValue).toHaveBeenCalledWith('products.2.name', '');
    });
  });

  describe('メモ化の確認', () => {
    it('依存配列が変わらなければ関数が再生成されない', () => {
      const { result, rerender } = renderHook(
        (props) => useProductActions(props),
        { initialProps: defaultParams }
      );

      const firstHandleRemoveProduct = result.current.handleRemoveProduct;
      const firstHandleClearProduct = result.current.handleClearProduct;

      // 同じpropsで再レンダリング
      rerender(defaultParams);

      expect(result.current.handleRemoveProduct).toBe(firstHandleRemoveProduct);
      expect(result.current.handleClearProduct).toBe(firstHandleClearProduct);
    });

    it('依存配列が変わると関数が再生成される', () => {
      const { result, rerender } = renderHook(
        (props) => useProductActions(props),
        { initialProps: defaultParams }
      );

      const firstHandleRemoveProduct = result.current.handleRemoveProduct;

      // activeProductIndexを変更
      rerender({
        ...defaultParams,
        activeProductIndex: 2,
      });

      expect(result.current.handleRemoveProduct).not.toBe(firstHandleRemoveProduct);
    });
  });
});
