import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAllocationActions } from '@/hooks/useAllocationActions';

describe('useAllocationActions', () => {
  const mockSetValue = vi.fn();
  const mockSetLockedStores = vi.fn();

  const defaultParams = {
    setValue: mockSetValue,
    setLockedStores: mockSetLockedStores,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAllocationChange', () => {
    it('配分数量を変更できる', () => {
      const { result } = renderHook(() => useAllocationActions(defaultParams));

      act(() => {
        result.current.handleAllocationChange(0, 5, 10);
      });

      expect(mockSetValue).toHaveBeenCalledWith(
        'products.0.storeAllocations.5',
        10,
        {
          shouldValidate: true,
          shouldDirty: true,
        }
      );
    });

    it('異なる商品の配分を変更できる', () => {
      const { result } = renderHook(() => useAllocationActions(defaultParams));

      act(() => {
        result.current.handleAllocationChange(2, 10, 20);
      });

      expect(mockSetValue).toHaveBeenCalledWith(
        'products.2.storeAllocations.10',
        20,
        {
          shouldValidate: true,
          shouldDirty: true,
        }
      );
    });

    it('0を設定できる', () => {
      const { result } = renderHook(() => useAllocationActions(defaultParams));

      act(() => {
        result.current.handleAllocationChange(1, 3, 0);
      });

      expect(mockSetValue).toHaveBeenCalledWith(
        'products.1.storeAllocations.3',
        0,
        {
          shouldValidate: true,
          shouldDirty: true,
        }
      );
    });

    it('shouldValidateとshouldDirtyフラグがtrueに設定される', () => {
      const { result } = renderHook(() => useAllocationActions(defaultParams));

      act(() => {
        result.current.handleAllocationChange(0, 0, 5);
      });

      const callArgs = mockSetValue.mock.calls[0];
      expect(callArgs[2]).toEqual({
        shouldValidate: true,
        shouldDirty: true,
      });
    });
  });

  describe('handleToggleLock', () => {
    it('ロックを追加できる', () => {
      const { result } = renderHook(() => useAllocationActions(defaultParams));

      act(() => {
        result.current.handleToggleLock(0, 'STORE001');
      });

      expect(mockSetLockedStores).toHaveBeenCalledTimes(1);

      // setLockedStoresに渡されたupdater関数を実行してテスト
      const updater = mockSetLockedStores.mock.calls[0][0];
      const prevMap = new Map();
      const newMap = updater(prevMap);

      expect(newMap.get(0)).toEqual(new Set(['STORE001']));
    });

    it('既存のロックを削除できる', () => {
      const { result } = renderHook(() => useAllocationActions(defaultParams));

      act(() => {
        result.current.handleToggleLock(0, 'STORE001');
      });

      // 2回目の呼び出しで削除
      act(() => {
        result.current.handleToggleLock(0, 'STORE001');
      });

      expect(mockSetLockedStores).toHaveBeenCalledTimes(2);

      // 2回目のupdater関数を実行してテスト
      const updater2 = mockSetLockedStores.mock.calls[1][0];
      const prevMap = new Map([[0, new Set(['STORE001'])]]);
      const newMap = updater2(prevMap);

      expect(newMap.get(0)).toEqual(new Set());
    });

    it('複数の店舗をロックできる', () => {
      const { result } = renderHook(() => useAllocationActions(defaultParams));

      act(() => {
        result.current.handleToggleLock(0, 'STORE001');
      });
      act(() => {
        result.current.handleToggleLock(0, 'STORE002');
      });

      // 2回目のupdater関数を実行してテスト
      const updater2 = mockSetLockedStores.mock.calls[1][0];
      const prevMap = new Map([[0, new Set(['STORE001'])]]);
      const newMap = updater2(prevMap);

      expect(newMap.get(0)).toEqual(new Set(['STORE001', 'STORE002']));
    });

    it('複数の商品で独立してロックを管理できる', () => {
      const { result } = renderHook(() => useAllocationActions(defaultParams));

      act(() => {
        result.current.handleToggleLock(0, 'STORE001');
      });
      act(() => {
        result.current.handleToggleLock(1, 'STORE002');
      });

      // 2回目のupdater関数を実行してテスト
      const updater2 = mockSetLockedStores.mock.calls[1][0];
      const prevMap = new Map([[0, new Set(['STORE001'])]]);
      const newMap = updater2(prevMap);

      expect(newMap.get(0)).toEqual(new Set(['STORE001']));
      expect(newMap.get(1)).toEqual(new Set(['STORE002']));
    });

    it('空のロックセットから開始できる', () => {
      const { result } = renderHook(() => useAllocationActions(defaultParams));

      act(() => {
        result.current.handleToggleLock(0, 'STORE001');
      });

      const updater = mockSetLockedStores.mock.calls[0][0];
      const prevMap = new Map();
      const newMap = updater(prevMap);

      expect(newMap.get(0)).toEqual(new Set(['STORE001']));
    });
  });

  describe('メモ化の確認', () => {
    it('依存配列が変わらなければ関数が再生成されない', () => {
      const { result, rerender } = renderHook(
        (props) => useAllocationActions(props),
        { initialProps: defaultParams }
      );

      const firstHandleAllocationChange = result.current.handleAllocationChange;
      const firstHandleToggleLock = result.current.handleToggleLock;

      rerender(defaultParams);

      expect(result.current.handleAllocationChange).toBe(firstHandleAllocationChange);
      expect(result.current.handleToggleLock).toBe(firstHandleToggleLock);
    });

    it('setValueが変わると関数が再生成される', () => {
      const { result, rerender } = renderHook(
        (props) => useAllocationActions(props),
        { initialProps: defaultParams }
      );

      const firstHandleAllocationChange = result.current.handleAllocationChange;

      rerender({
        ...defaultParams,
        setValue: vi.fn(),
      });

      expect(result.current.handleAllocationChange).not.toBe(firstHandleAllocationChange);
    });
  });
});
