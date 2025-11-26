import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderDraftManagement } from '@/hooks/useOrderDraftManagement';
import { SessionStorageService } from '@/utils/sessionStorageService';
import type { OrderFormData } from '@/schemas/orderSchema';

// Mock SessionStorageService
vi.mock('@/utils/sessionStorageService', () => ({
  SessionStorageService: {
    loadDraft: vi.fn(),
    saveDraft: vi.fn(),
  },
}));

describe('useOrderDraftManagement', () => {
  const mockGetValues = vi.fn<() => OrderFormData>();
  const mockMethods = {
    getValues: mockGetValues,
  } as any;

  const mockUser = { uid: 'test-user-123' };

  const mockFormData: OrderFormData = {
    deliveryDate: new Date('2024-01-01'),
    suppliers: ['supplier1'],
    products: [],
  };

  // NOTE: products, suppliers, deliveryDateは依存配列から除外済み
  // 自動保存はtriggerAutoSave()を呼び出してトリガーする
  const defaultParams = {
    user: mockUser,
    methods: mockMethods,
  };

  // sessionStorageのモック
  const mockSessionStorage: Record<string, string> = {};
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetValues.mockReturnValue(mockFormData);
    // Mock console.log to suppress "Form auto-saved" messages
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // sessionStorageをモック（draft-dialog-shownフラグ用）
    Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key]);
    Storage.prototype.getItem = vi.fn((key: string) => mockSessionStorage[key] || null);
    Storage.prototype.setItem = vi.fn((key: string, value: string) => {
      mockSessionStorage[key] = value;
    });
    Storage.prototype.removeItem = vi.fn((key: string) => {
      delete mockSessionStorage[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    // sessionStorageを復元
    Storage.prototype.getItem = originalGetItem;
    Storage.prototype.setItem = originalSetItem;
    Storage.prototype.removeItem = originalRemoveItem;
  });

  describe('初期状態', () => {
    it('restoreDialogOpenの初期値はfalse', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const { result } = renderHook(() => useOrderDraftManagement(defaultParams));

      expect(result.current.restoreDialogOpen).toBe(false);
    });

    it('hasUnsavedChangesの初期値はfalse（userがnullの場合）', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const { result } = renderHook(() =>
        useOrderDraftManagement({
          ...defaultParams,
          user: null,
        })
      );

      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe('下書き復元確認', () => {
    it('userがnullの場合、loadDraftは呼ばれない', () => {
      renderHook(() =>
        useOrderDraftManagement({
          ...defaultParams,
          user: null,
        })
      );

      expect(SessionStorageService.loadDraft).not.toHaveBeenCalled();
    });

    it('下書きが存在する場合、restoreDialogOpenがtrueになる', () => {
      const mockDraft = { ...mockFormData };
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(mockDraft);

      const { result } = renderHook(() => useOrderDraftManagement(defaultParams));

      expect(SessionStorageService.loadDraft).toHaveBeenCalledWith('test-user-123');
      expect(result.current.restoreDialogOpen).toBe(true);
    });

    it('下書きが存在しない場合、restoreDialogOpenはfalseのまま', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const { result } = renderHook(() => useOrderDraftManagement(defaultParams));

      expect(SessionStorageService.loadDraft).toHaveBeenCalledWith('test-user-123');
      expect(result.current.restoreDialogOpen).toBe(false);
    });

    it('isInitialLoadフラグで初回のみ実行される', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const { rerender } = renderHook(
        ({ user }) => useOrderDraftManagement({ ...defaultParams, user }),
        { initialProps: { user: mockUser } }
      );

      expect(SessionStorageService.loadDraft).toHaveBeenCalledTimes(1);

      // rerenderしても再度呼ばれない
      rerender({ user: mockUser });
      expect(SessionStorageService.loadDraft).toHaveBeenCalledTimes(1);
    });
  });

  describe('自動保存機能', () => {
    it('triggerAutoSave呼び出し後2秒で自動保存される', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const { result, rerender } = renderHook(() => useOrderDraftManagement(defaultParams));

      // 初回ロードフラグをクリアするためのrerender
      rerender();

      // triggerAutoSaveを呼び出し
      act(() => {
        result.current.triggerAutoSave();
      });

      // 1秒後: まだ保存されない
      vi.advanceTimersByTime(1000);
      expect(SessionStorageService.saveDraft).not.toHaveBeenCalled();

      // さらに1秒後（合計2秒）: 保存される
      vi.advanceTimersByTime(1000);
      expect(SessionStorageService.saveDraft).toHaveBeenCalledWith(
        'test-user-123',
        mockFormData
      );
      expect(console.log).toHaveBeenCalledWith('Form auto-saved');
    });

    it('複数回のtriggerAutoSave呼び出しでdebounceが効く（最後の呼び出しから2秒後に1回だけ保存）', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const { result, rerender } = renderHook(() => useOrderDraftManagement(defaultParams));

      // 初回ロードフラグをクリア
      rerender();

      // 1回目の呼び出し
      act(() => {
        result.current.triggerAutoSave();
      });
      vi.advanceTimersByTime(1000);

      // 2回目の呼び出し（タイマーリセット）
      act(() => {
        result.current.triggerAutoSave();
      });
      vi.advanceTimersByTime(1000);

      // まだ保存されない
      expect(SessionStorageService.saveDraft).not.toHaveBeenCalled();

      // さらに1秒後（最後の呼び出しから2秒）: 保存される
      vi.advanceTimersByTime(1000);
      expect(SessionStorageService.saveDraft).toHaveBeenCalledTimes(1);
    });

    it('triggerAutoSave呼び出しでhasUnsavedChangesがtrueになる', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const { result, rerender } = renderHook(() => useOrderDraftManagement(defaultParams));

      // 初回マウント後、hasUnsavedChangesはfalse
      expect(result.current.hasUnsavedChanges).toBe(false);

      // 初回ロードフラグをクリア
      rerender();

      // triggerAutoSaveを呼び出し
      act(() => {
        result.current.triggerAutoSave();
      });

      // hasUnsavedChangesがtrueになる
      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('userがnullの場合、triggerAutoSaveは何もしない', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const { result, rerender } = renderHook(() =>
        useOrderDraftManagement({ ...defaultParams, user: null })
      );

      rerender();

      act(() => {
        result.current.triggerAutoSave();
      });

      vi.advanceTimersByTime(2000);

      expect(SessionStorageService.saveDraft).not.toHaveBeenCalled();
    });

    it('クリーンアップ時にタイマーがクリアされる', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

      const { result, rerender, unmount } = renderHook(() => useOrderDraftManagement(defaultParams));

      // 初回ロードフラグをクリア
      rerender();

      // triggerAutoSaveを呼び出し（タイマー開始）
      act(() => {
        result.current.triggerAutoSave();
      });

      // アンマウント
      unmount();

      // clearTimeoutが呼ばれたことを確認
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('ページ離脱警告', () => {
    it('hasUnsavedChanges=trueの場合、beforeunloadイベントがpreventされる', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const { result } = renderHook(() =>
        useOrderDraftManagement({
          ...defaultParams,
          user: null,
        })
      );

      // hasUnsavedChangesをtrueに設定
      act(() => {
        result.current.setHasUnsavedChanges(true);
      });

      // beforeunloadイベントを発火
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('hasUnsavedChanges=falseの場合、beforeunloadイベントはpreventされない', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      renderHook(() =>
        useOrderDraftManagement({
          ...defaultParams,
          user: null, // userをnullにしてhasUnsavedChangesをfalseに保つ
        })
      );

      // beforeunloadイベントを発火
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('アンマウント時にbeforeunloadイベントリスナーが削除される', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useOrderDraftManagement(defaultParams));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });
  });

  describe('setters', () => {
    it('setRestoreDialogOpenでrestoreDialogOpenを変更できる', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const { result } = renderHook(() =>
        useOrderDraftManagement({
          ...defaultParams,
          user: null,
        })
      );

      expect(result.current.restoreDialogOpen).toBe(false);

      act(() => {
        result.current.setRestoreDialogOpen(true);
      });

      expect(result.current.restoreDialogOpen).toBe(true);
    });

    it('setHasUnsavedChangesでhasUnsavedChangesを変更できる', () => {
      vi.mocked(SessionStorageService.loadDraft).mockReturnValue(null);

      const { result } = renderHook(() =>
        useOrderDraftManagement({
          ...defaultParams,
          user: null,
        })
      );

      expect(result.current.hasUnsavedChanges).toBe(false);

      act(() => {
        result.current.setHasUnsavedChanges(true);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });
});
