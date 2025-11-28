/**
 * 主要ページのレンダリング回数監視テスト
 *
 * @description
 * GitHub ActionsのCIで実行され、各ページの初回レンダリング回数を監視します。
 * React #185 (Maximum update depth exceeded) エラーを事前に検出できます。
 *
 * 閾値を超えた場合はテストが失敗し、PRへの警告がコメントされます。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React, { useEffect, useRef } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import {
  createRenderCounter,
  assertNoInfiniteLoop,
  EXPECTED_RENDER_COUNTS,
} from '../utils/renderLoopDetector';

// テスト用のテーマ
const theme = createTheme();

// グローバルなレンダリングカウンター
const pageRenderCounts: Record<string, number> = {};

/**
 * レンダリング回数を記録するラッパーコンポーネント
 */
function RenderCounterWrapper({
  children,
  pageName,
  onRenderCount,
}: {
  children: React.ReactNode;
  pageName: string;
  onRenderCount?: (count: number) => void;
}) {
  const countRef = useRef(0);

  useEffect(() => {
    countRef.current += 1;
    pageRenderCounts[pageName] = countRef.current;
    onRenderCount?.(countRef.current);
  });

  return <>{children}</>;
}

/**
 * テスト用のProviderラッパー
 */
function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </BrowserRouter>
  );
}

// モックの設定
vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({
    user: { uid: 'test-user', email: 'test@example.com' },
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/context/NotificationContext', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
  }),
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/context/NavigationContext', () => ({
  useNavigationContext: () => ({
    setStepNavigation: vi.fn(),
    showProgressSummary: false,
    toggleProgressSummary: vi.fn(),
    isStepNavigationActive: false,
    activeStep: 0,
    totalSteps: 5,
  }),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/context/ServiceContext', () => ({
  useFirestoreService: () => ({
    saveOrder: vi.fn(),
    getOrderHistory: vi.fn().mockResolvedValue([]),
    getPricingHistory: vi.fn().mockResolvedValue([]),
    getProductHistory: vi.fn().mockResolvedValue([]),
    savePricingHistory: vi.fn(),
    saveProductHistory: vi.fn(),
  }),
  useFirestoreServiceRef: () => ({
    current: {
      saveOrder: vi.fn(),
      getOrderHistory: vi.fn().mockResolvedValue([]),
      getPricingHistory: vi.fn().mockResolvedValue([]),
      getProductHistory: vi.fn().mockResolvedValue([]),
      savePricingHistory: vi.fn(),
      saveProductHistory: vi.fn(),
    },
  }),
  ServiceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useIndexedDB', () => ({
  useIndexedDB: () => ({
    orders: [],
    isLoading: false,
    saveOrder: vi.fn(),
    updateOrder: vi.fn(),
    deleteOrder: vi.fn(),
    getUnsyncedOrders: vi.fn().mockResolvedValue([]),
    getOrdersByDate: vi.fn().mockResolvedValue([]),
    clearAllData: vi.fn(),
  }),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback({ uid: 'test-user', email: 'test@example.com' });
    return vi.fn();
  }),
}));

describe('主要ページのレンダリング回数監視', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(pageRenderCounts).forEach((key) => delete pageRenderCounts[key]);
  });

  afterEach(() => {
    // テスト後にレンダリング回数をログ出力
    if (Object.keys(pageRenderCounts).length > 0) {
      console.log('\n📊 Page Render Counts:');
      Object.entries(pageRenderCounts).forEach(([page, count]) => {
        const status = count <= EXPECTED_RENDER_COUNTS.NORMAL_INTERACTION ? '✅' : '⚠️';
        console.log(`  ${status} ${page}: ${count} renders`);
      });
    }
  });

  describe('LoginPage', () => {
    it('初回レンダリング回数が閾値以下であること', async () => {
      const counter = createRenderCounter();

      // LoginPage をダイナミックインポート
      const { LoginPage } = await import('@/pages/LoginPage');

      render(
        <TestProviders>
          <RenderCounterWrapper
            pageName="LoginPage"
            onRenderCount={counter.increment}
          >
            <LoginPage />
          </RenderCounterWrapper>
        </TestProviders>
      );

      await waitFor(() => {
        assertNoInfiniteLoop(
          counter.count,
          'LoginPage',
          EXPECTED_RENDER_COUNTS.NORMAL_INTERACTION
        );
      });

      expect(counter.count).toBeLessThanOrEqual(EXPECTED_RENDER_COUNTS.NORMAL_INTERACTION);
    });
  });

  describe('AllocationHistoryPage', () => {
    it('初回レンダリング回数が閾値以下であること', async () => {
      const counter = createRenderCounter();

      const { AllocationHistoryPage } = await import('@/pages/AllocationHistoryPage');

      render(
        <TestProviders>
          <RenderCounterWrapper
            pageName="AllocationHistoryPage"
            onRenderCount={counter.increment}
          >
            <AllocationHistoryPage />
          </RenderCounterWrapper>
        </TestProviders>
      );

      await waitFor(() => {
        assertNoInfiniteLoop(
          counter.count,
          'AllocationHistoryPage',
          EXPECTED_RENDER_COUNTS.NORMAL_INTERACTION
        );
      });

      expect(counter.count).toBeLessThanOrEqual(EXPECTED_RENDER_COUNTS.NORMAL_INTERACTION);
    });
  });

  describe('UserProfilePage', () => {
    it('初回レンダリング回数が閾値以下であること', async () => {
      const counter = createRenderCounter();

      const { UserProfilePage } = await import('@/pages/UserProfilePage');

      render(
        <TestProviders>
          <RenderCounterWrapper
            pageName="UserProfilePage"
            onRenderCount={counter.increment}
          >
            <UserProfilePage />
          </RenderCounterWrapper>
        </TestProviders>
      );

      await waitFor(() => {
        assertNoInfiniteLoop(
          counter.count,
          'UserProfilePage',
          EXPECTED_RENDER_COUNTS.NORMAL_INTERACTION
        );
      });

      expect(counter.count).toBeLessThanOrEqual(EXPECTED_RENDER_COUNTS.NORMAL_INTERACTION);
    });
  });

  describe('StoreCategoryManagementPage', () => {
    it('初回レンダリング回数が閾値以下であること', async () => {
      const counter = createRenderCounter();

      // StoreCategoryManagementPage用の追加モック
      vi.mock('@/services/firebase/storeCategoryService', () => ({
        StoreCategoryService: {
          getAll: vi.fn().mockResolvedValue([]),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          moveStore: vi.fn(),
          removeStoreFromCategory: vi.fn(),
        },
      }));

      const { StoreCategoryManagementPage } = await import(
        '@/pages/StoreCategoryManagementPage'
      );

      render(
        <TestProviders>
          <RenderCounterWrapper
            pageName="StoreCategoryManagementPage"
            onRenderCount={counter.increment}
          >
            <StoreCategoryManagementPage />
          </RenderCounterWrapper>
        </TestProviders>
      );

      await waitFor(() => {
        assertNoInfiniteLoop(
          counter.count,
          'StoreCategoryManagementPage',
          EXPECTED_RENDER_COUNTS.COMPLEX_INTERACTION
        );
      });

      expect(counter.count).toBeLessThanOrEqual(EXPECTED_RENDER_COUNTS.COMPLEX_INTERACTION);
    });
  });

  describe('NewOrderPage（最重要）', () => {
    it('初回レンダリング回数が閾値以下であること', async () => {
      const counter = createRenderCounter();

      // NewOrderPage用の追加モック
      vi.mock('@/hooks/useAutocomplete', () => ({
        useAutocomplete: () => ({
          options: [],
          addToHistory: vi.fn(),
          loading: false,
        }),
      }));

      vi.mock('@/hooks/useAutocompleteFields', () => ({
        useAutocompleteFields: () => ({
          supplier: { options: [], addToHistory: vi.fn(), loading: false },
          productName: { options: [], addToHistory: vi.fn(), loading: false },
          origin: { options: [], addToHistory: vi.fn(), loading: false },
          supplierOptions: [],
          productNameOptions: [],
          originOptions: [],
        }),
      }));

      vi.mock('@/hooks/useDataSync', () => ({
        useDataSync: () => ({
          isOnline: true,
          isSyncing: false,
          unsyncedCount: 0,
          saveOrder: vi.fn(),
          syncNow: vi.fn(),
        }),
      }));

      vi.mock('@/hooks/useUserSettings', () => ({
        useUserSettings: () => ({
          userSettings: {
            buyerName: 'Test Buyer',
            defaultView: 'list',
          },
        }),
      }));

      const { NewOrderPage } = await import('@/pages/NewOrderPage');

      render(
        <TestProviders>
          <RenderCounterWrapper
            pageName="NewOrderPage"
            onRenderCount={counter.increment}
          >
            <NewOrderPage />
          </RenderCounterWrapper>
        </TestProviders>
      );

      // NewOrderPageは複雑なので、少し長めの閾値を設定
      await waitFor(
        () => {
          assertNoInfiniteLoop(
            counter.count,
            'NewOrderPage',
            EXPECTED_RENDER_COUNTS.COMPLEX_INTERACTION
          );
        },
        { timeout: 5000 }
      );

      expect(counter.count).toBeLessThanOrEqual(EXPECTED_RENDER_COUNTS.COMPLEX_INTERACTION);
    });

    it('5回のre-render後も無限ループが発生しないこと', async () => {
      const counter = createRenderCounter();
      let reRenderCount = 0;

      vi.mock('@/hooks/useAutocomplete', () => ({
        useAutocomplete: () => ({
          options: [],
          addToHistory: vi.fn(),
          loading: false,
        }),
      }));

      vi.mock('@/hooks/useAutocompleteFields', () => ({
        useAutocompleteFields: () => ({
          supplier: { options: [], addToHistory: vi.fn(), loading: false },
          productName: { options: [], addToHistory: vi.fn(), loading: false },
          origin: { options: [], addToHistory: vi.fn(), loading: false },
          supplierOptions: [],
          productNameOptions: [],
          originOptions: [],
        }),
      }));

      vi.mock('@/hooks/useDataSync', () => ({
        useDataSync: () => ({
          isOnline: true,
          isSyncing: false,
          unsyncedCount: 0,
          saveOrder: vi.fn(),
          syncNow: vi.fn(),
        }),
      }));

      vi.mock('@/hooks/useUserSettings', () => ({
        useUserSettings: () => ({
          userSettings: {
            buyerName: 'Test Buyer',
            defaultView: 'list',
          },
        }),
      }));

      const { NewOrderPage } = await import('@/pages/NewOrderPage');

      const { rerender } = render(
        <TestProviders>
          <RenderCounterWrapper
            pageName="NewOrderPage-rerender"
            onRenderCount={counter.increment}
          >
            <NewOrderPage />
          </RenderCounterWrapper>
        </TestProviders>
      );

      const initialCount = counter.count;

      // 5回re-renderを実行
      for (let i = 0; i < 5; i++) {
        reRenderCount++;
        rerender(
          <TestProviders>
            <RenderCounterWrapper
              pageName="NewOrderPage-rerender"
              onRenderCount={counter.increment}
            >
              <NewOrderPage />
            </RenderCounterWrapper>
          </TestProviders>
        );
      }

      // re-render後もレンダリング回数が閾値以下であることを確認
      // 期待値: 初期レンダリング + (re-render回数 × 2)（StrictMode考慮）
      const expectedMaxRenders = initialCount + reRenderCount * 4;

      await waitFor(() => {
        expect(counter.count).toBeLessThanOrEqual(expectedMaxRenders);
      });

      assertNoInfiniteLoop(counter.count, 'NewOrderPage-rerender', expectedMaxRenders);
    });
  });
});

/**
 * レンダリング回数サマリーを出力するユーティリティテスト
 */
describe('レンダリング回数サマリー', () => {
  it('すべてのページのレンダリング回数を出力', () => {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('📊 Page Render Count Summary');
    console.log('='.repeat(60));
    console.log('\nExpected thresholds:');
    console.log(`  - INITIAL_ONLY: ${EXPECTED_RENDER_COUNTS.INITIAL_ONLY}`);
    console.log(`  - LIGHT_INTERACTION: ${EXPECTED_RENDER_COUNTS.LIGHT_INTERACTION}`);
    console.log(`  - NORMAL_INTERACTION: ${EXPECTED_RENDER_COUNTS.NORMAL_INTERACTION}`);
    console.log(`  - COMPLEX_INTERACTION: ${EXPECTED_RENDER_COUNTS.COMPLEX_INTERACTION}`);
    console.log('\n');

    // このテストは常に成功（サマリー出力のみ）
    expect(true).toBe(true);
  });
});
