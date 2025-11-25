import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistoryTracking } from '@/hooks/useHistoryTracking';
import { FirestoreService } from '@/services/firebase/firestoreService';
import type { OrderFormData } from '@/schemas/orderSchema';

// Mock FirestoreService
vi.mock('@/services/firebase/firestoreService', () => ({
  FirestoreService: {
    saveProductHistory: vi.fn(),
    savePricingHistory: vi.fn(),
  },
}));

describe('useHistoryTracking', () => {
  const mockSupplierAutocomplete = {
    addToHistory: vi.fn(),
  };
  const mockProductNameAutocomplete = {
    addToHistory: vi.fn(),
  };
  const mockOriginAutocomplete = {
    addToHistory: vi.fn(),
  };

  const mockUser = { uid: 'test-user-123' };

  const mockFormData: OrderFormData = {
    deliveryDate: new Date('2024-01-01'),
    suppliers: ['supplier1', 'supplier2'],
    products: [
      {
        name: 'Product A',
        supplier: 'supplier1',
        origin: 'Origin A',
        specification: 'Spec A',
        quantityPerPackage: 10,
        unit: '個',
        categoryCode: 'CAT001',
        centerCost: 100,
        storeCost: 120,
        priceExcludingTax: 150,
        centerFeeRate: 0.1,
      } as any,
      {
        name: 'Product B',
        supplier: 'supplier2',
        origin: 'Origin B',
        specification: '',
        quantityPerPackage: null,
        unit: '',
        categoryCode: undefined,
        centerCost: null,
        storeCost: null,
        priceExcludingTax: null,
      } as any,
    ],
  };

  const defaultParams = {
    user: mockUser,
    supplierAutocomplete: mockSupplierAutocomplete,
    productNameAutocomplete: mockProductNameAutocomplete,
    originAutocomplete: mockOriginAutocomplete,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Firestore mocks
    vi.mocked(FirestoreService.saveProductHistory).mockResolvedValue('history-id');
    vi.mocked(FirestoreService.savePricingHistory).mockResolvedValue('pricing-id');

    // Autocomplete mocks - resolved状態に復元
    mockSupplierAutocomplete.addToHistory.mockResolvedValue(undefined);
    mockProductNameAutocomplete.addToHistory.mockResolvedValue(undefined);
    mockOriginAutocomplete.addToHistory.mockResolvedValue(undefined);
  });

  describe('saveAllHistories', () => {
    it('すべての履歴を保存できる', async () => {
      const { result } = renderHook(() => useHistoryTracking(defaultParams));

      await act(async () => {
        await result.current.saveAllHistories(mockFormData);
      });

      // 帳合先履歴
      expect(mockSupplierAutocomplete.addToHistory).toHaveBeenCalledWith('supplier1');
      expect(mockSupplierAutocomplete.addToHistory).toHaveBeenCalledWith('supplier2');

      // 商品名履歴
      expect(mockProductNameAutocomplete.addToHistory).toHaveBeenCalledWith('Product A');
      expect(mockProductNameAutocomplete.addToHistory).toHaveBeenCalledWith('Product B');

      // 産地履歴
      expect(mockOriginAutocomplete.addToHistory).toHaveBeenCalledWith('Origin A');
      expect(mockOriginAutocomplete.addToHistory).toHaveBeenCalledWith('Origin B');

      // 商品履歴
      expect(FirestoreService.saveProductHistory).toHaveBeenCalledTimes(2);

      // 価格履歴（Product Aのみ - 価格情報が揃っている）
      expect(FirestoreService.savePricingHistory).toHaveBeenCalledTimes(1);
    });

    it('商品履歴を正しいパラメータで保存', async () => {
      const { result } = renderHook(() => useHistoryTracking(defaultParams));

      await act(async () => {
        await result.current.saveAllHistories(mockFormData);
      });

      expect(FirestoreService.saveProductHistory).toHaveBeenCalledWith(
        'test-user-123',
        'supplier1',
        'Product A',
        'Origin A',
        'Spec A',
        10,
        '個',
        'CAT001'
      );
    });

    it('価格履歴を正しいパラメータで保存', async () => {
      const { result } = renderHook(() => useHistoryTracking(defaultParams));

      await act(async () => {
        await result.current.saveAllHistories(mockFormData);
      });

      expect(FirestoreService.savePricingHistory).toHaveBeenCalledWith(
        'test-user-123',
        'Product A',
        'Spec A',
        10,
        '個',
        100,
        120,
        150,
        0.1
      );
    });

    it('価格情報が不完全な商品は価格履歴を保存しない', async () => {
      const { result } = renderHook(() => useHistoryTracking(defaultParams));

      await act(async () => {
        await result.current.saveAllHistories(mockFormData);
      });

      // Product Bは価格情報が不完全なので保存されない
      expect(FirestoreService.savePricingHistory).toHaveBeenCalledTimes(1);
    });

    it('userがnullの場合は何もしない', async () => {
      const { result } = renderHook(() =>
        useHistoryTracking({
          ...defaultParams,
          user: null,
        })
      );

      await act(async () => {
        await result.current.saveAllHistories(mockFormData);
      });

      expect(mockSupplierAutocomplete.addToHistory).not.toHaveBeenCalled();
      expect(FirestoreService.saveProductHistory).not.toHaveBeenCalled();
      expect(FirestoreService.savePricingHistory).not.toHaveBeenCalled();
    });

    it('エラーが発生してもログ出力のみで続行', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupplierAutocomplete.addToHistory.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useHistoryTracking(defaultParams));

      await act(async () => {
        await result.current.saveAllHistories(mockFormData);
      });

      expect(consoleSpy).toHaveBeenCalledWith('履歴保存エラー:', expect.any(Error));

      // モックを元の状態に復元
      mockSupplierAutocomplete.addToHistory.mockResolvedValue(undefined);
      consoleSpy.mockRestore();
    });

    it('空の帳合先リストでも動作する', async () => {
      const dataWithNoSuppliers: OrderFormData = {
        ...mockFormData,
        suppliers: [],
      };

      const { result } = renderHook(() => useHistoryTracking(defaultParams));

      await act(async () => {
        await result.current.saveAllHistories(dataWithNoSuppliers);
      });

      expect(mockSupplierAutocomplete.addToHistory).not.toHaveBeenCalled();
      // 商品履歴は保存される
      expect(FirestoreService.saveProductHistory).toHaveBeenCalledTimes(2);
    });

    it('空の商品リストでも動作する', async () => {
      vi.clearAllMocks(); // テスト前に明示的にクリア

      const dataWithNoProducts: OrderFormData = {
        ...mockFormData,
        products: [],
      };

      const { result } = renderHook(() => useHistoryTracking(defaultParams));

      await act(async () => {
        await result.current.saveAllHistories(dataWithNoProducts);
      });

      // 帳合先履歴のみ保存される
      expect(mockSupplierAutocomplete.addToHistory).toHaveBeenCalledTimes(2);
      expect(FirestoreService.saveProductHistory).not.toHaveBeenCalled();
    });

    it('specification が空文字の場合も正しく処理', async () => {
      vi.clearAllMocks(); // テスト前に明示的にクリア

      const { result } = renderHook(() => useHistoryTracking(defaultParams));

      await act(async () => {
        await result.current.saveAllHistories(mockFormData);
      });

      // Product B（specification: ''） - 2番目の呼び出し
      expect(FirestoreService.saveProductHistory).toHaveBeenNthCalledWith(
        2, // 2番目の呼び出し
        'test-user-123',
        'supplier2',
        'Product B',
        'Origin B',
        '', // specification
        null,
        '',
        undefined
      );
    });

    it('複数回呼び出しても動作する', async () => {
      vi.clearAllMocks(); // テスト前に明示的にクリア

      const { result } = renderHook(() => useHistoryTracking(defaultParams));

      await act(async () => {
        await result.current.saveAllHistories(mockFormData);
        await result.current.saveAllHistories(mockFormData);
      });

      // 2回呼ばれる
      expect(mockSupplierAutocomplete.addToHistory).toHaveBeenCalledTimes(4); // 2 suppliers × 2 calls
      expect(FirestoreService.saveProductHistory).toHaveBeenCalledTimes(4); // 2 products × 2 calls
    });
  });
});
