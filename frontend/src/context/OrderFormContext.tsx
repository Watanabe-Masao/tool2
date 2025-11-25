/**
 * OrderFormContext
 *
 * @deprecated このファイルは後方互換性のために残されています。
 * 新しいインポートは `@/context/order-form` を使用してください。
 *
 * @module context/OrderFormContext
 */

// 新しいモジュールから再エクスポート
export {
  OrderFormProvider,
  useOrderFormContext,
  useOrderForm,
  useOrderNavigation,
  useOrderSubmission,
  useOrderAutocomplete,
  TOTAL_STEPS,
} from './order-form';

// 型のエクスポート
export type {
  OrderFormContextValue,
  SupplierRemovalDialogState,
  OrderFormUser,
  ModalStates,
  DraftManagement,
  SupplierManagement,
  SubmissionState,
} from './order-form';
