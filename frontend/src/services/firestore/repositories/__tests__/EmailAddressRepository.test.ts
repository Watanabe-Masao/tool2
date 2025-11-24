import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailAddressRepository, type EmailAddress } from '../EmailAddressRepository';
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

describe('EmailAddressRepository', () => {
  let repository: EmailAddressRepository;
  let mockDb: any;

  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks();

    mockDb = {} as any;
    repository = new EmailAddressRepository(mockDb);

    // デフォルトのモック設定
    mockCollection.mockReturnValue('mock-collection-ref');
    mockQuery.mockImplementation((...args) => args);
    mockDoc.mockReturnValue('mock-doc-ref');
  });

  describe('toFirestoreFormat', () => {
    it('should convert EmailAddress to Firestore format', () => {
      const address: EmailAddress = {
        id: 'address-123',
        userId: 'user-123',
        name: '田中太郎',
        email: 'tanaka@example.com',
        displayOrder: 0,
        createdAt: new Date('2025-01-24T10:00:00Z'),
        updatedAt: new Date('2025-01-24T10:00:00Z'),
      };

      const result = repository.toFirestoreFormat(address);

      expect(result).toEqual({
        userId: 'user-123',
        name: '田中太郎',
        email: 'tanaka@example.com',
        displayOrder: 0,
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object),
      });
    });

    it('should handle missing displayOrder', () => {
      const address: EmailAddress = {
        userId: 'user-123',
        name: '佐藤花子',
        email: 'sato@example.com',
      };

      const result = repository.toFirestoreFormat(address);

      expect(result.userId).toBe('user-123');
      expect(result.name).toBe('佐藤花子');
      expect(result.email).toBe('sato@example.com');
      expect(result.displayOrder).toBeUndefined();
    });
  });

  describe('fromFirestoreFormat', () => {
    it('should convert Firestore format to EmailAddress', () => {
      const firestoreData = {
        userId: 'user-123',
        name: '田中太郎',
        email: 'tanaka@example.com',
        displayOrder: 0,
        createdAt: {
          toDate: () => new Date('2025-01-24T10:00:00Z'),
        } as Timestamp,
        updatedAt: {
          toDate: () => new Date('2025-01-24T10:00:00Z'),
        } as Timestamp,
      };

      const result = repository.fromFirestoreFormat(firestoreData, 'address-123');

      expect(result).toEqual({
        id: 'address-123',
        userId: 'user-123',
        name: '田中太郎',
        email: 'tanaka@example.com',
        displayOrder: 0,
        createdAt: new Date('2025-01-24T10:00:00Z'),
        updatedAt: new Date('2025-01-24T10:00:00Z'),
      });
    });

    it('should handle missing displayOrder', () => {
      const firestoreData = {
        userId: 'user-123',
        name: '佐藤花子',
        email: 'sato@example.com',
        displayOrder: undefined,
        createdAt: {
          toDate: () => new Date('2025-01-24T10:00:00Z'),
        } as Timestamp,
        updatedAt: {
          toDate: () => new Date('2025-01-24T10:00:00Z'),
        } as Timestamp,
      };

      const result = repository.fromFirestoreFormat(firestoreData, 'address-456');

      expect(result.displayOrder).toBeUndefined();
    });
  });

  describe('findByUserId', () => {
    it('should find addresses by userId and sort by displayOrder', async () => {
      const mockAddresses = [
        {
          id: 'address-1',
          data: () => ({
            userId: 'user-123',
            name: '田中太郎',
            email: 'tanaka@example.com',
            displayOrder: 2,
            createdAt: { toDate: () => new Date() } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
        {
          id: 'address-2',
          data: () => ({
            userId: 'user-123',
            name: '佐藤花子',
            email: 'sato@example.com',
            displayOrder: 0,
            createdAt: { toDate: () => new Date() } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
        {
          id: 'address-3',
          data: () => ({
            userId: 'user-123',
            name: '鈴木一郎',
            email: 'suzuki@example.com',
            displayOrder: 1,
            createdAt: { toDate: () => new Date() } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockAddresses.forEach(callback),
      });

      const results = await repository.findByUserId('user-123');

      expect(results).toHaveLength(3);
      // displayOrder順にソートされているか確認
      expect(results[0].name).toBe('佐藤花子'); // displayOrder: 0
      expect(results[1].name).toBe('鈴木一郎'); // displayOrder: 1
      expect(results[2].name).toBe('田中太郎'); // displayOrder: 2
    });

    it('should put items without displayOrder at the end', async () => {
      const mockAddresses = [
        {
          id: 'address-1',
          data: () => ({
            userId: 'user-123',
            name: '田中太郎',
            email: 'tanaka@example.com',
            displayOrder: undefined,
            createdAt: { toDate: () => new Date('2025-01-24T09:00:00Z') } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
        {
          id: 'address-2',
          data: () => ({
            userId: 'user-123',
            name: '佐藤花子',
            email: 'sato@example.com',
            displayOrder: 0,
            createdAt: { toDate: () => new Date('2025-01-24T10:00:00Z') } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => mockAddresses.forEach(callback),
      });

      const results = await repository.findByUserId('user-123');

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('佐藤花子'); // displayOrder: 0
      expect(results[1].name).toBe('田中太郎'); // displayOrder: undefined
    });
  });

  describe('subscribeToAddresses', () => {
    it('should subscribe to address changes', () => {
      const mockAddresses = [
        {
          id: 'address-1',
          data: () => ({
            userId: 'user-123',
            name: '田中太郎',
            email: 'tanaka@example.com',
            displayOrder: 0,
            createdAt: { toDate: () => new Date() } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => mockAddresses.forEach(callback),
      };

      // onSnapshotの第1引数（成功コールバック）を即座に呼び出す
      mockOnSnapshot.mockImplementation((q: any, onSuccess: any, onError: any) => {
        onSuccess(mockSnapshot);
        return vi.fn(); // unsubscribe関数のモック
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const unsubscribe = repository.subscribeToAddresses('user-123', onSuccess, onError);

      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: '田中太郎',
            email: 'tanaka@example.com',
          }),
        ])
      );
      expect(onError).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call onError when subscription fails', () => {
      const mockError = new Error('Subscription failed');

      mockOnSnapshot.mockImplementation((q: any, onSuccess: any, onError: any) => {
        onError(mockError);
        return vi.fn();
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      repository.subscribeToAddresses('user-123', onSuccess, onError);

      expect(onError).toHaveBeenCalledWith(mockError);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should sort addresses by displayOrder in subscription', () => {
      const mockAddresses = [
        {
          id: 'address-1',
          data: () => ({
            userId: 'user-123',
            name: '田中太郎',
            email: 'tanaka@example.com',
            displayOrder: 2,
            createdAt: { toDate: () => new Date() } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
        {
          id: 'address-2',
          data: () => ({
            userId: 'user-123',
            name: '佐藤花子',
            email: 'sato@example.com',
            displayOrder: 0,
            createdAt: { toDate: () => new Date() } as Timestamp,
            updatedAt: { toDate: () => new Date() } as Timestamp,
          }),
        },
      ];

      const mockSnapshot = {
        forEach: (callback: any) => mockAddresses.forEach(callback),
      };

      mockOnSnapshot.mockImplementation((q: any, onSuccess: any, onError: any) => {
        onSuccess(mockSnapshot);
        return vi.fn();
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      repository.subscribeToAddresses('user-123', onSuccess, onError);

      const receivedAddresses = onSuccess.mock.calls[0][0];
      expect(receivedAddresses[0].name).toBe('佐藤花子'); // displayOrder: 0
      expect(receivedAddresses[1].name).toBe('田中太郎'); // displayOrder: 2
    });
  });

  describe('reorder', () => {
    it('should reorder addresses', async () => {
      const reorderedItems = [
        { id: 'address-1', displayOrder: 0 },
        { id: 'address-2', displayOrder: 1 },
        { id: 'address-3', displayOrder: 2 },
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

  describe('updateAddress', () => {
    it('should update address name and email', async () => {
      await repository.updateAddress('address-123', '新しい名前', 'new@example.com');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          name: '新しい名前',
          email: 'new@example.com',
          updatedAt: expect.any(Object),
        })
      );
    });
  });
});
