/**
 * OrderFormContext
 *
 * 注文フォームに必要なすべての状態とハンドラーを提供するContext
 *
 * @module context/order-form
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { FormProvider } from 'react-hook-form';
import { useOrderFormProvider } from './useOrderFormProvider';
import type { OrderFormContextValue } from './types';

// 型のエクスポート
export type { OrderFormContextValue } from './types';
export { TOTAL_STEPS } from './types';

/**
 * OrderFormContext
 */
const OrderFormContext = createContext<OrderFormContextValue | null>(null);

/**
 * OrderFormProvider Props
 */
interface OrderFormProviderProps {
  children: ReactNode;
}

/**
 * OrderFormProvider
 *
 * 注文フォームに必要なすべての状態とハンドラーを提供するProvider
 *
 * 統合されるフック:
 * - useAuthContext
 * - useNotification
 * - useNavigationContext
 * - useAutocompleteFields
 * - useDataSync
 * - useUserSettings
 * - useOrderSubmit
 * - useOrderDraftManagement
 * - useSupplierManagement
 * - useOrderHandlers
 * - useStepNavigation
 * - Zustand Store hooks
 *
 * @example
 * ```tsx
 * <OrderFormProvider>
 *   <OrderFormContent />
 * </OrderFormProvider>
 * ```
 */
export const OrderFormProvider: React.FC<OrderFormProviderProps> = ({ children }) => {
  console.log('[DEBUG] OrderFormProvider rendering...');
  const { contextValue, methods } = useOrderFormProvider();
  console.log('[DEBUG] OrderFormProvider - useOrderFormProvider completed');

  return (
    <OrderFormContext.Provider value={contextValue}>
      <FormProvider {...methods}>{children}</FormProvider>
    </OrderFormContext.Provider>
  );
};

/**
 * useOrderFormContext
 *
 * OrderFormContextの値を取得するフック
 *
 * @throws OrderFormProvider外で使用された場合にエラー
 *
 * @example
 * ```tsx
 * const { form, activeStep, onSubmit } = useOrderFormContext();
 * ```
 */
export const useOrderFormContext = (): OrderFormContextValue => {
  const context = useContext(OrderFormContext);
  if (!context) {
    throw new Error('useOrderFormContext must be used within OrderFormProvider');
  }
  return context;
};

// ===== 便利なセレクターフック =====

/**
 * フォーム関連のみを取得
 */
export const useOrderForm = () => {
  const { form, productFields, appendProduct, removeProduct, moveProduct, suppliers, products, deliveryDate } =
    useOrderFormContext();
  return { form, productFields, appendProduct, removeProduct, moveProduct, suppliers, products, deliveryDate };
};

/**
 * ナビゲーション関連のみを取得
 */
export const useOrderNavigation = () => {
  const { activeStep, setActiveStep, activeProductIndex, setActiveProductIndex, handlePrevStep, handleNextStep } =
    useOrderFormContext();
  return { activeStep, setActiveStep, activeProductIndex, setActiveProductIndex, handlePrevStep, handleNextStep };
};

/**
 * 送信関連のみを取得
 */
export const useOrderSubmission = () => {
  const { onSubmit, handleBookNameDialogConfirm, submission } = useOrderFormContext();
  return { onSubmit, handleBookNameDialogConfirm, ...submission };
};

/**
 * オートコンプリート関連のみを取得
 */
export const useOrderAutocomplete = () => {
  const { autocomplete } = useOrderFormContext();
  return autocomplete;
};
