import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderDataSubmit } from '@/hooks/useOrderDataSubmit';
import type { OrderFormData } from '@/schemas/orderSchema';

describe('useOrderDataSubmit', () => {
  const mockSaveOrderWithSync = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();
  const mockShowLoading = vi.fn();
  const mockHideLoading = vi.fn();

  const mockUser = {
    uid: 'test-user-123',
    displayName: 'Test User',
    email: 'test@example.com',
  };

  const mockFormData: OrderFormData = {
    deliveryDate: new Date('2024-01-01'),
    suppliers: ['supplier1', 'supplier2'],
    products: [
      { name: 'Product A', supplier: 'supplier1' } as any,
      { name: 'Product B', supplier: 'supplier2' } as any,
    ],
  };

  const defaultParams = {
    user: mockUser,
    userSettings: { buyerName: 'Custom Buyer' } as any,
    isOnline: true,
    saveOrderWithSync: mockSaveOrderWithSync,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showLoading: mockShowLoading,
    hideLoading: mockHideLoading,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveOrderWithSync.mockResolvedValue(undefined);
  });

  describe('submitOrderData', () => {
    it('オンライン時にデータ送信できる', async () => {
      const mockOnBookNameDialogOpen = vi.fn();
      const { result } = renderHook(() => useOrderDataSubmit(defaultParams));

      await act(async () => {
        const success = await result.current.submitOrderData(mockFormData, mockOnBookNameDialogOpen);
        expect(success).toBe(false); // ダイアログ確認待ち
      });

      expect(mockShowLoading).toHaveBeenCalled();
      expect(mockSaveOrderWithSync).toHaveBeenCalledWith(mockFormData, 'Custom Buyer');
      expect(mockHideLoading).toHaveBeenCalled();
      expect(mockOnBookNameDialogOpen).toHaveBeenCalled();
    });

    it('オフライン時にデータ送信できる', async () => {
      const mockOnBookNameDialogOpen = vi.fn();
      const { result } = renderHook(() =>
        useOrderDataSubmit({
          ...defaultParams,
          isOnline: false,
        })
      );

      await act(async () => {
        const success = await result.current.submitOrderData(mockFormData, mockOnBookNameDialogOpen);
        expect(success).toBe(true);
      });

      expect(mockShowLoading).toHaveBeenCalled();
      expect(mockSaveOrderWithSync).toHaveBeenCalledWith(mockFormData, 'Custom Buyer');
      expect(mockShowSuccess).toHaveBeenCalledWith('オフラインのため配分表を保存しました');
      expect(mockHideLoading).toHaveBeenCalled();
      expect(mockOnBookNameDialogOpen).not.toHaveBeenCalled();
    });

    it('バリデーションエラー: 無効な帳合先', async () => {
      const mockOnBookNameDialogOpen = vi.fn();
      const invalidData: OrderFormData = {
        ...mockFormData,
        products: [
          { name: 'Product A', supplier: 'supplier1' } as any,
          { name: 'Product B', supplier: 'invalid-supplier' } as any, // 無効な帳合先
        ],
      };

      const { result } = renderHook(() => useOrderDataSubmit(defaultParams));

      await act(async () => {
        const success = await result.current.submitOrderData(invalidData, mockOnBookNameDialogOpen);
        expect(success).toBe(false);
      });

      expect(mockShowError).toHaveBeenCalledWith('入力内容に誤りがあります');
      expect(mockSaveOrderWithSync).not.toHaveBeenCalled();
    });

    it('バリデーションエラー（オフライン時）でもローディングを正しく制御', async () => {
      const mockOnBookNameDialogOpen = vi.fn();
      const invalidData: OrderFormData = {
        ...mockFormData,
        products: [{ name: 'Product A', supplier: 'invalid' } as any],
      };

      const { result } = renderHook(() =>
        useOrderDataSubmit({
          ...defaultParams,
          isOnline: false,
        })
      );

      await act(async () => {
        await result.current.submitOrderData(invalidData, mockOnBookNameDialogOpen);
      });

      expect(mockShowLoading).toHaveBeenCalled();
      expect(mockHideLoading).toHaveBeenCalled();
    });

    it('バイヤー名の取得: UserSettings.buyerName', async () => {
      const mockOnBookNameDialogOpen = vi.fn();
      const { result } = renderHook(() =>
        useOrderDataSubmit({
          ...defaultParams,
          userSettings: { buyerName: 'Custom Buyer Name' } as any,
        })
      );

      await act(async () => {
        await result.current.submitOrderData(mockFormData, mockOnBookNameDialogOpen);
      });

      expect(mockSaveOrderWithSync).toHaveBeenCalledWith(mockFormData, 'Custom Buyer Name');
    });

    it('バイヤー名の取得: user.displayName（UserSettingsがない場合）', async () => {
      const mockOnBookNameDialogOpen = vi.fn();
      const { result } = renderHook(() =>
        useOrderDataSubmit({
          ...defaultParams,
          userSettings: null,
        })
      );

      await act(async () => {
        await result.current.submitOrderData(mockFormData, mockOnBookNameDialogOpen);
      });

      expect(mockSaveOrderWithSync).toHaveBeenCalledWith(mockFormData, 'Test User');
    });

    it('バイヤー名の取得: user.email（displayNameがない場合）', async () => {
      const mockOnBookNameDialogOpen = vi.fn();
      const { result } = renderHook(() =>
        useOrderDataSubmit({
          ...defaultParams,
          user: { uid: 'test', displayName: null, email: 'test@example.com' },
          userSettings: null,
        })
      );

      await act(async () => {
        await result.current.submitOrderData(mockFormData, mockOnBookNameDialogOpen);
      });

      expect(mockSaveOrderWithSync).toHaveBeenCalledWith(mockFormData, 'test@example.com');
    });

    it('バイヤー名の取得: デフォルト（匿名）', async () => {
      const mockOnBookNameDialogOpen = vi.fn();
      const { result } = renderHook(() =>
        useOrderDataSubmit({
          ...defaultParams,
          user: { uid: 'test', displayName: null, email: null },
          userSettings: null,
        })
      );

      await act(async () => {
        await result.current.submitOrderData(mockFormData, mockOnBookNameDialogOpen);
      });

      expect(mockSaveOrderWithSync).toHaveBeenCalledWith(mockFormData, '匿名');
    });

    it('エラーハンドリング', async () => {
      const mockOnBookNameDialogOpen = vi.fn();
      mockSaveOrderWithSync.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOrderDataSubmit(defaultParams));

      await act(async () => {
        const success = await result.current.submitOrderData(mockFormData, mockOnBookNameDialogOpen);
        expect(success).toBe(false);
      });

      expect(mockShowError).toHaveBeenCalledWith('Network error');
      expect(mockHideLoading).toHaveBeenCalled();
    });

    it('エラーハンドリング（非Errorオブジェクト）', async () => {
      const mockOnBookNameDialogOpen = vi.fn();
      mockSaveOrderWithSync.mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useOrderDataSubmit(defaultParams));

      await act(async () => {
        const success = await result.current.submitOrderData(mockFormData, mockOnBookNameDialogOpen);
        expect(success).toBe(false);
      });

      expect(mockShowError).toHaveBeenCalledWith('テンプレートの生成に失敗しました');
    });

    it('console.logが呼ばれることを確認', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockOnBookNameDialogOpen = vi.fn();
      const { result } = renderHook(() => useOrderDataSubmit(defaultParams));

      await act(async () => {
        await result.current.submitOrderData(mockFormData, mockOnBookNameDialogOpen);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Form data:', mockFormData);
      consoleSpy.mockRestore();
    });
  });
});
