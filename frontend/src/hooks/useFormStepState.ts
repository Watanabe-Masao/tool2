import { useState, useCallback } from 'react';

/**
 * useFormStepState
 *
 * フォームステップ状態管理 Hook
 *
 * 責務:
 * - activeStep の管理
 * - ステップ遷移ロジック
 * - ステップバリデーション
 *
 * useOrderFormState から分割された hook。
 * 単一責任原則に従い、ステップ管理のみに責務を限定。
 *
 * @param totalSteps - 総ステップ数（デフォルト: 5）
 * @returns ステップ状態と操作関数
 *
 * @example
 * ```tsx
 * const {
 *   activeStep,
 *   handleNextStep,
 *   handlePrevStep,
 *   goToStep,
 *   isFirstStep,
 *   isLastStep
 * } = useFormStepState(5);
 *
 * // 次のステップへ
 * <Button onClick={handleNextStep}>Next</Button>
 *
 * // 前のステップへ
 * <Button onClick={handlePrevStep}>Previous</Button>
 *
 * // 特定のステップへジャンプ
 * <Button onClick={() => goToStep(2)}>Go to Step 3</Button>
 * ```
 */
export const useFormStepState = (totalSteps: number = 5) => {
  const [activeStep, setActiveStep] = useState(0);

  /**
   * 次のステップへ進む
   *
   * 最後のステップを超えることはできない。
   */
  const handleNextStep = useCallback(() => {
    setActiveStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  /**
   * 前のステップへ戻る
   *
   * 最初のステップより前には戻れない。
   */
  const handlePrevStep = useCallback(() => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  }, []);

  /**
   * 特定のステップへ移動
   *
   * @param step - 移動先のステップ番号（0-indexed）
   */
  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) {
        setActiveStep(step);
      }
    },
    [totalSteps]
  );

  /**
   * ステップをリセット（最初のステップへ）
   */
  const resetStep = useCallback(() => {
    setActiveStep(0);
  }, []);

  return {
    // State
    activeStep,
    setActiveStep,

    // Actions
    handleNextStep,
    handlePrevStep,
    goToStep,
    resetStep,

    // Computed
    isFirstStep: activeStep === 0,
    isLastStep: activeStep === totalSteps - 1,
    progress: ((activeStep + 1) / totalSteps) * 100, // Progress percentage
  };
};

/**
 * Return type for useFormStepState
 *
 * TypeScript 型定義用。
 */
export type UseFormStepStateReturn = ReturnType<typeof useFormStepState>;
