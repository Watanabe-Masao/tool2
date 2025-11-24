import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PresetRepository, type SupplierPreset } from '../PresetRepository';
import { Timestamp } from 'firebase/firestore';

// Firestoreのモック
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn();
const mockOnSnapshot = vi.fn();

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
  onSnapshot: mockOnSnapshot,
  Timestamp: {
    now: () => ({ seconds: 1234567890, nanoseconds: 0 }),
    fromDate: (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 }),
  },
}));

describe('PresetRepository', () => {
  let repository: PresetRepository;
  let mockDb: any;

  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks();

    mockDb = {} as any;
    repository = new PresetRepository(mockDb);

    // デフォルトのモック設定
    mockCollection.mockReturnValue('mock-collection-ref');
    mockQuery.mockImplementation((...args) => args);
    mockDoc.mockReturnValue('mock-doc-ref');
  });

  describe('toFirestoreFormat', () => {
    it('should convert SupplierPreset to Firestore format', () => {
      const preset: SupplierPreset = {
        id: 'preset-123',
        userId: 'user-123',
        supplier: '帳合先A',
        displayOrder: 0,
        createdAt: new Date('2025-01-24T10:00:00Z'),
        updatedAt: new Date('2025-01-24T10:00:00Z'),
      };

      const result = repository.toFirestoreFormat(preset);

      expect(result).toEqual({
        userId: 'user-123',
        supplier: '帳合先A',
        displayOrder: 0,
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object),
      });
    });

    it('should handle missing displayOrder', () => {
      const preset: SupplierPreset = {
        userId: 'user-123',
        supplier: '帳合先B',
      };

      const result = repository.toFirestoreFormat(preset);

      expect(result.userId).toBe('user-123');
      expect(result.supplier).toBe('帳合先B');
      expect(result.displayOrder).toBeUndefined();
    });
  });

  describe('fromFirestoreFormat', () => {
    it('should convert Firestore format to SupplierPreset', () => {
      const firestoreData = {
        userId: 'user-123',
        supplier: '帳合先A',
        displayOrder: 0,
        createdAt: {
          toDate: () => new Date('2025-01-24T10:00:00Z'),
        } as Timestamp,
        updatedAt: {
          toDate: () => new Date('2025-01-24T10:00:00Z'),
        } as Timestamp,
      };

      const result = repository.fromFirestoreFormat(firestoreData, 'preset-123');

      expect(result).toEqual({
        id: 'preset-123',
        userId: 'user-123',
        supplier: '帳合先A',
        displayOrder: 0,
        createdAt: new Date('2025-01-24T10:00:00Z'),
        updatedAt: new Date('2025-01-24T10:00:00Z'),
      });
    });

    it('should handle missing displayOrder', () => {
      const firestoreData = {
        userId: 'user-123',
        supplier: '帳合先B',
        displayOrder: undefined,
        createdAt: {
          toDate: () => new Date('2025-01-24T10:00:00Z'),
        } as Timestamp,
        updatedAt: {
          toDate: () => new Date('2025-01-24T10:00:00Z'),
        } as Timestamp,
      };

      const result = repository.fromFirestoreFormat(firestoreData, 'preset-456');

      expect(result.displayOrder).toBeUndefined();
    });
  });

  describe('findByUserId', () => {
    it('should find presets by userId and sort by displayOrder', async () => {
      const mockPresets = [
        {
          id: 'preset-1',
          data: () => ({
            userId: 'user-123',
            supplier: '帳合先A',
            displayOrder: 2,
            createdAt: { toDate: () => new Date() } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
        {
          id: 'preset-2',
          data: () => ({
            userId: 'user-123',
            supplier: '帳合先B',
            displayOrder: 0,
            createdAt: { toDate: () => new Date() } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
        {
          id: 'preset-3',
          data: () => ({
            userId: 'user-123',
            supplier: '帳合先C',
            displayOrder: 1,
            createdAt: { toDate: () => new Date() } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockPresets.forEach(callback),
      });

      const results = await repository.findByUserId('user-123');

      expect(results).toHaveLength(3);
      // displayOrder順にソートされているか確認
      expect(results[0].supplier).toBe('帳合先B'); // displayOrder: 0
      expect(results[1].supplier).toBe('帳合先C'); // displayOrder: 1
      expect(results[2].supplier).toBe('帳合先A'); // displayOrder: 2
    });

    it('should put items without displayOrder at the end', async () => {
      const mockPresets = [
        {
          id: 'preset-1',
          data: () => ({
            userId: 'user-123',
            supplier: '帳合先A',
            displayOrder: undefined,
            createdAt: { toDate: () => new Date('2025-01-24T09:00:00Z') } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
        {
          id: 'preset-2',
          data: () => ({
            userId: 'user-123',
            supplier: '帳合先B',
            displayOrder: 0,
            createdAt: { toDate: () => new Date('2025-01-24T10:00:00Z') } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockPresets.forEach(callback),
      });

      const results = await repository.findByUserId('user-123');

      expect(results).toHaveLength(2);
      expect(results[0].supplier).toBe('帳合先B'); // displayOrder: 0
      expect(results[1].supplier).toBe('帳合先A'); // displayOrder: undefined
    });
  });

  describe('subscribeToPresets', () => {
    it('should subscribe to preset changes', () => {
      const mockPresets = [
        {
          id: 'preset-1',
          data: () => ({
            userId: 'user-123',
            supplier: '帳合先A',
            displayOrder: 0,
            createdAt: { toDate: () => new Date() } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => mockPresets.forEach(callback),
      };

      // onSnapshotの第1引数（成功コールバック）を即座に呼び出す
      mockOnSnapshot.mockImplementation((_q: any, onSuccess: any, _onError: any) => {
        onSuccess(mockSnapshot);
        return vi.fn(); // unsubscribe関数のモック
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const unsubscribe = repository.subscribeToPresets('user-123', onSuccess, onError);

      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            supplier: '帳合先A',
          }),
        ])
      );
      expect(onError).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call onError when subscription fails', () => {
      const mockError = new Error('Subscription failed');

      mockOnSnapshot.mockImplementation((_q: any, _onSuccess: any, onError: any) => {
        onError(mockError);
        return vi.fn();
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      repository.subscribeToPresets('user-123', onSuccess, onError);

      expect(onError).toHaveBeenCalledWith(mockError);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should sort presets by displayOrder in subscription', () => {
      const mockPresets = [
        {
          id: 'preset-1',
          data: () => ({
            userId: 'user-123',
            supplier: '帳合先A',
            displayOrder: 2,
            createdAt: { toDate: () => new Date() } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
        {
          id: 'preset-2',
          data: () => ({
            userId: 'user-123',
            supplier: '帳合先B',
            displayOrder: 0,
            createdAt: { toDate: () => new Date() } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => mockPresets.forEach(callback),
      };

      mockOnSnapshot.mockImplementation((_q: any, onSuccess: any, _onError: any) => {
        onSuccess(mockSnapshot);
        return vi.fn();
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      repository.subscribeToPresets('user-123', onSuccess, onError);

      const receivedPresets = onSuccess.mock.calls[0][0];
      expect(receivedPresets[0].supplier).toBe('帳合先B'); // displayOrder: 0
      expect(receivedPresets[1].supplier).toBe('帳合先A'); // displayOrder: 2
    });
  });

  describe('reorder', () => {
    it('should reorder presets', async () => {
      const reorderedItems = [
        { id: 'preset-1', displayOrder: 0 },
        { id: 'preset-2', displayOrder: 1 },
        { id: 'preset-3', displayOrder: 2 },
      ];

      await repository.reorder(reorderedItems);

      expect(mockUpdateDoc).toHaveBeenCalledTimes(3);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          displayOrder: expect.any(Number),
        })
      );
    });

    it('should handle empty array', async () => {
      await repository.reorder([]);

      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('updateSupplier', () => {
    it('should update supplier value', async () => {
      await repository.updateSupplier('preset-123', '新しい帳合先');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          supplier: '新しい帳合先',
          updatedAt: expect.any(Object),
        })
      );
    });
  });
});
