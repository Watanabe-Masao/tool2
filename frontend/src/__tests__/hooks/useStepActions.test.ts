import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStepActions } from '@/hooks/useStepActions';

describe('useStepActions', () => {
  const mockSetActiveStep = vi.fn();

  const defaultParams = {
    activeStep: 1,
    setActiveStep: mockSetActiveStep,
    TOTAL_STEPS: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleTabChange', () => {
    it('タブ変更時にsetActiveStepが呼ばれる', () => {
      const { result } = renderHook(() => useStepActions(defaultParams));

      act(() => {
        result.current.handleTabChange({} as React.SyntheticEvent, 3);
      });

      expect(mockSetActiveStep).toHaveBeenCalledWith(3);
    });

    it('同じステップへの変更も可能', () => {
      const { result } = renderHook(() => useStepActions(defaultParams));

      act(() => {
        result.current.handleTabChange({} as React.SyntheticEvent, 1);
      });

      expect(mockSetActiveStep).toHaveBeenCalledWith(1);
    });
  });

  describe('handlePrevStep', () => {
    it('前のステップへ移動できる', () => {
      const { result } = renderHook(() => useStepActions(defaultParams));

      act(() => {
        result.current.handlePrevStep();
      });

      expect(mockSetActiveStep).toHaveBeenCalledWith(0);
    });

    it('最初のステップ(step 0)では何もしない', () => {
      const { result } = renderHook(() =>
        useStepActions({
          ...defaultParams,
          activeStep: 0,
        })
      );

      act(() => {
        result.current.handlePrevStep();
      });

      expect(mockSetActiveStep).not.toHaveBeenCalled();
    });

    it('step 1からstep 0へ移動できる', () => {
      const { result } = renderHook(() =>
        useStepActions({
          ...defaultParams,
          activeStep: 1,
        })
      );

      act(() => {
        result.current.handlePrevStep();
      });

      expect(mockSetActiveStep).toHaveBeenCalledWith(0);
    });
  });

  describe('handleNextStep', () => {
    it('次のステップへ移動できる', () => {
      const { result } = renderHook(() => useStepActions(defaultParams));

      act(() => {
        result.current.handleNextStep();
      });

      expect(mockSetActiveStep).toHaveBeenCalledWith(2);
    });

    it('最後のステップでは何もしない', () => {
      const { result } = renderHook(() =>
        useStepActions({
          ...defaultParams,
          activeStep: 4, // TOTAL_STEPS - 1
        })
      );

      act(() => {
        result.current.handleNextStep();
      });

      expect(mockSetActiveStep).not.toHaveBeenCalled();
    });

    it('最後の1つ前から最後へ移動できる', () => {
      const { result } = renderHook(() =>
        useStepActions({
          ...defaultParams,
          activeStep: 3, // TOTAL_STEPS - 2
        })
      );

      act(() => {
        result.current.handleNextStep();
      });

      expect(mockSetActiveStep).toHaveBeenCalledWith(4);
    });
  });

  describe('境界値チェック', () => {
    it('step 0からhandlePrevStepを呼んでも変更されない', () => {
      const { result } = renderHook(() =>
        useStepActions({
          ...defaultParams,
          activeStep: 0,
        })
      );

      act(() => {
        result.current.handlePrevStep();
      });

      expect(mockSetActiveStep).not.toHaveBeenCalled();
    });

    it('最終stepからhandleNextStepを呼んでも変更されない', () => {
      const { result } = renderHook(() =>
        useStepActions({
          ...defaultParams,
          activeStep: 4, // TOTAL_STEPS - 1
        })
      );

      act(() => {
        result.current.handleNextStep();
      });

      expect(mockSetActiveStep).not.toHaveBeenCalled();
    });
  });

  describe('メモ化の確認', () => {
    it('依存配列が変わらなければ関数が再生成されない', () => {
      const { result, rerender } = renderHook(
        (props) => useStepActions(props),
        { initialProps: defaultParams }
      );

      const firstHandleTabChange = result.current.handleTabChange;
      const firstHandlePrevStep = result.current.handlePrevStep;
      const firstHandleNextStep = result.current.handleNextStep;

      rerender(defaultParams);

      expect(result.current.handleTabChange).toBe(firstHandleTabChange);
      expect(result.current.handlePrevStep).toBe(firstHandlePrevStep);
      expect(result.current.handleNextStep).toBe(firstHandleNextStep);
    });

    it('activeStepが変わると関数が再生成される', () => {
      const { result, rerender } = renderHook(
        (props) => useStepActions(props),
        { initialProps: defaultParams }
      );

      const firstHandlePrevStep = result.current.handlePrevStep;

      rerender({
        ...defaultParams,
        activeStep: 2,
      });

      expect(result.current.handlePrevStep).not.toBe(firstHandlePrevStep);
    });
  });
});
