import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductHistoryRepository, type ProductHistory } from '../ProductHistoryRepository';
import { Timestamp } from 'firebase/firestore';

// Firestoreのモック（vi.hoisted()で適切にホイスト）
const {
  mockCollection,
  mockQuery,
  mockWhere,
  mockOrderBy,
  mockGetDocs,
  mockAddDoc,
  mockUpdateDoc,
  mockDeleteDoc,
  mockDoc,
  mockIncrement,
} = vi.hoisted(() => ({
  mockCollection: vi.fn(),
  mockQuery: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
  mockGetDocs: vi.fn(),
  mockAddDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockDeleteDoc: vi.fn(),
  mockDoc: vi.fn(),
  mockIncrement: vi.fn((value: number) => ({ _increment: value })),
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  getDocs: mockGetDocs,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  doc: mockDoc,
  increment: mockIncrement,
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 }),
    fromDate: (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 }),
  },
}));

describe('ProductHistoryRepository', () => {
  let repository: ProductHistoryRepository;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as any;
    repository = new ProductHistoryRepository(mockDb);

    mockCollection.mockReturnValue('mock-collection-ref');
    mockQuery.mockImplementation((...args) => args);
  });

  const createMockHistory = (overrides?: Partial<ProductHistory>): ProductHistory => ({
    userId: 'user-123',
    supplier: '帳合先A',
    name: '商品1',
    origin: '産地A',
    specification: '規格A',
    quantityPerPackage: 10,
    specificationUnit: '個',
    packageUnit: '',
    usageCount: 1,
    pinned: false,
    pinOrder: 9999,
    ...overrides,
  });

  describe('toFirestoreFormat', () => {
    it('should convert ProductHistory to Firestore format', () => {
      const history = createMockHistory({
        categoryCode: 'CAT001',
        createdAt: new Date('2025-01-24T10:00:00Z'),
        updatedAt: new Date('2025-01-24T11:00:00Z'),
      });

      const result = repository.toFirestoreFormat(history);

      expect(result).toEqual({
        userId: 'user-123',
        supplier: '帳合先A',
        categoryCode: 'CAT001',
        name: '商品1',
        origin: '産地A',
        specification: '規格A',
        quantityPerPackage: 10,
        specificationUnit: '個',
        packageUnit: '',
        usageCount: 1,
        pinned: false,
        pinOrder: 9999,
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object),
      });
    });

    it('should preserve unit and packageUnit when saving', () => {
      const history = createMockHistory({
        specificationUnit: '100gあたり',
        packageUnit: 'kg',
      });

      const result = repository.toFirestoreFormat(history);

      expect(result.specificationUnit).toBe('100gあたり');
      expect(result.packageUnit).toBe('kg');
    });

    it('should handle optional fields', () => {
      const history = createMockHistory({
        categoryCode: undefined,
        quantityPerPackage: null,
      });

      const result = repository.toFirestoreFormat(history);

      expect(result.categoryCode).toBeUndefined();
      expect(result.quantityPerPackage).toBeNull();
    });

    it('should use default values for missing timestamps', () => {
      const history = createMockHistory();
      delete history.createdAt;
      delete history.updatedAt;

      const result = repository.toFirestoreFormat(history);

      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('fromFirestoreFormat', () => {
    it('should convert Firestore format to ProductHistory', () => {
      const firestoreData = {
        userId: 'user-123',
        supplier: '帳合先A',
        categoryCode: 'CAT001',
        name: '商品1',
        origin: '産地A',
        specification: '規格A',
        quantityPerPackage: 10,
        specificationUnit: '個',
        packageUnit: 'パック',
        usageCount: 5,
        pinned: true,
        pinOrder: 1,
        createdAt: {
          toDate: () => new Date('2025-01-24T10:00:00Z'),
        } as Timestamp,
        updatedAt: {
          toDate: () => new Date('2025-01-24T11:00:00Z'),
        } as Timestamp,
      };

      const result = repository.fromFirestoreFormat(firestoreData, 'history-123');

      expect(result).toEqual({
        id: 'history-123',
        userId: 'user-123',
        supplier: '帳合先A',
        categoryCode: 'CAT001',
        name: '商品1',
        origin: '産地A',
        specification: '規格A',
        quantityPerPackage: 10,
        specificationUnit: '個',
        packageUnit: 'パック',
        usageCount: 5,
        pinned: true,
        pinOrder: 1,
        createdAt: new Date('2025-01-24T10:00:00Z'),
        updatedAt: new Date('2025-01-24T11:00:00Z'),
      });
    });

    it('should handle missing optional fields', () => {
      const firestoreData = {
        userId: 'user-123',
        supplier: '帳合先A',
        name: '商品1',
        origin: '産地A',
        specification: '規格A',
        quantityPerPackage: null,
        specificationUnit: '',
        usageCount: undefined,
        pinned: undefined,
        pinOrder: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      };

      const result = repository.fromFirestoreFormat(firestoreData as any, 'history-123');

      expect(result.quantityPerPackage).toBeNull();
      expect(result.specificationUnit).toBe('');
      expect(result.usageCount).toBe(1); // デフォルト値
      expect(result.pinned).toBe(false); // デフォルト値
      expect(result.pinOrder).toBe(9999); // デフォルト値
    });
  });

  describe('saveOrUpdate', () => {
    it('should create new history when no existing record', async () => {
      // 既存レコードなし
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
      mockAddDoc.mockResolvedValue({ id: 'new-history-id' });

      const history = createMockHistory();
      const id = await repository.saveOrUpdate(history);

      expect(id).toBe('new-history-id');
      expect(mockAddDoc).toHaveBeenCalledWith(
        'mock-collection-ref',
        expect.objectContaining({
          userId: 'user-123',
          name: '商品1',
        })
      );
    });

    it('should update existing history and increment usageCount', async () => {
      // 既存レコードあり
      const existingDoc = {
        ref: 'mock-doc-ref',
        id: 'existing-id',
        data: () => ({ usageCount: 5 }),
      };

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [existingDoc],
      });

      const history = createMockHistory();
      const id = await repository.saveOrUpdate(history);

      expect(id).toBe('existing-id');
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          updatedAt: expect.any(Object),
          usageCount: expect.objectContaining({ _increment: 1 }),
        })
      );
    });

    it('should update categoryCode when provided', async () => {
      const existingDoc = {
        ref: 'mock-doc-ref',
        id: 'existing-id',
        data: () => ({ usageCount: 1 }),
      };

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [existingDoc],
      });

      const history = createMockHistory({ categoryCode: 'CAT002' });
      await repository.saveOrUpdate(history);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          categoryCode: 'CAT002',
        })
      );
    });
  });

  describe('findByUserId', () => {
    it('should find histories by userId', async () => {
      const mockHistories = [
        {
          id: 'history-1',
          data: () => createMockHistory({ name: '商品1' }),
        },
        {
          id: 'history-2',
          data: () => createMockHistory({ name: '商品2' }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockHistories.forEach(callback),
      });

      const results = await repository.findByUserId('user-123');

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('商品1');
      expect(results[1].name).toBe('商品2');
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user-123');
      expect(mockOrderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    });
  });

  describe('findBySupplier', () => {
    it('should find histories by userId and supplier', async () => {
      const mockHistories = [
        {
          id: 'history-1',
          data: () => createMockHistory({ supplier: '帳合先A' }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockHistories.forEach(callback),
      });

      const results = await repository.findBySupplier('user-123', '帳合先A');

      expect(results).toHaveLength(1);
      expect(results[0].supplier).toBe('帳合先A');
    });
  });

  describe('findPinnedBySupplier', () => {
    it('should find pinned histories by supplier', async () => {
      const mockHistories = [
        {
          id: 'history-1',
          data: () => createMockHistory({ pinned: true, pinOrder: 1 }),
        },
        {
          id: 'history-2',
          data: () => createMockHistory({ pinned: true, pinOrder: 2 }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockHistories.forEach(callback),
      });

      const results = await repository.findPinnedBySupplier('user-123', '帳合先A');

      expect(results).toHaveLength(2);
      expect(mockWhere).toHaveBeenCalledWith('pinned', '==', true);
      expect(mockOrderBy).toHaveBeenCalledWith('pinOrder', 'asc');
    });
  });

  describe('deleteByConditions', () => {
    it('should delete documents matching conditions', async () => {
      const mockDocs = [
        { ref: 'ref-1', id: 'doc-1' },
        { ref: 'ref-2', id: 'doc-2' },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockDocs });

      const conditions = {
        supplier: '帳合先A',
        name: '商品1',
      };

      const count = await repository.deleteByConditions('user-123', conditions);

      expect(count).toBe(2);
      expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
      expect(mockDeleteDoc).toHaveBeenCalledWith('ref-1');
      expect(mockDeleteDoc).toHaveBeenCalledWith('ref-2');
    });

    it('should apply all provided conditions', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      const conditions = {
        supplier: '帳合先A',
        name: '商品1',
        origin: '産地A',
        specification: '規格A',
        quantityPerPackage: 10,
        specificationUnit: '個',
      };

      await repository.deleteByConditions('user-123', conditions);

      expect(mockWhere).toHaveBeenCalledWith('supplier', '==', '帳合先A');
      expect(mockWhere).toHaveBeenCalledWith('name', '==', '商品1');
      expect(mockWhere).toHaveBeenCalledWith('origin', '==', '産地A');
      expect(mockWhere).toHaveBeenCalledWith('specification', '==', '規格A');
      expect(mockWhere).toHaveBeenCalledWith('quantityPerPackage', '==', 10);
      expect(mockWhere).toHaveBeenCalledWith('specificationUnit', '==', '個');
    });
  });

  describe('togglePinned', () => {
    beforeEach(() => {
      mockDoc.mockReturnValue('mock-doc-ref');
    });

    it('should pin item with correct pinOrder', async () => {
      // 既存のピン留めアイテム: pinOrder 1, 2, 3
      const existingPinned = [
        { data: () => ({ pinOrder: 1 }) },
        { data: () => ({ pinOrder: 2 }) },
        { data: () => ({ pinOrder: 3 }) },
      ];

      mockGetDocs.mockResolvedValue({ empty: false, docs: existingPinned });

      await repository.togglePinned('history-123', true, 'user-123', '帳合先A');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          pinned: true,
          pinOrder: 4, // max(1,2,3) + 1
        })
      );
    });

    it('should set pinOrder to 1 when no existing pinned items', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      await repository.togglePinned('history-123', true, 'user-123', '帳合先A');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          pinned: true,
          pinOrder: 1, // 0 + 1
        })
      );
    });

    it('should unpin item and reset pinOrder', async () => {
      await repository.togglePinned('history-123', false);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          pinned: false,
          pinOrder: 9999, // デフォルト値
        })
      );
    });
  });

  describe('reorderPinned', () => {
    beforeEach(() => {
      mockDoc.mockReturnValue('mock-doc-ref');
    });

    it('should update pinOrder for all items', async () => {
      const reorderedItems = [
        { id: 'history-1', pinOrder: 1 },
        { id: 'history-2', pinOrder: 2 },
        { id: 'history-3', pinOrder: 3 },
      ];

      await repository.reorderPinned(reorderedItems);

      expect(mockUpdateDoc).toHaveBeenCalledTimes(3);
      reorderedItems.forEach((item) => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(
          'mock-doc-ref',
          expect.objectContaining({
            pinOrder: item.pinOrder,
            updatedAt: expect.any(Object),
          })
        );
      });
    });
  });
});
