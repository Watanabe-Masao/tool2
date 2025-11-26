import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import type { User } from 'firebase/auth';
import type { IFirestoreService } from '@/types/services';

// Mock FirestoreService
const mockFirestoreService: Partial<IFirestoreService> = {
  getAutocompleteHistory: vi.fn(),
  saveAutocompleteHistory: vi.fn(),
};

// Mock useFirestoreServiceRef
vi.mock('@/context/ServiceContext', () => ({
  useFirestoreServiceRef: vi.fn(() => ({
    current: mockFirestoreService,
  })),
}));

// Mock useAuthContext
const mockUser: User = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
} as User;

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: vi.fn(() => ({
    user: mockUser,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    firebaseInitialized: true,
  })),
}));

describe('useAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch autocomplete options on mount', async () => {
    const mockOptions = ['りんご', 'バナナ', 'オレンジ'];
    vi.mocked(mockFirestoreService.getAutocompleteHistory!).mockResolvedValue(mockOptions);

    const { result } = renderHook(() => useAutocomplete('productName'));

    await waitFor(() => {
      expect(result.current.options).toEqual(mockOptions);
    });

    expect(mockFirestoreService.getAutocompleteHistory).toHaveBeenCalledWith('test-user-id', 'productName');
  });

  it('should add new value to history', async () => {
    vi.mocked(mockFirestoreService.getAutocompleteHistory!).mockResolvedValue(['りんご']);
    vi.mocked(mockFirestoreService.saveAutocompleteHistory!).mockResolvedValue();

    const { result } = renderHook(() => useAutocomplete('productName'));

    await waitFor(() => {
      expect(result.current.options).toBeDefined();
    });

    await result.current.addToHistory('バナナ');

    expect(mockFirestoreService.saveAutocompleteHistory).toHaveBeenCalledWith(
      'test-user-id',
      'productName',
      'バナナ'
    );
  });

  it('should not refetch within cache time', async () => {
    const mockOptions = ['青森県', '長野県'];
    vi.mocked(mockFirestoreService.getAutocompleteHistory!).mockResolvedValue(mockOptions);

    // Render hook
    const { result, rerender } = renderHook(() => useAutocomplete('origin'));

    await waitFor(() => {
      expect(result.current.options).toEqual(mockOptions);
    });

    expect(mockFirestoreService.getAutocompleteHistory).toHaveBeenCalledTimes(1);

    // Rerender the hook (simulating a component rerender)
    rerender();

    // Should not fetch again due to cache
    expect(mockFirestoreService.getAutocompleteHistory).toHaveBeenCalledTimes(1);

    // Options should still be available
    expect(result.current.options).toEqual(mockOptions);
  });

  it('should return empty array when not authenticated', async () => {
    // Mock no user for this test
    const { useAuthContext } = await import('@/context/AuthContext');
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      firebaseInitialized: true,
    } as any);

    const { result } = renderHook(() => useAutocomplete('supplier'));

    await waitFor(() => {
      expect(result.current.options).toEqual([]);
    });
  });
});
