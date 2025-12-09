import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { useTemplateGeneration } from '@/hooks/useTemplateGeneration';
import { ServiceProvider } from '@/context/ServiceContext';
import type { OrderFormData } from '@/schemas/orderSchema';

describe('useTemplateGeneration', () => {
  // Mock services for ServiceProvider
  const mockFirestoreService = {
    saveProductHistory: vi.fn(),
    getProductHistories: vi.fn(),
    updateProductHistoryPinned: vi.fn(),
    deleteProductHistory: vi.fn(),
    saveAllocationBatch: vi.fn(),
    getAllocationBatches: vi.fn(),
    getAllocationBatchesByDateRange: vi.fn(),
    getAllocationDetails: vi.fn(),
    deleteAllocationBatch: vi.fn(),
    saveOrder: vi.fn(),
    findOrdersByUserId: vi.fn(),
    findOrdersByUserIdPaginated: vi.fn(),
    findOrdersByDate: vi.fn(),
    findOrdersByDateRange: vi.fn(),
    getOrderById: vi.fn(),
    updateOrder: vi.fn(),
    deleteOrder: vi.fn(),
    updateOrderPinned: vi.fn(),
  };

  const mockTemplateService = {
    generateTemplate: vi.fn(),
  };

  const mockSessionStorageService = {
    saveDraft: vi.fn(),
    loadDraft: vi.fn(),
    clearDraft: vi.fn(),
  };

  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();
  const mockShowLoading = vi.fn();
  const mockHideLoading = vi.fn();
  const mockSetHasUnsavedChanges = vi.fn();

  const mockUser = {
    uid: 'test-user-123',
    displayName: 'Test User',
    email: 'test@example.com',
  };

  const mockFormData: OrderFormData = {
    deliveryDate: new Date('2024-01-15'),
    suppliers: ['supplier1'],
    products: [{
      name: 'Product A',
      origin: '産地A',
      specification: '規格A',
      specificationUnit: 'kg',
      quantityPerPackage: 10,
      packageUnit: '個',
      storeCost: 100,
      priceExcludingTax: 150,
      totalDelivery: 360,
      supplier: 'supplier1',
      storeAllocations: new Array(36).fill(10),
    }] as any,
  };

  const mockTemplateResponse = {
    filename: '配分表_TestBook_20240115.xlsx',
    download_url: '/downloads/test.xlsx',
    pdf_filename: '配分表_TestBook_20240115.pdf',
    pdf_download_url: '/downloads/test.pdf',
  } as any;

  const defaultParams = {
    user: mockUser,
    userSettings: { buyerName: 'Custom Buyer' } as any,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showLoading: mockShowLoading,
    hideLoading: mockHideLoading,
  };

  // Wrapper with ServiceProvider
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const services = {
      firestoreService: mockFirestoreService,
      templateService: mockTemplateService,
      sessionStorageService: mockSessionStorageService,
    };
    return (
      <ServiceProvider services={services as any}>
        {children}
      </ServiceProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTemplateService.generateTemplate.mockResolvedValue(mockTemplateResponse);
    // MSW handles fetch requests for /downloads/*.xlsx
  });

  describe('generateTemplate', () => {
    it('テンプレートを生成できる', async () => {
      const { result } = renderHook(() => useTemplateGeneration(defaultParams), { wrapper });

      await act(async () => {
        const success = await result.current.generateTemplate(
          mockFormData,
          'TestBook',
          mockSetHasUnsavedChanges
        );
        expect(success).toBe(true);
      });

      expect(mockShowLoading).toHaveBeenCalled();
      expect(mockTemplateService.generateTemplate).toHaveBeenCalledWith(
        mockFormData,
        'Custom Buyer',
        '配分表_TestBook_20240115'
      );
      expect(mockHideLoading).toHaveBeenCalled();
      expect(mockShowSuccess).toHaveBeenCalledWith('テンプレートを生成しました');
    });

    it('generatedFilesが正しく設定される', async () => {
      const { result } = renderHook(() => useTemplateGeneration(defaultParams), { wrapper });

      await act(async () => {
        await result.current.generateTemplate(mockFormData, 'TestBook', mockSetHasUnsavedChanges);
      });

      expect(result.current.generatedFiles).toEqual({
        filename: '配分表_TestBook_20240115.xlsx',
        downloadUrl: '/downloads/test.xlsx',
        pdfFilename: '配分表_TestBook_20240115.pdf',
        pdfDownloadUrl: '/downloads/test.pdf',
      });
    });

    it('excelBlobが正しく設定される', async () => {
      const { result } = renderHook(() => useTemplateGeneration(defaultParams), { wrapper });

      await act(async () => {
        await result.current.generateTemplate(mockFormData, 'TestBook', mockSetHasUnsavedChanges);
      });

      await waitFor(() => {
        // MSW returns Blob from different realm, check properties instead of instanceof
        expect(result.current.excelBlob).toBeTruthy();
        expect(result.current.excelBlob).toHaveProperty('size');
        expect(result.current.excelBlob).toHaveProperty('type');
      });
    });

    it('下書きがクリアされる', async () => {
      const { result } = renderHook(() => useTemplateGeneration(defaultParams), { wrapper });

      await act(async () => {
        await result.current.generateTemplate(mockFormData, 'TestBook', mockSetHasUnsavedChanges);
      });

      expect(mockSessionStorageService.clearDraft).toHaveBeenCalledWith('test-user-123');
      expect(mockSetHasUnsavedChanges).toHaveBeenCalledWith(false);
    });

    it('空のブック名でも動作する', async () => {
      const { result } = renderHook(() => useTemplateGeneration(defaultParams), { wrapper });

      await act(async () => {
        await result.current.generateTemplate(mockFormData, '', mockSetHasUnsavedChanges);
      });

      expect(mockTemplateService.generateTemplate).toHaveBeenCalledWith(
        mockFormData,
        'Custom Buyer',
        '配分表_20240115' // ブック名なし
      );
    });

    it('バイヤー名の取得: userSettings.buyerName', async () => {
      const { result } = renderHook(() => useTemplateGeneration(defaultParams), { wrapper });

      await act(async () => {
        await result.current.generateTemplate(mockFormData, 'TestBook', mockSetHasUnsavedChanges);
      });

      expect(mockTemplateService.generateTemplate).toHaveBeenCalledWith(
        expect.anything(),
        'Custom Buyer',
        expect.anything()
      );
    });

    it('バイヤー名の取得: user.displayName', async () => {
      const { result } = renderHook(() =>
        useTemplateGeneration({
          ...defaultParams,
          userSettings: null,
        }),
        { wrapper }
      );

      await act(async () => {
        await result.current.generateTemplate(mockFormData, 'TestBook', mockSetHasUnsavedChanges);
      });

      expect(mockTemplateService.generateTemplate).toHaveBeenCalledWith(
        expect.anything(),
        'Test User',
        expect.anything()
      );
    });

    it('バイヤー名の取得: user.email', async () => {
      const { result } = renderHook(() =>
        useTemplateGeneration({
          ...defaultParams,
          user: { uid: 'test', displayName: null, email: 'test@example.com' },
          userSettings: null,
        }),
        { wrapper }
      );

      await act(async () => {
        await result.current.generateTemplate(mockFormData, 'TestBook', mockSetHasUnsavedChanges);
      });

      expect(mockTemplateService.generateTemplate).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        expect.anything()
      );
    });

    it('バイヤー名の取得: デフォルト（匿名）', async () => {
      const { result } = renderHook(() =>
        useTemplateGeneration({
          ...defaultParams,
          user: { uid: 'test', displayName: null, email: null },
          userSettings: null,
        }),
        { wrapper }
      );

      await act(async () => {
        await result.current.generateTemplate(mockFormData, 'TestBook', mockSetHasUnsavedChanges);
      });

      expect(mockTemplateService.generateTemplate).toHaveBeenCalledWith(
        expect.anything(),
        '匿名',
        expect.anything()
      );
    });

    it('エラーハンドリング', async () => {
      vi.mocked(mockTemplateService.generateTemplate).mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useTemplateGeneration(defaultParams), { wrapper });

      await act(async () => {
        const success = await result.current.generateTemplate(
          mockFormData,
          'TestBook',
          mockSetHasUnsavedChanges
        );
        expect(success).toBe(false);
      });

      expect(mockShowError).toHaveBeenCalledWith('API error');
      expect(mockHideLoading).toHaveBeenCalled();
    });

    it('ExcelBlob取得失敗時も処理を続行', async () => {
      // MSW: Blob fetch エラーをモック
      server.use(
        http.get(/\/downloads\/.*\.xlsx/, () => {
          return HttpResponse.error();
        })
      );
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useTemplateGeneration(defaultParams), { wrapper });

      await act(async () => {
        const success = await result.current.generateTemplate(
          mockFormData,
          'TestBook',
          mockSetHasUnsavedChanges
        );
        expect(success).toBe(true); // テンプレート生成は成功
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch Excel blob:', expect.any(Error));
      expect(mockShowSuccess).toHaveBeenCalledWith('テンプレートを生成しました');

      consoleSpy.mockRestore();
    });

    it('userがnullの場合でも下書きクリアをスキップして動作する', async () => {
      const { result } = renderHook(() =>
        useTemplateGeneration({
          ...defaultParams,
          user: null,
          userSettings: null,
        }),
        { wrapper }
      );

      await act(async () => {
        const success = await result.current.generateTemplate(
          mockFormData,
          'TestBook',
          mockSetHasUnsavedChanges
        );
        expect(success).toBe(true);
      });

      expect(mockSessionStorageService.clearDraft).not.toHaveBeenCalled();
      expect(mockSetHasUnsavedChanges).not.toHaveBeenCalled();
    });
  });

  describe('状態管理', () => {
    it('setGeneratedFilesで状態を更新できる', () => {
      const { result } = renderHook(() => useTemplateGeneration(defaultParams), { wrapper });

      act(() => {
        result.current.setGeneratedFiles({
          filename: 'test.xlsx',
          downloadUrl: '/test',
        });
      });

      expect(result.current.generatedFiles).toEqual({
        filename: 'test.xlsx',
        downloadUrl: '/test',
      });
    });

    it('setExcelBlobで状態を更新できる', () => {
      const { result } = renderHook(() => useTemplateGeneration(defaultParams), { wrapper });
      const testBlob = new Blob(['test'], { type: 'application/vnd.ms-excel' });

      act(() => {
        result.current.setExcelBlob(testBlob);
      });

      expect(result.current.excelBlob).toBe(testBlob);
    });
  });
});
