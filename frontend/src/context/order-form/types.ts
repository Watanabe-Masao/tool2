/**
 * OrderFormContext 型定義
 */

import type { Dispatch, SetStateAction } from 'react';
import type { UseFormReturn, FieldArrayWithId, UseFieldArrayReturn } from 'react-hook-form';
import type { OrderFormData } from '@/schemas/orderSchema';
import type { BookNameDialog } from '@/stores/orderFormStore';
import type { UserSettings } from '@/types/userSettings';
import type { GeneratedFiles } from '@/types/hooks';
import type { UseAutocompleteFieldsReturn } from '@/hooks/useAutocompleteFields';

/**
 * フォームのステップ数
 */
export const TOTAL_STEPS = 5;

/**
 * 帳合先削除ダイアログの状態
 */
export interface SupplierRemovalDialogState {
  open: boolean;
  suppliersToRemove: string[];
  affectedProductsCount: number;
  newSuppliers: string[];
}

/**
 * ユーザー情報の型
 */
export interface OrderFormUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
}

/**
 * モーダル状態の型
 */
export interface ModalStates {
  showPDFPreview: boolean;
  setShowPDFPreview: (show: boolean) => void;
  showDownloadModal: boolean;
  setShowDownloadModal: (show: boolean) => void;
  showPreviewModal: boolean;
  setShowPreviewModal: (show: boolean) => void;
  showEmailModal: boolean;
  setShowEmailModal: (show: boolean) => void;
  showGeneratedPreview: boolean;
  setShowGeneratedPreview: (show: boolean) => void;
  bookNameDialog: BookNameDialog;
  setBookNameDialog: (state: BookNameDialog) => void;
}

/**
 * 下書き管理の型
 */
export interface DraftManagement {
  restoreDialogOpen: boolean;
  handleRestoreDraft: () => void;
  handleDiscardDraft: () => void;
}

/**
 * 帳合先管理の型
 */
export interface SupplierManagement {
  supplierRemovalDialog: SupplierRemovalDialogState;
  handleSuppliersChange: (newSuppliers: string[]) => string[];
  handleConfirmSupplierRemoval: () => void;
  handleCancelSupplierRemoval: () => void;
}

/**
 * 送信・生成の型
 */
export interface SubmissionState {
  generatedFiles: GeneratedFiles | null;
  setGeneratedFiles: Dispatch<SetStateAction<GeneratedFiles | null>>;
  excelBlob: Blob | null;
  setExcelBlob: Dispatch<SetStateAction<Blob | null>>;
  handleDownloadExcel: () => Promise<void>;
  handleDownloadPdf: () => Promise<void>;
}

/**
 * OrderFormContext で提供される値の型
 */
export interface OrderFormContextValue {
  // ===== 認証・ユーザー =====
  user: OrderFormUser | null;
  userSettings: UserSettings | null;
  isOnline: boolean;

  // ===== フォーム (React Hook Form) =====
  form: UseFormReturn<OrderFormData>;
  productFields: FieldArrayWithId<OrderFormData, 'products', 'id'>[];
  appendProduct: UseFieldArrayReturn<OrderFormData, 'products'>['append'];
  removeProduct: UseFieldArrayReturn<OrderFormData, 'products'>['remove'];
  moveProduct: UseFieldArrayReturn<OrderFormData, 'products'>['move'];

  // ===== 監視データ =====
  suppliers: string[] | undefined;
  products: OrderFormData['products'] | undefined;
  deliveryDate: Date | null | undefined;

  // ===== ナビゲーション =====
  activeStep: number;
  setActiveStep: (step: number) => void;
  activeProductIndex: number;
  setActiveProductIndex: (index: number) => void;
  handlePrevStep: () => void;
  handleNextStep: () => void;

  // ===== モーダル状態 =====
  modalStates: ModalStates;

  // ===== 商品操作 =====
  handleRemoveProduct: (index: number) => void;
  handleClearProduct: (index: number) => void;

  // ===== 配分操作 =====
  handleAllocationChange: (productIndex: number, storeIndex: number, value: number) => void;

  // ===== フォーム送信 =====
  onSubmit: (data: OrderFormData) => Promise<void>;
  handleBookNameDialogConfirm: () => Promise<void>;

  // ===== 下書き管理 =====
  draft: DraftManagement;

  // ===== 帳合先管理 =====
  supplierManagement: SupplierManagement;

  // ===== 送信・生成 =====
  submission: SubmissionState;

  // ===== オートコンプリート =====
  autocomplete: UseAutocompleteFieldsReturn;

  // ===== レイアウト =====
  setProgressSummaryHeight: (height: number) => void;
  showProgressSummary: boolean;
}
