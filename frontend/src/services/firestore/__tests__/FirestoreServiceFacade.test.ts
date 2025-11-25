import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FirestoreServiceFacade } from '../FirestoreServiceFacade';
import type { OrderData } from '@/types';

// Repositoryのモック
vi.mock('../repositories/OrderRepository');
vi.mock('../repositories/ProductHistoryRepository');
vi.mock('../repositories/PricingHistoryRepository');
vi.mock('../repositories/AutocompleteRepository');
vi.mock('../repositories/PresetRepository');
vi.mock('../repositories/EmailAddressRepository');

describe('FirestoreServiceFacade', () => {
  let facade: FirestoreServiceFacade;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as any;
    facade = new FirestoreServiceFacade(mockDb);
  });

  describe('Constructor', () => {
    it('should initialize all repositories', () => {
      expect(facade).toBeDefined();
      expect(facade).toBeInstanceOf(FirestoreServiceFacade);
    });
  });

  describe('Order Methods', () => {
    it('should delegate saveOrder to OrderRepository', async () => {
      const mockOrderData: OrderData = {
        deliveryDate: new Date('2025-01-25'),
        suppliers: ['帳合先A'],
        products: [],
        buyerName: 'テストバイヤー',
        userId: 'user-123',
        timestamp: new Date(),
      } as OrderData;

      const saveOrderSpy = vi.spyOn(facade['orderRepo'], 'saveOrder');
      saveOrderSpy.mockResolvedValue('order-123');

      const result = await facade.saveOrder(mockOrderData, 'user-123');

      expect(result).toBe('order-123');
      expect(saveOrderSpy).toHaveBeenCalledWith(mockOrderData, 'user-123');
    });

    it('should delegate getUserOrders to OrderRepository', async () => {
      const findByUserIdSpy = vi.spyOn(facade['orderRepo'], 'findByUserId');
      findByUserIdSpy.mockResolvedValue([]);

      const result = await facade.getUserOrders('user-123', 10);

      expect(result).toEqual([]);
      expect(findByUserIdSpy).toHaveBeenCalledWith('user-123', 10);
    });

    it('should delegate deleteOrder to OrderRepository', async () => {
      const deleteSpy = vi.spyOn(facade['orderRepo'], 'delete');
      deleteSpy.mockResolvedValue();

      await facade.deleteOrder('order-123');

      expect(deleteSpy).toHaveBeenCalledWith('order-123');
    });
  });

  describe('Autocomplete Methods', () => {
    it('should delegate saveAutocompleteHistory to AutocompleteRepository', async () => {
      const saveValueSpy = vi.spyOn(facade['autocompleteRepo'], 'saveValue');
      saveValueSpy.mockResolvedValue('history-123');

      await facade.saveAutocompleteHistory('user-123', 'productName', 'トマト');

      expect(saveValueSpy).toHaveBeenCalledWith('user-123', 'productName', 'トマト');
    });

    it('should delegate getAutocompleteHistory to AutocompleteRepository', async () => {
      const findByFieldSpy = vi.spyOn(facade['autocompleteRepo'], 'findByField');
      findByFieldSpy.mockResolvedValue({
        id: 'history-1',
        userId: 'user-123',
        field: 'productName',
        values: ['トマト', 'きゅうり'],
      });

      const result = await facade.getAutocompleteHistory('user-123', 'productName');

      expect(result).toEqual(['トマト', 'きゅうり']);
      expect(findByFieldSpy).toHaveBeenCalledWith('user-123', 'productName');
    });

    it('should return empty array when no history exists', async () => {
      const findByFieldSpy = vi.spyOn(facade['autocompleteRepo'], 'findByField');
      findByFieldSpy.mockResolvedValue(null);

      const result = await facade.getAutocompleteHistory('user-123', 'productName');

      expect(result).toEqual([]);
    });
  });

  describe('Preset Methods', () => {
    it('should delegate saveSupplierPreset to PresetRepository', async () => {
      const saveSpy = vi.spyOn(facade['presetRepo'], 'save');
      saveSpy.mockResolvedValue('preset-123');

      const result = await facade.saveSupplierPreset('user-123', '帳合先A');

      expect(result).toBe('preset-123');
      expect(saveSpy).toHaveBeenCalledWith({
        userId: 'user-123',
        supplier: '帳合先A',
      });
    });

    it('should delegate getSupplierPresets to PresetRepository', async () => {
      const findByUserIdSpy = vi.spyOn(facade['presetRepo'], 'findByUserId');
      findByUserIdSpy.mockResolvedValue([
        {
          id: 'preset-1',
          supplier: '帳合先A',
          displayOrder: 0,
          createdAt: new Date('2025-01-24'),
          updatedAt: new Date('2025-01-24'),
        },
      ]);

      const result = await facade.getSupplierPresets('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].supplier).toBe('帳合先A');
      expect(findByUserIdSpy).toHaveBeenCalledWith('user-123');
    });

    it('should delegate deleteSupplierPreset to PresetRepository', async () => {
      const deleteSpy = vi.spyOn(facade['presetRepo'], 'delete');
      deleteSpy.mockResolvedValue();

      await facade.deleteSupplierPreset('preset-123');

      expect(deleteSpy).toHaveBeenCalledWith('preset-123');
    });

    it('should delegate reorderSupplierPresets to PresetRepository', async () => {
      const reorderSpy = vi.spyOn(facade['presetRepo'], 'reorder');
      reorderSpy.mockResolvedValue();

      const items = [
        { id: 'preset-1', displayOrder: 0 },
        { id: 'preset-2', displayOrder: 1 },
      ];

      await facade.reorderSupplierPresets(items);

      expect(reorderSpy).toHaveBeenCalledWith(items);
    });
  });

  describe('Email Address Methods', () => {
    it('should delegate saveEmailAddress to EmailAddressRepository', async () => {
      const saveSpy = vi.spyOn(facade['emailRepo'], 'save');
      saveSpy.mockResolvedValue('address-123');

      const result = await facade.saveEmailAddress('user-123', '田中太郎', 'tanaka@example.com');

      expect(result).toBe('address-123');
      expect(saveSpy).toHaveBeenCalledWith({
        userId: 'user-123',
        name: '田中太郎',
        email: 'tanaka@example.com',
      });
    });

    it('should delegate getEmailAddresses to EmailAddressRepository', async () => {
      const findByUserIdSpy = vi.spyOn(facade['emailRepo'], 'findByUserId');
      findByUserIdSpy.mockResolvedValue([
        {
          id: 'address-1',
          name: '田中太郎',
          email: 'tanaka@example.com',
          displayOrder: 0,
          createdAt: new Date('2025-01-24'),
          updatedAt: new Date('2025-01-24'),
        },
      ]);

      const result = await facade.getEmailAddresses('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('田中太郎');
      expect(findByUserIdSpy).toHaveBeenCalledWith('user-123');
    });
  });

  describe('Product History Methods', () => {
    it('should delegate saveProductHistory to ProductHistoryRepository', async () => {
      const saveOrUpdateSpy = vi.spyOn(facade['productHistoryRepo'], 'saveOrUpdate');
      saveOrUpdateSpy.mockResolvedValue('history-123');

      const result = await facade.saveProductHistory(
        'user-123',
        '帳合先A',
        'トマト',
        '青森',
        'L',
        10,
        '個'
      );

      expect(result).toBe('history-123');
      expect(saveOrUpdateSpy).toHaveBeenCalledWith({
        userId: 'user-123',
        supplier: '帳合先A',
        name: 'トマト',
        origin: '青森',
        specification: 'L',
        quantityPerPackage: 10,
        unit: '個',
        categoryCode: undefined,
        pinned: false,
        pinOrder: 9999,
        usageCount: 1,
      });
    });

    it('should delegate getProductHistory to ProductHistoryRepository with supplier filter', async () => {
      const findBySupplierSpy = vi.spyOn(facade['productHistoryRepo'], 'findBySupplier');
      findBySupplierSpy.mockResolvedValue([
        {
          id: 'history-1',
          userId: 'user-123',
          supplier: '帳合先A',
          name: 'トマト',
          origin: '青森',
          specification: 'L',
          quantityPerPackage: 10,
          unit: '個',
          usageCount: 1,
          pinned: false,
          pinOrder: 9999,
        },
      ]);

      const result = await facade.getProductHistory('user-123', '帳合先A');

      expect(result).toHaveLength(1);
      expect(findBySupplierSpy).toHaveBeenCalledWith('user-123', '帳合先A');
    });

    it('should delegate getProductHistory to ProductHistoryRepository without supplier filter', async () => {
      const findByUserIdSpy = vi.spyOn(facade['productHistoryRepo'], 'findByUserId');
      findByUserIdSpy.mockResolvedValue([]);

      const result = await facade.getProductHistory('user-123');

      expect(result).toEqual([]);
      expect(findByUserIdSpy).toHaveBeenCalledWith('user-123');
    });

    it('should delegate toggleProductHistoryPinned to ProductHistoryRepository', async () => {
      const togglePinnedSpy = vi.spyOn(facade['productHistoryRepo'], 'togglePinned');
      togglePinnedSpy.mockResolvedValue();

      await facade.toggleProductHistoryPinned('history-123', true, 'user-123', '帳合先A');

      expect(togglePinnedSpy).toHaveBeenCalledWith('history-123', true, 'user-123', '帳合先A');
    });
  });

  describe('Pricing History Methods', () => {
    it('should delegate getPricingHistory to PricingHistoryRepository', async () => {
      const findByUserIdSpy = vi.spyOn(facade['pricingHistoryRepo'], 'findByUserId');
      findByUserIdSpy.mockResolvedValue([
        {
          id: 'pricing-1',
          userId: 'user-123',
          productName: 'トマト',
          specification: 'L',
          quantityPerPackage: 10,
          unit: '個',
          centerCost: 90,
          storeCost: 100,
          priceExcludingTax: 150,
          centerFeeRate: 13,
          usageCount: 1,
          createdAt: new Date('2025-01-24'),
          lastUsedAt: new Date('2025-01-24'),
        },
      ]);

      const result = await facade.getPricingHistory('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].productName).toBe('トマト');
      expect(findByUserIdSpy).toHaveBeenCalledWith('user-123');
    });

    it('should delegate savePricingHistory to PricingHistoryRepository', async () => {
      const saveOrUpdateSpy = vi.spyOn(facade['pricingHistoryRepo'], 'saveOrUpdate');
      saveOrUpdateSpy.mockResolvedValue('pricing-123');

      await facade.savePricingHistory('user-123', 'トマト', 'L', 10, '個', 90, 100, 150, 13);

      expect(saveOrUpdateSpy).toHaveBeenCalledWith({
        userId: 'user-123',
        productName: 'トマト',
        specification: 'L',
        quantityPerPackage: 10,
        unit: '個',
        centerCost: 90,
        storeCost: 100,
        priceExcludingTax: 150,
        centerFeeRate: 13,
        usageCount: 1,
      });
    });

    it('should use default centerFeeRate when not provided', async () => {
      const saveOrUpdateSpy = vi.spyOn(facade['pricingHistoryRepo'], 'saveOrUpdate');
      saveOrUpdateSpy.mockResolvedValue('pricing-123');

      await facade.savePricingHistory('user-123', 'トマト', 'L', 10, '個', 90, 100, 150);

      expect(saveOrUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          centerFeeRate: 13,
        })
      );
    });
  });
});
