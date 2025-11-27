import { useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';

/**
 * useStepNavigationのパラメータ
 */
interface UseStepNavigationParams {
  // Step state
  activeStep: number;
  activeProductIndex: number;
  showGeneratedPreview: boolean;
  TOTAL_STEPS: number;

  // NOTE: products, suppliers, deliveryDateは依存配列から除外済み
  // これらはuseWatchから取得され、毎回新しい参照が作成されるため
  // 無限ループ(React #185)を引き起こす
  // フォームデータはgetValues()経由で取得するため問題なし

  // Methods
  getValues: UseFormReturn<OrderFormData>['getValues'];
  setStepNavigation: (
    active: boolean,
    currentStep?: number,
    totalSteps?: number,
    formData?: OrderFormData,
    activeProductIndex?: number,
    onPrevStep?: () => void,
    onNextStep?: () => void,
    onProductChange?: (index: number) => void
  ) => void;
  setActiveProductIndex: (index: number) => void;

  // Handlers
  handlePrevStep: () => void;
  handleNextStep: () => void;
}

/**
 * useStepNavigation
 *
 * NavigationContextのステップナビゲーション状態を管理するカスタムフック
 *
 * 責務:
 * - ステップ変更時のNavigationContext更新
 * - 生成後プレビュー時のナビゲーション非表示
 * - コンポーネントアンマウント時のクリーンアップ
 *
 * @example
 * ```typescript
 * useStepNavigation({
 *   activeStep,
 *   activeProductIndex,
 *   showGeneratedPreview,
 *   TOTAL_STEPS,
 *   products,
 *   suppliers,
 *   deliveryDate,
 *   getValues,
 *   setStepNavigation,
 *   setActiveProductIndex,
 *   handlePrevStep,
 *   handleNextStep,
 * });
 * ```
 */
export const useStepNavigation = ({
  activeStep,
  activeProductIndex,
  showGeneratedPreview,
  TOTAL_STEPS,
  getValues,
  setStepNavigation,
  setActiveProductIndex,
  handlePrevStep,
  handleNextStep,
}: UseStepNavigationParams) => {
  // NOTE: 関数をrefで保持して依存配列から除外（無限ループ防止）
  // これらの関数はactiveStepに依存するため、毎回新しい参照が作成される
  // refを使うことで、依存配列の変更による再実行を防ぐ
  const handlePrevStepRef = useRef(handlePrevStep);
  const handleNextStepRef = useRef(handleNextStep);
  const setActiveProductIndexRef = useRef(setActiveProductIndex);
  const getValuesRef = useRef(getValues);

  // 最新の参照を保持
  useEffect(() => {
    handlePrevStepRef.current = handlePrevStep;
    handleNextStepRef.current = handleNextStep;
    setActiveProductIndexRef.current = setActiveProductIndex;
    getValuesRef.current = getValues;
  });

  /**
   * NavigationContextを更新（ステップナビゲーション表示状態）
   * React#185対策: formDataを直接監視せず、getValues()を使用
   */
  useEffect(() => {
    // 生成後のプレビュー表示中はステップナビゲーションを非アクティブに
    if (showGeneratedPreview) {
      setStepNavigation(false);
    } else {
      // フォーム入力中はステップナビゲーションをアクティブに
      // ステップ2-4では商品インデックスと商品切り替えハンドラーも渡す
      const isProductMode = activeStep >= 1 && activeStep <= 3;
      const currentFormData = getValuesRef.current();
      setStepNavigation(
        true,
        activeStep,
        TOTAL_STEPS,
        currentFormData,
        isProductMode ? activeProductIndex : undefined,
        activeStep > 0 ? () => handlePrevStepRef.current() : undefined,
        activeStep < TOTAL_STEPS - 1 ? () => handleNextStepRef.current() : undefined,
        isProductMode ? (index: number) => setActiveProductIndexRef.current(index) : undefined
      );
    }

    // コンポーネントがアンマウントされる時にステップナビゲーションを非アクティブに
    return () => {
      setStepNavigation(false);
    };
    // NOTE: 関数はrefで保持しているため依存配列から除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeStep,
    activeProductIndex,
    showGeneratedPreview,
    setStepNavigation,
    TOTAL_STEPS,
  ]);
};
