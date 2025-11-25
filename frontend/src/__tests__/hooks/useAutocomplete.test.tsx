import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { FirestoreService } from '@/services/firebase/firestoreService';
import type { User } from 'firebase/auth';

// Mock FirestoreService
vi.mock('@/services/firebase/firestoreService', () => ({
  FirestoreService: {
    getAutocompleteHistory: vi.fn(),
    saveAutocompleteHistory: vi.fn(),
  },
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
    vi.mocked(FirestoreService.getAutocompleteHistory).mockResolvedValue(mockOptions);

    const { result } = renderHook(() => useAutocomplete('productName'));

    await waitFor(() => {
      expect(result.current.options).toEqual(mockOptions);
    });

    expect(FirestoreService.getAutocompleteHistory).toHaveBeenCalledWith('test-user-id', 'productName');
  });

  it('should add new value to history', async () => {
    vi.mocked(FirestoreService.getAutocompleteHistory).mockResolvedValue(['りんご']);
    vi.mocked(FirestoreService.saveAutocompleteHistory).mockResolvedValue();

    const { result } = renderHook(() => useAutocomplete('productName'));

    await waitFor(() => {
      expect(result.current.options).toBeDefined();
    });

    await result.current.addToHistory('バナナ');

    expect(FirestoreService.saveAutocompleteHistory).toHaveBeenCalledWith(
      'test-user-id',
      'productName',
      'バナナ'
    );
  });

  it('should not refetch within cache time', async () => {
    const mockOptions = ['青森県', '長野県'];
    vi.mocked(FirestoreService.getAutocompleteHistory).mockResolvedValue(mockOptions);

    // Render hook
    const { result, rerender } = renderHook(() => useAutocomplete('origin'));

    await waitFor(() => {
      expect(result.current.options).toEqual(mockOptions);
    });

    expect(FirestoreService.getAutocompleteHistory).toHaveBeenCalledTimes(1);

    // Rerender the hook (simulating a component rerender)
    rerender();

    // Should not fetch again due to cache
    expect(FirestoreService.getAutocompleteHistory).toHaveBeenCalledTimes(1);

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
