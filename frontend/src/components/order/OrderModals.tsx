import React from 'react';
import { PDFPreviewModal } from '@/components/modals/PDFPreviewModal';
import { DownloadModal } from '@/components/modals/DownloadModal';
import { AllocationPreviewModal } from '@/components/AllocationPreviewModal';
import { EmailSendModal } from '@/components/modals/EmailSendModal';

/**
 * OrderModals
 *
 * 注文フォームで使用される4つのモーダルコンポーネント:
 * 1. PDFPreviewModal - PDFプレビューモーダル
 * 2. DownloadModal - ダウンロードモーダル（iPhone Safari用）
 * 3. AllocationPreviewModal - 配分表プレビューモーダル
 * 4. EmailSendModal - メール送信モーダル
 *
 * @example
 * ```typescript
 * <OrderModals
 *   generatedFiles={generatedFiles}
 *   excelBlob={excelBlob}
 *   userSettings={userSettings}
 *   user={user}
 *   deliveryDate={deliveryDate}
 *   suppliers={suppliers}
 *   products={products}
 *   showPDFPreview={showPDFPreview}
 *   onClosePDFPreview={() => setShowPDFPreview(false)}
 *   showDownloadModal={showDownloadModal}
 *   onCloseDownloadModal={() => setShowDownloadModal(false)}
 *   showPreviewModal={showPreviewModal}
 *   onClosePreviewModal={() => setShowPreviewModal(false)}
 *   showEmailModal={showEmailModal}
 *   onCloseEmailModal={() => setShowEmailModal(false)}
 *   onDownloadExcel={handleDownloadExcel}
 *   onSendEmail={() => setShowEmailModal(true)}
 * />
 * ```
 */

interface GeneratedFiles {
  downloadUrl: string;
  filename: string;
  pdfDownloadUrl?: string;
  pdfFilename?: string;
}

interface UserSettings {
  emailSenderName?: string;
}

interface User {
  displayName?: string | null;
  email?: string | null;
}

interface OrderModalsProps {
  // Generated files
  generatedFiles: GeneratedFiles | null;
  excelBlob: Blob | null;

  // User info
  userSettings: UserSettings | null;
  user: User | null;

  // Form data
  deliveryDate: Date | null;
  suppliers: string[];
  products: any[];

  // PDFPreviewModal
  showPDFPreview: boolean;
  onClosePDFPreview: () => void;

  // DownloadModal
  showDownloadModal: boolean;
  onCloseDownloadModal: () => void;

  // AllocationPreviewModal
  showPreviewModal: boolean;
  onClosePreviewModal: () => void;

  // EmailSendModal
  showEmailModal: boolean;
  onCloseEmailModal: () => void;

  // Actions
  onDownloadExcel: () => void;
  onSendEmail: () => void;
}

export const OrderModals: React.FC<OrderModalsProps> = ({
  generatedFiles,
  excelBlob,
  userSettings,
  user,
  deliveryDate,
  suppliers,
  products,
  showPDFPreview,
  onClosePDFPreview,
  showDownloadModal,
  onCloseDownloadModal,
  showPreviewModal,
  onClosePreviewModal,
  showEmailModal,
  onCloseEmailModal,
  onDownloadExcel,
  onSendEmail,
}) => {
  return (
    <>
      {/* PDFプレビューモーダル */}
      {generatedFiles && generatedFiles.pdfDownloadUrl && (
        <PDFPreviewModal
          open={showPDFPreview}
          onClose={onClosePDFPreview}
          pdfUrl={generatedFiles.pdfDownloadUrl}
          onDownloadExcel={onDownloadExcel}
          onSendEmail={onSendEmail}
        />
      )}

      {/* ダウンロードモーダル（iPhone Safari用） */}
      {generatedFiles && (
        <DownloadModal
          open={showDownloadModal}
          onClose={onCloseDownloadModal}
          downloadUrl={generatedFiles.downloadUrl}
          filename={generatedFiles.filename}
          onSendEmail={onSendEmail}
        />
      )}

      {/* 配分表プレビューモーダル */}
      <AllocationPreviewModal
        open={showPreviewModal}
        onClose={onClosePreviewModal}
        formData={{
          deliveryDate: deliveryDate || new Date(),
          suppliers: suppliers || [],
          products: products || [],
        }}
        pdfFilename={generatedFiles?.pdfFilename}
        onDownloadExcel={onDownloadExcel}
      />

      {/* メール送信モーダル */}
      {generatedFiles && (
        <EmailSendModal
          open={showEmailModal}
          onClose={onCloseEmailModal}
          userName={userSettings?.emailSenderName || user?.displayName || user?.email || undefined}
          attachment={excelBlob || undefined}
          filename={generatedFiles.filename}
        />
      )}
    </>
  );
};
