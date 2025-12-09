import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderRepository } from '../OrderRepository';
import type { OrderData } from '@/types';
import { Timestamp } from 'firebase/firestore';

// Firestoreのモック（vi.hoisted()で適切にホイスト）
const {
  mockCollection,
  mockQuery,
  mockWhere,
  mockOrderBy,
  mockLimit,
  mockStartAfter,
  mockGetDocs,
  mockAddDoc,
  mockGetDoc,
  mockUpdateDoc,
  mockDeleteDoc,
  mockDoc,
} = vi.hoisted(() => ({
  mockCollection: vi.fn(),
  mockQuery: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
  mockLimit: vi.fn(),
  mockStartAfter: vi.fn(),
  mockGetDocs: vi.fn(),
  mockAddDoc: vi.fn(),
  mockGetDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockDeleteDoc: vi.fn(),
  mockDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  startAfter: mockStartAfter,
  getDocs: mockGetDocs,
  addDoc: mockAddDoc,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  doc: mockDoc,
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 }),
    fromDate: (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 }),
  },
}));

describe('OrderRepository', () => {
  let repository: OrderRepository;
  let mockDb: any;

  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks();

    mockDb = {} as any;
    repository = new OrderRepository(mockDb);

    // デフォルトのモック設定
    mockCollection.mockReturnValue('mock-collection-ref');
    mockQuery.mockImplementation((...args) => args);
  });

  describe('toFirestoreFormat', () => {
    it('should convert OrderData to Firestore format', () => {
      const orderData: OrderData = {
        id: 'order-123',
        deliveryDate: new Date('2025-01-25'),
        suppliers: ['帳合先A'],
        products: [
          {
            supplier: '帳合先A',
            name: '商品1',
            origin: '産地A',
            specification: '規格A',
            quantityPerPackage: 10,
            specificationUnit: '個',
            storeCost: 100,
            priceExcludingTax: 150,
            totalDelivery: 360,
            storeAllocations: new Array(36).fill(10),
          },
        ],
        buyerName: 'テストバイヤー',
        timestamp: new Date('2025-01-24T10:00:00Z'),
        userId: 'user-123',
      };

      const result = repository.toFirestoreFormat(orderData);

      expect(result).toEqual({
        delivery_date: '2025-01-25',
        suppliers: ['帳合先A'],
        products: [
          {
            supplier: '帳合先A',
            name: '商品1',
            origin: '産地A',
            specification: '規格A',
            quantity_per_package: 10,
            package_unit: '',
            specification_unit: '個',
            store_cost: 100,
            price_excluding_tax: 150,
            total_delivery: 360,
            store_allocations: new Array(36).fill(10),
          },
        ],
        buyer_name: 'テストバイヤー',
        timestamp: expect.any(Object),
        userId: 'user-123',
      });
    });

    it('should handle empty specification and unit', () => {
      const orderData: OrderData = {
        id: 'order-123',
        deliveryDate: new Date('2025-01-25'),
        suppliers: ['帳合先A'],
        products: [
          {
            supplier: '帳合先A',
            name: '商品1',
            origin: '産地A',
            specification: '',
            quantityPerPackage: 10,
            specificationUnit: '',
            storeCost: 100,
            priceExcludingTax: 150,
            totalDelivery: 360,
            storeAllocations: new Array(36).fill(10),
          },
        ],
        buyerName: 'テストバイヤー',
        timestamp: new Date(),
        userId: 'user-123',
      };

      const result = repository.toFirestoreFormat(orderData);

      expect(result.products[0].specification).toBe('');
      expect(result.products[0].specification_unit).toBe('');
    });
  });

  describe('fromFirestoreFormat', () => {
    it('should convert Firestore format to OrderData', () => {
      const firestoreData = {
        delivery_date: '2025-01-25',
        suppliers: ['帳合先A'],
        products: [
          {
            supplier: '帳合先A',
            name: '商品1',
            origin: '産地A',
            specification: '規格A',
            quantity_per_package: 10,
            package_unit: '',
            specification_unit: '個',
            store_cost: 100,
            price_excluding_tax: 150,
            total_delivery: 360,
            store_allocations: new Array(36).fill(10),
          },
        ],
        buyer_name: 'テストバイヤー',
        timestamp: {
          toDate: () => new Date('2025-01-24T10:00:00Z'),
        } as Timestamp,
        userId: 'user-123',
      };

      const result = repository.fromFirestoreFormat(firestoreData, 'order-123');

      expect(result).toEqual({
        id: 'order-123',
        deliveryDate: new Date('2025-01-25'),
        suppliers: ['帳合先A'],
        products: [
          {
            supplier: '帳合先A',
            name: '商品1',
            origin: '産地A',
            specification: '規格A',
            quantityPerPackage: 10,
            packageUnit: '',
            specificationUnit: '個',
            storeCost: 100,
            priceExcludingTax: 150,
            totalDelivery: 360,
            storeAllocations: new Array(36).fill(10),
          },
        ],
        buyerName: 'テストバイヤー',
        timestamp: new Date('2025-01-24T10:00:00Z'),
        userId: 'user-123',
      });
    });

    it('should handle missing optional fields', () => {
      const firestoreData = {
        delivery_date: '2025-01-25',
        suppliers: undefined, // missing
        products: [
          {
            supplier: '', // empty
            name: '商品1',
            origin: '産地A',
            specification: undefined, // missing
            quantity_per_package: 10,
            specification_unit: undefined, // missing
            store_cost: 100,
            price_excluding_tax: 150,
            total_delivery: 360,
            store_allocations: [],
          },
        ],
        buyer_name: 'テストバイヤー',
        timestamp: undefined, // missing
        userId: 'user-123',
      };

      const result = repository.fromFirestoreFormat(firestoreData as any, 'order-123');

      expect(result.suppliers).toEqual([]);
      expect(result.products[0].supplier).toBe('');
      expect(result.products[0].specification).toBe('');
      expect(result.products[0].specificationUnit).toBe('');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('saveOrder', () => {
    it('should save order with userId', async () => {
      mockAddDoc.mockResolvedValue({ id: 'new-order-id' });

      const orderData: OrderData = {
        deliveryDate: new Date('2025-01-25'),
        suppliers: ['帳合先A'],
        products: [],
        buyerName: 'テストバイヤー',
        userId: '', // 空のuserIdは上書きされる
        timestamp: new Date(),
      } as OrderData;

      const orderId = await repository.saveOrder(orderData, 'user-123');

      expect(orderId).toBe('new-order-id');
      expect(mockAddDoc).toHaveBeenCalledWith(
        'mock-collection-ref',
        expect.objectContaining({
          userId: 'user-123',
          delivery_date: '2025-01-25',
        })
      );
    });
  });

  describe('findByUserId', () => {
    it('should find orders by userId', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          data: () => ({
            delivery_date: '2025-01-25',
            suppliers: ['帳合先A'],
            products: [],
            buyer_name: 'バイヤー1',
            timestamp: { toDate: () => new Date() } as Timestamp,
            userId: 'user-123',
          }),
        },
        {
          id: 'order-2',
          data: () => ({
            delivery_date: '2025-01-26',
            suppliers: ['帳合先B'],
            products: [],
            buyer_name: 'バイヤー2',
            timestamp: { toDate: () => new Date() } as Timestamp,
            userId: 'user-123',
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockOrders.forEach(callback),
      });

      const results = await repository.findByUserId('user-123');

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('order-1');
      expect(results[1].id).toBe('order-2');
    });

    it('should apply limit when provided', async () => {
      mockGetDocs.mockResolvedValue({
        forEach: () => {},
      });

      await repository.findByUserId('user-123', 10);

      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });

  describe('findByUserIdPaginated', () => {
    it('should return paginated results', async () => {
      const mockOrders = Array.from({ length: 21 }, (_, i) => ({
        id: `order-${i}`,
        data: () => ({
          delivery_date: '2025-01-25',
          suppliers: ['帳合先A'],
          products: [],
          buyer_name: `バイヤー${i}`,
          timestamp: { toDate: () => new Date() } as Timestamp,
          userId: 'user-123',
        }),
      }));

      mockGetDocs.mockResolvedValue({
        docs: mockOrders,
      });

      const result = await repository.findByUserIdPaginated('user-123', { limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.lastDoc).toBeDefined();
    });

    it('should indicate no more pages when at end', async () => {
      const mockOrders = Array.from({ length: 15 }, (_, i) => ({
        id: `order-${i}`,
        data: () => ({
          delivery_date: '2025-01-25',
          suppliers: ['帳合先A'],
          products: [],
          buyer_name: `バイヤー${i}`,
          timestamp: { toDate: () => new Date() } as Timestamp,
          userId: 'user-123',
        }),
      }));

      mockGetDocs.mockResolvedValue({
        docs: mockOrders,
      });

      const result = await repository.findByUserIdPaginated('user-123', { limit: 20 });

      expect(result.items).toHaveLength(15);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('findByDate', () => {
    it('should find orders by date', async () => {
      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => {
          callback({
            id: 'order-1',
            data: () => ({
              delivery_date: '2025-01-25',
              suppliers: ['帳合先A'],
              products: [],
              buyer_name: 'バイヤー1',
              timestamp: { toDate: () => new Date() } as Timestamp,
              userId: 'user-123',
            }),
          });
        },
      });

      const results = await repository.findByDate('user-123', '2025-01-25');

      expect(results).toHaveLength(1);
      expect(results[0].deliveryDate).toEqual(new Date('2025-01-25'));
    });
  });

  describe('findByDateRange', () => {
    it('should find orders within date range', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          data: () => ({
            delivery_date: '2025-01-20',
            suppliers: ['帳合先A'],
            products: [],
            buyer_name: 'バイヤー1',
            timestamp: { toDate: () => new Date() } as Timestamp,
            userId: 'user-123',
          }),
        },
        {
          id: 'order-2',
          data: () => ({
            delivery_date: '2025-01-25',
            suppliers: ['帳合先A'],
            products: [],
            buyer_name: 'バイヤー2',
            timestamp: { toDate: () => new Date() } as Timestamp,
            userId: 'user-123',
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockOrders.forEach(callback),
      });

      const results = await repository.findByDateRange('user-123', '2025-01-15', '2025-01-30');

      expect(results).toHaveLength(2);
    });
  });
});
