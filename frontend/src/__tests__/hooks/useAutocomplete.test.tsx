import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { FirestoreService } from '@/services/firebase/firestoreService';
import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import type { User } from 'firebase/auth';

// Mock FirestoreService
vi.mock('@/services/firebase/firestoreService', () => ({
  FirestoreService: {
    getAutocompleteHistory: vi.fn(),
    saveAutocompleteHistory: vi.fn(),
  },
}));

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    // Immediately call callback with a mock user
    const mockUser = {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
    } as User;
    callback(mockUser);
    return vi.fn(); // Return unsubscribe function
  }),
}));

// Mock Firebase app
vi.mock('@/services/firebase/config', () => ({
  app: {},
  auth: {},
}));

describe('useAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should fetch autocomplete options on mount', async () => {
    const mockOptions = ['りんご', 'バナナ', 'オレンジ'];
    vi.mocked(FirestoreService.getAutocompleteHistory).mockResolvedValue(mockOptions);

    const { result } = renderHook(() => useAutocomplete('productName'), { wrapper });

    await waitFor(() => {
      expect(result.current.options).toEqual(mockOptions);
    });

    expect(FirestoreService.getAutocompleteHistory).toHaveBeenCalledWith('test-user-id', 'productName');
  });

  it('should add new value to history', async () => {
    vi.mocked(FirestoreService.getAutocompleteHistory).mockResolvedValue(['りんご']);
    vi.mocked(FirestoreService.saveAutocompleteHistory).mockResolvedValue();

    const { result } = renderHook(() => useAutocomplete('productName'), { wrapper });

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

  it('should cache options for 5 minutes', async () => {
    const mockOptions = ['青森県', '長野県'];
    vi.mocked(FirestoreService.getAutocompleteHistory).mockResolvedValue(mockOptions);

    // First render
    const { result: result1, unmount: unmount1 } = renderHook(() => useAutocomplete('origin'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result1.current.options).toEqual(mockOptions);
    });

    expect(FirestoreService.getAutocompleteHistory).toHaveBeenCalledTimes(1);

    unmount1();

    // Second render (should use cache)
    const { result: result2 } = renderHook(() => useAutocomplete('origin'), { wrapper });

    await waitFor(() => {
      expect(result2.current.options).toEqual(mockOptions);
    });

    // Should still be called only once due to caching
    expect(FirestoreService.getAutocompleteHistory).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when not authenticated', async () => {
    // Mock no user
    vi.mock('firebase/auth', () => ({
      getAuth: vi.fn(),
      GoogleAuthProvider: vi.fn(),
      signInWithPopup: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChanged: vi.fn((_auth, callback) => {
        callback(null); // No user
        return vi.fn();
      }),
    }));

    const { result } = renderHook(() => useAutocomplete('supplier'), { wrapper });

    await waitFor(() => {
      expect(result.current.options).toEqual([]);
    });
  });
});
