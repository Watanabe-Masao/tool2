import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AutocompleteRepository,
  type AutocompleteHistory,
  type AutocompleteField,
} from '../AutocompleteRepository';
import { Timestamp } from 'firebase/firestore';

// Firestoreのモック
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  query: mockQuery,
  where: mockWhere,
  getDocs: mockGetDocs,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  doc: mockDoc,
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 }),
    fromDate: (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 }),
  },
}));

describe('AutocompleteRepository', () => {
  let repository: AutocompleteRepository;
  let mockDb: any;

  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks();

    mockDb = {} as any;
    repository = new AutocompleteRepository(mockDb);

    // デフォルトのモック設定
    mockCollection.mockReturnValue('mock-collection-ref');
    mockQuery.mockImplementation((...args) => args);
    mockDoc.mockReturnValue('mock-doc-ref');
  });

  describe('toFirestoreFormat', () => {
    it('should convert AutocompleteHistory to Firestore format', () => {
      const history: AutocompleteHistory = {
        id: 'history-123',
        userId: 'user-123',
        field: 'productName',
        values: ['トマト', 'きゅうり', 'なす'],
        lastUpdated: new Date('2025-01-24T10:00:00Z'),
      };

      const result = repository.toFirestoreFormat(history);

      expect(result).toEqual({
        userId: 'user-123',
        field: 'productName',
        values: ['トマト', 'きゅうり', 'なす'],
        last_updated: expect.any(Object),
      });
    });

    it('should handle missing lastUpdated', () => {
      const history: AutocompleteHistory = {
        userId: 'user-123',
        field: 'origin',
        values: ['青森', '北海道'],
      };

      const result = repository.toFirestoreFormat(history);

      expect(result.userId).toBe('user-123');
      expect(result.field).toBe('origin');
      expect(result.values).toEqual(['青森', '北海道']);
      expect(result.last_updated).toBeDefined();
    });
  });

  describe('fromFirestoreFormat', () => {
    it('should convert Firestore format to AutocompleteHistory', () => {
      const firestoreData = {
        userId: 'user-123',
        field: 'specification' as AutocompleteField,
        values: ['L', 'M', 'S'],
        last_updated: {
          toDate: () => new Date('2025-01-24T10:00:00Z'),
        } as Timestamp,
      };

      const result = repository.fromFirestoreFormat(firestoreData, 'history-123');

      expect(result).toEqual({
        id: 'history-123',
        userId: 'user-123',
        field: 'specification',
        values: ['L', 'M', 'S'],
        lastUpdated: new Date('2025-01-24T10:00:00Z'),
      });
    });

    it('should handle empty values array', () => {
      const firestoreData = {
        userId: 'user-123',
        field: 'supplier' as AutocompleteField,
        values: undefined as any,
        last_updated: {
          toDate: () => new Date('2025-01-24T10:00:00Z'),
        } as Timestamp,
      };

      const result = repository.fromFirestoreFormat(firestoreData, 'history-123');

      expect(result.values).toEqual([]);
    });
  });

  describe('findByField', () => {
    it('should find history by field', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'history-1',
            data: () => ({
              userId: 'user-123',
              field: 'productName',
              values: ['トマト', 'きゅうり'],
              last_updated: { toDate: () => new Date() } as Timestamp,
            }),
          },
        ],
      };

      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await repository.findByField('user-123', 'productName');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-123');
      expect(result?.field).toBe('productName');
      expect(result?.values).toEqual(['トマト', 'きゅうり']);
    });

    it('should return null when no history found', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      const result = await repository.findByField('user-123', 'productName');

      expect(result).toBeNull();
    });
  });

  describe('saveValue', () => {
    it('should create new history when none exists', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
      mockAddDoc.mockResolvedValue({ id: 'new-history-id' });

      const historyId = await repository.saveValue('user-123', 'productName', 'トマト');

      expect(historyId).toBe('new-history-id');
      expect(mockAddDoc).toHaveBeenCalledWith(
        'mock-collection-ref',
        expect.objectContaining({
          userId: 'user-123',
          field: 'productName',
          values: ['トマト'],
        })
      );
    });

    it('should add value to existing history', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'history-1',
            data: () => ({
              userId: 'user-123',
              field: 'productName',
              values: ['きゅうり', 'なす'],
              last_updated: { toDate: () => new Date() } as Timestamp,
            }),
          },
        ],
      };

      mockGetDocs.mockResolvedValue(mockSnapshot);

      const historyId = await repository.saveValue('user-123', 'productName', 'トマト');

      expect(historyId).toBe('history-1');
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          values: ['トマト', 'きゅうり', 'なす'],
        })
      );
    });

    it('should skip duplicate values', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'history-1',
            data: () => ({
              userId: 'user-123',
              field: 'productName',
              values: ['トマト', 'きゅうり'],
              last_updated: { toDate: () => new Date() } as Timestamp,
            }),
          },
        ],
      };

      mockGetDocs.mockResolvedValue(mockSnapshot);

      const historyId = await repository.saveValue('user-123', 'productName', 'トマト');

      expect(historyId).toBe('history-1');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('should skip empty values', async () => {
      const historyId = await repository.saveValue('user-123', 'productName', '');

      expect(historyId).toBe('');
      expect(mockAddDoc).not.toHaveBeenCalled();
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('should trim whitespace from values', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
      mockAddDoc.mockResolvedValue({ id: 'new-history-id' });

      await repository.saveValue('user-123', 'productName', '  トマト  ');

      expect(mockAddDoc).toHaveBeenCalledWith(
        'mock-collection-ref',
        expect.objectContaining({
          values: ['トマト'],
        })
      );
    });

    it('should limit values to 50 items', async () => {
      const existingValues = Array.from({ length: 50 }, (_, i) => `商品${i + 1}`);

      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'history-1',
            data: () => ({
              userId: 'user-123',
              field: 'productName',
              values: existingValues,
              last_updated: { toDate: () => new Date() } as Timestamp,
            }),
          },
        ],
      };

      mockGetDocs.mockResolvedValue(mockSnapshot);

      await repository.saveValue('user-123', 'productName', '新商品');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          values: expect.arrayContaining(['新商品', '商品1']),
        })
      );

      const updatedValues = (mockUpdateDoc.mock.calls[0][1] as any).values;
      expect(updatedValues).toHaveLength(50);
      expect(updatedValues[0]).toBe('新商品');
      expect(updatedValues[49]).toBe('商品49'); // 商品50が削除される
    });
  });

  describe('deleteValue', () => {
    it('should delete value from history', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'history-1',
            data: () => ({
              userId: 'user-123',
              field: 'productName',
              values: ['トマト', 'きゅうり', 'なす'],
              last_updated: { toDate: () => new Date() } as Timestamp,
            }),
          },
        ],
      };

      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await repository.deleteValue('user-123', 'productName', 'きゅうり');

      expect(result).toBe(true);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          values: ['トマト', 'なす'],
        })
      );
    });

    it('should return false when value not found', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'history-1',
            data: () => ({
              userId: 'user-123',
              field: 'productName',
              values: ['トマト', 'きゅうり'],
              last_updated: { toDate: () => new Date() } as Timestamp,
            }),
          },
        ],
      };

      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await repository.deleteValue('user-123', 'productName', 'なす');

      expect(result).toBe(false);
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('should delete document when last value is removed', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'history-1',
            data: () => ({
              userId: 'user-123',
              field: 'productName',
              values: ['トマト'],
              last_updated: { toDate: () => new Date() } as Timestamp,
            }),
          },
        ],
      };

      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await repository.deleteValue('user-123', 'productName', 'トマト');

      expect(result).toBe(true);
      expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('should return false when history not found', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      const result = await repository.deleteValue('user-123', 'productName', 'トマト');

      expect(result).toBe(false);
    });
  });

  describe('clearField', () => {
    it('should clear field history', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'history-1',
            data: () => ({
              userId: 'user-123',
              field: 'productName',
              values: ['トマト', 'きゅうり'],
              last_updated: { toDate: () => new Date() } as Timestamp,
            }),
          },
        ],
      };

      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await repository.clearField('user-123', 'productName');

      expect(result).toBe(true);
      expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
    });

    it('should return false when no history found', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      const result = await repository.clearField('user-123', 'productName');

      expect(result).toBe(false);
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });
  });

  describe('findAllByUserId', () => {
    it('should find all history for user', async () => {
      const mockHistories = [
        {
          id: 'history-1',
          data: () => ({
            userId: 'user-123',
            field: 'productName',
            values: ['トマト'],
            last_updated: { toDate: () => new Date() } as Timestamp,
          }),
        },
        {
          id: 'history-2',
          data: () => ({
            userId: 'user-123',
            field: 'origin',
            values: ['青森'],
            last_updated: { toDate: () => new Date() } as Timestamp,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockHistories.forEach(callback),
      });

      const results = await repository.findAllByUserId('user-123');

      expect(results).toHaveLength(2);
      expect(results[0].field).toBe('productName');
      expect(results[1].field).toBe('origin');
    });
  });
});
