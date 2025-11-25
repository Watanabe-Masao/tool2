import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDraftActions } from '@/hooks/useDraftActions';
import { SessionStorageService } from '@/utils/sessionStorageService';
import type { OrderFormData } from '@/schemas/orderSchema';

// Mock SessionStorageService
vi.mock('@/utils/sessionStorageService', () => ({
  SessionStorageService: {
    loadDraft: vi.fn(),
    clearDraft: vi.fn(),
  },
}));

describe('useDraftActions', () => {
  const mockReset = vi.fn();
  const mockSetRestoreDialogOpen = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockSetActiveStep = vi.fn();
  const mockIsInitialLoad = { current: false };

  const mockUser = { uid: 'test-user-123' };

  const mockDraft: OrderFormData = {
    deliveryDate: new Date('2024-01-01'),
    suppliers: ['supplier1'],
    products: [{ name: 'Product A' }] as any,
  };

  const defaultParams = {
    user: mockUser,
    reset: mockReset,
    setRestoreDialogOpen: mockSetRestoreDialogOpen,
    showSuccess: mockShowSuccess,
    setActiveStep: mockSetActiveStep,
    isInitialLoad: mockIsInitialLoad,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockIsInitialLoad.current = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('handleRestoreDraft', () => {
    it('下書きを復元できる', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(mockDraft);

      const { result } = renderHook(() => useDraftActions(defaultParams));

      act(() => {
        result.current.handleRestoreDraft();
      });

      expect(SessionStorageService.loadDraft).toHaveBeenCalledWith('test-user-123');
      expect(mockReset).toHaveBeenCalledWith(mockDraft);
      expect(mockSetRestoreDialogOpen).toHaveBeenCalledWith(false);
      expect(mockShowSuccess).toHaveBeenCalledWith('下書きを読み込みました');
      expect(mockSetActiveStep).toHaveBeenCalledWith(0);
    });

    it('userがnullの場合は何もしない', () => {
      const { result } = renderHook(() =>
        useDraftActions({
          ...defaultParams,
          user: null,
        })
      );

      act(() => {
        result.current.handleRestoreDraft();
      });

      expect(SessionStorageService.loadDraft).not.toHaveBeenCalled();
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('下書きが存在しない場合は何もしない', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const { result } = renderHook(() => useDraftActions(defaultParams));

      act(() => {
        result.current.handleRestoreDraft();
      });

      expect(SessionStorageService.loadDraft).toHaveBeenCalledWith('test-user-123');
      expect(mockReset).not.toHaveBeenCalled();
      expect(mockSetRestoreDialogOpen).not.toHaveBeenCalled();
      expect(mockShowSuccess).not.toHaveBeenCalled();
    });

    it('復元後に最初のステップに戻る', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(mockDraft);

      const { result } = renderHook(() => useDraftActions(defaultParams));

      act(() => {
        result.current.handleRestoreDraft();
      });

      expect(mockSetActiveStep).toHaveBeenCalledWith(0);
    });

    it('復元後にisInitialLoadフラグがtrueに設定される', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(mockDraft);

      const { result } = renderHook(() => useDraftActions(defaultParams));

      expect(mockIsInitialLoad.current).toBe(false);

      act(() => {
        result.current.handleRestoreDraft();
      });

      expect(mockIsInitialLoad.current).toBe(true);
    });

    it('1秒後にisInitialLoadフラグがfalseに戻る', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(mockDraft);

      const { result } = renderHook(() => useDraftActions(defaultParams));

      act(() => {
        result.current.handleRestoreDraft();
      });

      expect(mockIsInitialLoad.current).toBe(true);

      // 1秒進める
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockIsInitialLoad.current).toBe(false);
    });

    it('ダイアログが閉じることを確認', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(mockDraft);

      const { result } = renderHook(() => useDraftActions(defaultParams));

      act(() => {
        result.current.handleRestoreDraft();
      });

      expect(mockSetRestoreDialogOpen).toHaveBeenCalledWith(false);
    });

    it('成功メッセージが表示されることを確認', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(mockDraft);

      const { result } = renderHook(() => useDraftActions(defaultParams));

      act(() => {
        result.current.handleRestoreDraft();
      });

      expect(mockShowSuccess).toHaveBeenCalledWith('下書きを読み込みました');
    });
  });

  describe('handleDiscardDraft', () => {
    it('下書きを破棄できる', () => {
      const { result } = renderHook(() => useDraftActions(defaultParams));

      act(() => {
        result.current.handleDiscardDraft();
      });

      expect(SessionStorageService.clearDraft).toHaveBeenCalledWith('test-user-123');
      expect(mockSetRestoreDialogOpen).toHaveBeenCalledWith(false);
    });

    it('userがnullの場合は何もしない', () => {
      const { result } = renderHook(() =>
        useDraftActions({
          ...defaultParams,
          user: null,
        })
      );

      act(() => {
        result.current.handleDiscardDraft();
      });

      expect(SessionStorageService.clearDraft).not.toHaveBeenCalled();
      expect(mockSetRestoreDialogOpen).not.toHaveBeenCalled();
    });

    it('ダイアログが閉じることを確認', () => {
      const { result } = renderHook(() => useDraftActions(defaultParams));

      act(() => {
        result.current.handleDiscardDraft();
      });

      expect(mockSetRestoreDialogOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('メモ化の確認', () => {
    it('依存配列が変わらなければ関数が再生成されない', () => {
      const { result, rerender } = renderHook(
        (props) => useDraftActions(props),
        { initialProps: defaultParams }
      );

      const firstHandleRestoreDraft = result.current.handleRestoreDraft;
      const firstHandleDiscardDraft = result.current.handleDiscardDraft;

      rerender(defaultParams);

      expect(result.current.handleRestoreDraft).toBe(firstHandleRestoreDraft);
      expect(result.current.handleDiscardDraft).toBe(firstHandleDiscardDraft);
    });

    it('userが変わると関数が再生成される', () => {
      const { result, rerender } = renderHook(
        (props) => useDraftActions(props),
        { initialProps: defaultParams }
      );

      const firstHandleRestoreDraft = result.current.handleRestoreDraft;

      rerender({
        ...defaultParams,
        user: { uid: 'different-user' },
      });

      expect(result.current.handleRestoreDraft).not.toBe(firstHandleRestoreDraft);
    });
  });
});
