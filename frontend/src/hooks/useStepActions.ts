import { useCallback } from 'react';

/**
 * useStepActionsのパラメータ
 */
interface UseStepActionsParams {
  activeStep: number;
  setActiveStep: (step: number) => void;
  TOTAL_STEPS: number;
}

/**
 * useStepActions
 *
 * ステップナビゲーション機能を提供するカスタムフック
 *
 * 責務:
 * - タブ変更
 * - 前のステップへ移動
 * - 次のステップへ移動
 *
 * 注意:
 * このhookは実際のステップ変更ロジック（setActiveStep呼び出し）を担当します。
 * useStepNavigationは、このhookが提供するhandlerを受け取り、
 * NavigationContextへの状態同期を担当します。
 *
 * @example
 * ```typescript
 * const {
 *   handleTabChange,
 *   handlePrevStep,
 *   handleNextStep,
 * } = useStepActions({
 *   activeStep,
 *   setActiveStep,
 *   TOTAL_STEPS: 5,
 * });
 *
 * // これらのhandlerをuseStepNavigationに渡す
 * useStepNavigation({
 *   // ...
 *   handlePrevStep,
 *   handleNextStep,
 * });
 * ```
 */
export const useStepActions = ({
  activeStep,
  setActiveStep,
  TOTAL_STEPS,
}: UseStepActionsParams) => {
  /**
   * タブ変更時の処理
   *
   * ユーザーがタブをクリックした際に呼ばれる。
   */
  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      setActiveStep(newValue);
    },
    [setActiveStep]
  );

  /**
   * 前のステップへ移動
   *
   * 最初のステップ（step 0）の場合は何もしない。
   */
  const handlePrevStep = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  }, [activeStep, setActiveStep]);

  /**
   * 次のステップへ移動
   *
   * 最後のステップの場合は何もしない。
   */
  const handleNextStep = useCallback(() => {
    if (activeStep < TOTAL_STEPS - 1) {
      setActiveStep(activeStep + 1);
    }
  }, [activeStep, TOTAL_STEPS, setActiveStep]);

  return {
    handleTabChange,
    handlePrevStep,
    handleNextStep,
  };
};
