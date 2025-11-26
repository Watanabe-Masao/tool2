import { useEffect } from 'react';
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
      const currentFormData = getValues();
      setStepNavigation(
        true,
        activeStep,
        TOTAL_STEPS,
        currentFormData,
        isProductMode ? activeProductIndex : undefined,
        activeStep > 0 ? handlePrevStep : undefined,
        activeStep < TOTAL_STEPS - 1 ? handleNextStep : undefined,
        isProductMode ? setActiveProductIndex : undefined
      );
    }

    // コンポーネントがアンマウントされる時にステップナビゲーションを非アクティブに
    return () => {
      setStepNavigation(false);
    };
    // NOTE: products, suppliers, deliveryDateは依存配列から除外
    // これらはuseWatchから取得され、毎回新しい参照が作成されるため
    // 無限ループ(React #185)を引き起こす
    // フォームデータはgetValues()経由で取得するため問題なし
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeStep,
    activeProductIndex,
    showGeneratedPreview,
    getValues,
    setStepNavigation,
    handlePrevStep,
    handleNextStep,
    setActiveProductIndex,
    TOTAL_STEPS,
  ]);
};
