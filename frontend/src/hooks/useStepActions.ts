import { useCallback } from 'react';

/**
 * useStepActionsのパラメータ
 */
interface UseStepActionsParams {
  /** 現在のステップ */
  activeStep: number;
  /** ステップ変更関数 */
  setActiveStep: (step: number) => void;
  /** 総ステップ数 */
  TOTAL_STEPS: number;
}

/**
 * useStepActionsの戻り値
 */
interface UseStepActionsReturn {
  /** タブ変更ハンドラー */
  handleTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  /** 前のステップへ移動 */
  handlePrevStep: () => void;
  /** 次のステップへ移動 */
  handleNextStep: () => void;
}

/**
 * useStepActions
 *
 * ステップナビゲーションのアクション（前へ・次へ・タブ変更）を提供するカスタムフック
 *
 * 責務:
 * - ステップ間のナビゲーション（前へ・次へ）
 * - タブ変更によるステップ切り替え
 * - ステップ境界のチェック（0未満・最大超過の防止）
 *
 * @example
 * ```typescript
 * const { handleTabChange, handlePrevStep, handleNextStep } = useStepActions({
 *   activeStep,
 *   setActiveStep,
 *   TOTAL_STEPS,
 * });
 * ```
 */
export const useStepActions = ({
  activeStep,
  setActiveStep,
  TOTAL_STEPS,
}: UseStepActionsParams): UseStepActionsReturn => {
  /**
   * タブ変更ハンドラー
   */
  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      if (newValue >= 0 && newValue < TOTAL_STEPS) {
        setActiveStep(newValue);
      }
    },
    [setActiveStep, TOTAL_STEPS]
  );

  /**
   * 前のステップへ移動
   */
  const handlePrevStep = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  }, [activeStep, setActiveStep]);

  /**
   * 次のステップへ移動
   */
  const handleNextStep = useCallback(() => {
    if (activeStep < TOTAL_STEPS - 1) {
      setActiveStep(activeStep + 1);
    }
  }, [activeStep, setActiveStep, TOTAL_STEPS]);

  return {
    handleTabChange,
    handlePrevStep,
    handleNextStep,
  };
};
