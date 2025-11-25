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

  // Form data
  products: any[] | undefined;
  suppliers: string[] | undefined;
  deliveryDate: Date | null | undefined;

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
  products,
  suppliers,
  deliveryDate,
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
  }, [
    activeStep,
    activeProductIndex,
    showGeneratedPreview,
    products,
    suppliers,
    deliveryDate,
    getValues,
    setStepNavigation,
    handlePrevStep,
    handleNextStep,
    setActiveProductIndex,
    TOTAL_STEPS,
  ]);
};
