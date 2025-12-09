import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStepNavigation } from '@/hooks/useStepNavigation';
import type { OrderFormData } from '@/schemas/orderSchema';

describe('useStepNavigation', () => {
  const mockGetValues = vi.fn<() => OrderFormData>();
  const mockSetStepNavigation = vi.fn();
  const mockSetActiveProductIndex = vi.fn();
  const mockHandlePrevStep = vi.fn();
  const mockHandleNextStep = vi.fn();

  const defaultParams = {
    activeStep: 0,
    activeProductIndex: 0,
    showGeneratedPreview: false,
    TOTAL_STEPS: 5,
    getValues: mockGetValues as any,
    setStepNavigation: mockSetStepNavigation as any,
    setActiveProductIndex: mockSetActiveProductIndex as any,
    handlePrevStep: mockHandlePrevStep as any,
    handleNextStep: mockHandleNextStep as any,
  };

  const mockFormData: OrderFormData = {
    deliveryDate: new Date('2024-01-01'),
    suppliers: ['supplier1'],
    products: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetValues.mockReturnValue(mockFormData);
  });

  describe('初期レンダリング', () => {
    it('showGeneratedPreview=falseの場合、setStepNavigationがtrueで呼ばれる', () => {
      renderHook(() => useStepNavigation(defaultParams));

      const calls = mockSetStepNavigation.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe(true);
      expect(lastCall[1]).toBe(0);
      expect(lastCall[2]).toBe(5);
      expect(lastCall[3]).toEqual(mockFormData);
      expect(lastCall[4]).toBeUndefined();
      expect(lastCall[5]).toBeUndefined();
      // handleNextStepはラップされた関数として渡される
      expect(typeof lastCall[6]).toBe('function');
      expect(lastCall[7]).toBeUndefined();
    });

    it('showGeneratedPreview=trueの場合、setStepNavigationがfalseで呼ばれる', () => {
      renderHook(() =>
        useStepNavigation({
          ...defaultParams,
          showGeneratedPreview: true,
        })
      );

      expect(mockSetStepNavigation).toHaveBeenCalledWith(false);
    });
  });

  describe('ステップ0: 基本情報入力', () => {
    it('handlePrevStepはundefined（最初のステップ）', () => {
      renderHook(() =>
        useStepNavigation({
          ...defaultParams,
          activeStep: 0,
        })
      );

      const calls = mockSetStepNavigation.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[5]).toBeUndefined(); // handlePrevStep
    });

    it('handleNextStepが渡される（次のステップがある）', () => {
      renderHook(() =>
        useStepNavigation({
          ...defaultParams,
          activeStep: 0,
        })
      );

      const calls = mockSetStepNavigation.mock.calls;
      const lastCall = calls[calls.length - 1];
      // handleNextStepはラップされた関数として渡される
      expect(typeof lastCall[6]).toBe('function');
      // ラップされた関数を呼び出すと元の関数が実行される
      lastCall[6]();
      expect(mockHandleNextStep).toHaveBeenCalled();
    });

    it('商品モードではない（activeProductIndexとsetActiveProductIndexはundefined）', () => {
      renderHook(() =>
        useStepNavigation({
          ...defaultParams,
          activeStep: 0,
        })
      );

      const calls = mockSetStepNavigation.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[4]).toBeUndefined(); // activeProductIndex
      expect(lastCall[7]).toBeUndefined(); // setActiveProductIndex
    });
  });

  describe('ステップ1-3: 商品モード', () => {
    it('activeStep=1で商品モードが有効になる', () => {
      renderHook(() =>
        useStepNavigation({
          ...defaultParams,
          activeStep: 1,
          activeProductIndex: 2,
        })
      );

      const calls = mockSetStepNavigation.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[4]).toBe(2); // activeProductIndex
      // setActiveProductIndexはラップされた関数として渡される
      expect(typeof lastCall[7]).toBe('function');
      lastCall[7](3);
      expect(mockSetActiveProductIndex).toHaveBeenCalledWith(3);
    });

    it('activeStep=2で商品モードが有効になる', () => {
      renderHook(() =>
        useStepNavigation({
          ...defaultParams,
          activeStep: 2,
          activeProductIndex: 1,
        })
      );

      const calls = mockSetStepNavigation.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[4]).toBe(1);
      expect(typeof lastCall[7]).toBe('function');
      lastCall[7](2);
      expect(mockSetActiveProductIndex).toHaveBeenCalledWith(2);
    });

    it('activeStep=3で商品モードが有効になる', () => {
      renderHook(() =>
        useStepNavigation({
          ...defaultParams,
          activeStep: 3,
          activeProductIndex: 0,
        })
      );

      const calls = mockSetStepNavigation.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[4]).toBe(0);
      expect(typeof lastCall[7]).toBe('function');
      lastCall[7](1);
      expect(mockSetActiveProductIndex).toHaveBeenCalledWith(1);
    });

    it('handlePrevStepとhandleNextStepの両方が渡される', () => {
      renderHook(() =>
        useStepNavigation({
          ...defaultParams,
          activeStep: 2,
        })
      );

      const calls = mockSetStepNavigation.mock.calls;
      const lastCall = calls[calls.length - 1];
      // ラップされた関数として渡される
      expect(typeof lastCall[5]).toBe('function');
      expect(typeof lastCall[6]).toBe('function');
      lastCall[5]();
      lastCall[6]();
      expect(mockHandlePrevStep).toHaveBeenCalled();
      expect(mockHandleNextStep).toHaveBeenCalled();
    });
  });

  describe('ステップ4: 最終ステップ', () => {
    it('handleNextStepはundefined（最後のステップ）', () => {
      renderHook(() =>
        useStepNavigation({
          ...defaultParams,
          activeStep: 4,
        })
      );

      const calls = mockSetStepNavigation.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[6]).toBeUndefined(); // handleNextStep
    });

    it('handlePrevStepが渡される', () => {
      renderHook(() =>
        useStepNavigation({
          ...defaultParams,
          activeStep: 4,
        })
      );

      const calls = mockSetStepNavigation.mock.calls;
      const lastCall = calls[calls.length - 1];
      // ラップされた関数として渡される
      expect(typeof lastCall[5]).toBe('function');
      lastCall[5]();
      expect(mockHandlePrevStep).toHaveBeenCalled();
    });

    it('商品モードではない', () => {
      renderHook(() =>
        useStepNavigation({
          ...defaultParams,
          activeStep: 4,
        })
      );

      const calls = mockSetStepNavigation.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[4]).toBeUndefined(); // activeProductIndex
      expect(lastCall[7]).toBeUndefined(); // setActiveProductIndex
    });
  });

  describe('依存配列の変更検知', () => {
    it('activeStepが変更されたら再実行される', () => {
      const { rerender } = renderHook(
        ({ step }) => useStepNavigation({ ...defaultParams, activeStep: step }),
        { initialProps: { step: 0 } }
      );

      expect(mockSetStepNavigation).toHaveBeenCalledTimes(1);

      rerender({ step: 1 });

      // rerender時: cleanup(false) + 新しいeffect(true, ...) = 2回追加 = 計3回
      expect(mockSetStepNavigation).toHaveBeenCalledTimes(3);
    });

    it('activeProductIndexが変更されたら再実行される', () => {
      const { rerender } = renderHook(
        ({ index }) =>
          useStepNavigation({
            ...defaultParams,
            activeStep: 1,
            activeProductIndex: index,
          }),
        { initialProps: { index: 0 } }
      );

      expect(mockSetStepNavigation).toHaveBeenCalledTimes(1);

      rerender({ index: 2 });

      // rerender時: cleanup(false) + 新しいeffect(true, ...) = 2回追加 = 計3回
      expect(mockSetStepNavigation).toHaveBeenCalledTimes(3);
    });

    it('showGeneratedPreviewが変更されたら再実行される', () => {
      const { rerender } = renderHook(
        ({ show }) =>
          useStepNavigation({
            ...defaultParams,
            showGeneratedPreview: show,
          }),
        { initialProps: { show: false } }
      );

      // 初回: showGeneratedPreview=false → setStepNavigation(true, ...)
      expect(mockSetStepNavigation).toHaveBeenCalledTimes(1);
      const firstCall = mockSetStepNavigation.mock.calls[0];
      expect(firstCall[0]).toBe(true);

      rerender({ show: true });

      // rerender時: cleanup(false) + 新しいeffect(false) = 2回追加 = 計3回
      // 最後の呼び出しは showGeneratedPreview=true → setStepNavigation(false)
      expect(mockSetStepNavigation).toHaveBeenCalledTimes(3);
      expect(mockSetStepNavigation).toHaveBeenLastCalledWith(false);
    });

    // NOTE: products, suppliers, deliveryDateは依存配列から除外済み
    // これらはuseWatchから取得され、毎回新しい参照が作成されるため
    // 無限ループ(React #185)を引き起こすため、意図的に監視しない
  });

  describe('クリーンアップ', () => {
    it('アンマウント時にsetStepNavigation(false)が呼ばれる', () => {
      const { unmount } = renderHook(() => useStepNavigation(defaultParams));

      // マウント時の呼び出し（1回）
      expect(mockSetStepNavigation).toHaveBeenCalledTimes(1);
      const firstCall = mockSetStepNavigation.mock.calls[0];
      expect(firstCall[0]).toBe(true); // active=true

      unmount();

      // アンマウント時のクリーンアップ（2回目）
      expect(mockSetStepNavigation).toHaveBeenCalledTimes(2);
      expect(mockSetStepNavigation).toHaveBeenLastCalledWith(false);
    });

    it('複数回のマウント/アンマウントでも正しく動作する', () => {
      const { unmount: unmount1 } = renderHook(() =>
        useStepNavigation(defaultParams)
      );

      expect(mockSetStepNavigation).toHaveBeenCalledTimes(1);

      unmount1();

      expect(mockSetStepNavigation).toHaveBeenLastCalledWith(false);

      const { unmount: unmount2 } = renderHook(() =>
        useStepNavigation(defaultParams)
      );

      expect(mockSetStepNavigation).toHaveBeenCalledTimes(3); // mount1, unmount1, mount2

      unmount2();

      expect(mockSetStepNavigation).toHaveBeenCalledTimes(4); // mount1, unmount1, mount2, unmount2
    });
  });

  describe('getValues()の呼び出し', () => {
    it('setStepNavigationに渡されるformDataはgetValues()の戻り値', () => {
      const customFormData: OrderFormData = {
        deliveryDate: new Date('2024-02-01'),
        suppliers: ['supplier-A', 'supplier-B'],
        products: [{ name: 'product1' }] as any,
      };

      mockGetValues.mockReturnValue(customFormData);

      renderHook(() => useStepNavigation(defaultParams));

      const calls = mockSetStepNavigation.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[3]).toEqual(customFormData);
    });
  });
});
