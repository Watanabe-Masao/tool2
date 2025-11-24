import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormSubmitHandler } from '@/hooks/useFormSubmitHandler';
import type { OrderFormData } from '@/schemas/orderSchema';

describe('useFormSubmitHandler', () => {
  const mockGetValues = vi.fn<[], OrderFormData>();
  const mockSubmitOrder = vi.fn();
  const mockSetBookNameDialog = vi.fn();
  const mockHandleGenerateTemplate = vi.fn();
  const mockSetHasUnsavedChanges = vi.fn();
  const mockSetShowGeneratedPreview = vi.fn();

  const mockFormData: OrderFormData = {
    deliveryDate: new Date('2024-01-01'),
    suppliers: ['supplier1'],
    products: [{ name: 'Product A' }] as any,
  };

  const defaultParams = {
    getValues: mockGetValues,
    submitOrder: mockSubmitOrder,
    setBookNameDialog: mockSetBookNameDialog,
    bookNameDialog: { open: true, bookName: 'テストブック' },
    handleGenerateTemplate: mockHandleGenerateTemplate,
    setHasUnsavedChanges: mockSetHasUnsavedChanges,
    setShowGeneratedPreview: mockSetShowGeneratedPreview,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetValues.mockReturnValue(mockFormData);
  });

  describe('onSubmit', () => {
    it('submitOrderを呼び出す', async () => {
      mockSubmitOrder.mockResolvedValue(true);

      const { result } = renderHook(() => useFormSubmitHandler(defaultParams));

      await act(async () => {
        await result.current.onSubmit(mockFormData);
      });

      expect(mockSubmitOrder).toHaveBeenCalledWith(
        mockFormData,
        expect.any(Function)
      );
    });

    it('submitOrder内でブック名ダイアログを開くコールバックが渡される', async () => {
      mockSubmitOrder.mockImplementation(async (_data, onBookNameDialogOpen) => {
        // コールバックを実行
        onBookNameDialogOpen();
        return true;
      });

      const { result } = renderHook(() => useFormSubmitHandler(defaultParams));

      await act(async () => {
        await result.current.onSubmit(mockFormData);
      });

      expect(mockSetBookNameDialog).toHaveBeenCalledWith({
        open: true,
        bookName: '',
      });
    });
  });

  describe('handleBookNameDialogConfirm', () => {
    it('getValuesを呼び出してフォームデータを取得する', async () => {
      mockHandleGenerateTemplate.mockResolvedValue(true);

      const { result } = renderHook(() => useFormSubmitHandler(defaultParams));

      await act(async () => {
        await result.current.handleBookNameDialogConfirm();
      });

      expect(mockGetValues).toHaveBeenCalled();
    });

    it('ダイアログを閉じる', async () => {
      mockHandleGenerateTemplate.mockResolvedValue(true);

      const { result } = renderHook(() => useFormSubmitHandler(defaultParams));

      await act(async () => {
        await result.current.handleBookNameDialogConfirm();
      });

      expect(mockSetBookNameDialog).toHaveBeenCalledWith({
        open: false,
        bookName: '',
      });
    });

    it('handleGenerateTemplateを呼び出す', async () => {
      mockHandleGenerateTemplate.mockResolvedValue(true);

      const { result } = renderHook(() => useFormSubmitHandler(defaultParams));

      await act(async () => {
        await result.current.handleBookNameDialogConfirm();
      });

      expect(mockHandleGenerateTemplate).toHaveBeenCalledWith(
        mockFormData,
        'テストブック',
        mockSetHasUnsavedChanges
      );
    });

    it('成功時にプレビュー画面を表示する', async () => {
      mockHandleGenerateTemplate.mockResolvedValue(true);

      const { result } = renderHook(() => useFormSubmitHandler(defaultParams));

      await act(async () => {
        await result.current.handleBookNameDialogConfirm();
      });

      expect(mockSetShowGeneratedPreview).toHaveBeenCalledWith(true);
    });

    it('失敗時にプレビュー画面を表示しない', async () => {
      mockHandleGenerateTemplate.mockResolvedValue(false);

      const { result } = renderHook(() => useFormSubmitHandler(defaultParams));

      await act(async () => {
        await result.current.handleBookNameDialogConfirm();
      });

      expect(mockSetShowGeneratedPreview).not.toHaveBeenCalled();
    });

    it('bookNameDialogのbookNameが使用される', async () => {
      mockHandleGenerateTemplate.mockResolvedValue(true);

      const { result } = renderHook(() =>
        useFormSubmitHandler({
          ...defaultParams,
          bookNameDialog: { open: true, bookName: 'カスタム名' },
        })
      );

      await act(async () => {
        await result.current.handleBookNameDialogConfirm();
      });

      expect(mockHandleGenerateTemplate).toHaveBeenCalledWith(
        mockFormData,
        'カスタム名',
        mockSetHasUnsavedChanges
      );
    });

    it('空のbookNameでも呼び出せる', async () => {
      mockHandleGenerateTemplate.mockResolvedValue(true);

      const { result } = renderHook(() =>
        useFormSubmitHandler({
          ...defaultParams,
          bookNameDialog: { open: true, bookName: '' },
        })
      );

      await act(async () => {
        await result.current.handleBookNameDialogConfirm();
      });

      expect(mockHandleGenerateTemplate).toHaveBeenCalledWith(
        mockFormData,
        '',
        mockSetHasUnsavedChanges
      );
    });
  });

  describe('メモ化の確認', () => {
    it('依存配列が変わらなければ関数が再生成されない', () => {
      const { result, rerender } = renderHook(
        (props) => useFormSubmitHandler(props),
        { initialProps: defaultParams }
      );

      const firstOnSubmit = result.current.onSubmit;
      const firstHandleBookNameDialogConfirm = result.current.handleBookNameDialogConfirm;

      rerender(defaultParams);

      expect(result.current.onSubmit).toBe(firstOnSubmit);
      expect(result.current.handleBookNameDialogConfirm).toBe(firstHandleBookNameDialogConfirm);
    });

    it('bookNameDialogが変わると関数が再生成される', () => {
      const { result, rerender } = renderHook(
        (props) => useFormSubmitHandler(props),
        { initialProps: defaultParams }
      );

      const firstHandleBookNameDialogConfirm = result.current.handleBookNameDialogConfirm;

      rerender({
        ...defaultParams,
        bookNameDialog: { open: false, bookName: '' },
      });

      expect(result.current.handleBookNameDialogConfirm).not.toBe(firstHandleBookNameDialogConfirm);
    });
  });
});
