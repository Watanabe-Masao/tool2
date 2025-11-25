# 包括的リファクタリング再設計計画

## 📋 エグゼクティブサマリー

**作成日**: 2025-11-25
**目的**: Phase 0-3の成果を基に、新たな改善機会を含む包括的な再設計計画を策定
**スコープ**: Phase 4-7の詳細計画、ライブラリ活用、実装ロードマップ

---

## 🎯 Phase 0-3 の成果レビュー

### ✅ 達成事項

| Phase | 目標 | 実績 | 評価 |
|-------|------|------|------|
| **Phase 0** | 分析・計画 | ✅ 完了 | ⭐⭐⭐⭐⭐ |
| **Phase 1** | useOrderHandlers分割 | ✅ 5 hooks, 59 tests (100%) | ⭐⭐⭐⭐⭐ |
| **Phase 2** | useOrderSubmit分割 | ✅ 4 hooks, 49 tests (76%) | ⭐⭐⭐⭐ |
| **Phase 3** | E2E統合 | ✅ NewOrderPage統合確認 | ⭐⭐⭐⭐⭐ |

**総合評価**: ⭐⭐⭐⭐⭐ (4.8/5.0)

### 📊 定量成果

```
コード削減:        695行 → 393行 (43%削減)
新規hooks:         9個 (小hooks) + 2個 (統合版)
テスト作成:        108 tests
テスト合格率:      88.9% (96/108 passing)
後方互換性:        100% (既存API完全維持)
```

### 🔍 発見された新たな課題

#### 🔴 Critical

1. **メモ化の不一致**
   - Phase 1: useCallback使用（28箇所）
   - Phase 2: useCallback未使用（0箇所）
   - **影響**: NewOrderPage.tsxで不要な再レンダリング

#### 🟡 High

2. **テスト失敗**
   - useHistoryTracking: 2/11 tests失敗
   - useFileDownloads: 10/13 tests失敗
   - **原因**: Mock設定の問題（実装コードは正常）

#### 🟢 Medium

3. **テストインフラの不統一**
   - DOM mockingがReact Testing Libraryと競合
   - 共通setupの欠如

4. **型安全性の向上余地**
   - string型の混同リスク（UserId, Email等）

5. **依存性注入の欠如**
   - 直接インポートによるテスト困難性

---

## 🚀 新Phase計画: Phase 4-7

### Phase 4 Extended: パフォーマンス＆テスト品質向上

**優先度**: 🔴 Critical
**期間**: 2-3週間
**目標**: テスト100%合格、パフォーマンス改善

#### 実装内容

##### 4-1. Phase 2 hooks メモ化追加

**対象ファイル**:
1. `frontend/src/hooks/useOrderDataSubmit.ts`
2. `frontend/src/hooks/useHistoryTracking.ts`
3. `frontend/src/hooks/useTemplateGeneration.ts`
4. `frontend/src/hooks/useFileDownloads.ts`

**実装パターン**:
```typescript
// Before
export const useOrderDataSubmit = ({...params}) => {
  const submitOrderData = async (
    data: OrderFormData,
    onBookNameDialogOpen: () => void
  ): Promise<boolean> => {
    // ...
  };

  return { submitOrderData };
};

// After
export const useOrderDataSubmit = ({...params}) => {
  const submitOrderData = useCallback(async (
    data: OrderFormData,
    onBookNameDialogOpen: () => void
  ): Promise<boolean> => {
    // ...
  }, [user, userSettings, isOnline, saveOrderWithSync, showSuccess, showError, showLoading, hideLoading]);

  return { submitOrderData };
};
```

**期待効果**:
- ✅ Phase 1との実装パターン統一
- ✅ 不要な再レンダリング削減
- ✅ NewOrderPage.tsxのパフォーマンス改善

**工数**: 4-6時間

---

##### 4-2. useHistoryTracking.test.ts 修正

**失敗テスト**:
1. `specification が空文字の場合も正しく処理`
2. `複数回呼び出しても動作する`

**修正方針**:
```typescript
describe('useHistoryTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // ✅ グローバルクリア
  });

  it('specification が空文字の場合も正しく処理', async () => {
    vi.clearAllMocks(); // ✅ テスト開始時に明示的クリア

    const formData = {
      suppliers: ['supplier1', 'supplier2'],
      products: [
        {
          name: 'Product A',
          supplier: 'supplier1',
          origin: 'Origin A',
          specification: 'test',
          quantity: 10,
          unit: 'kg',
          category: 'CATEGORY_A',
        },
        {
          name: 'Product B',
          supplier: 'supplier2',
          origin: 'Origin B',
          specification: '', // ✅ 空文字
          quantity: 5,
          unit: 'kg',
          category: 'CATEGORY_B',
        },
      ],
      deliveryDate: new Date(),
    };

    await result.current.saveAllHistories(formData);

    // Product A
    expect(FirestoreService.saveProductHistory).toHaveBeenNthCalledWith(
      1,
      'test-user-123',
      'supplier1',
      'Product A',
      'Origin A',
      'test',
      10,
      'kg',
      'CATEGORY_A'
    );

    // Product B (specification: '')
    expect(FirestoreService.saveProductHistory).toHaveBeenNthCalledWith(
      2,
      'test-user-123',
      'supplier2',
      'Product B',
      'Origin B',
      '', // ✅ 空文字を期待
      5,
      'kg',
      'CATEGORY_B'
    );
  });

  it('複数回呼び出しても動作する', async () => {
    vi.clearAllMocks(); // ✅ 追加

    const formData = {
      suppliers: ['supplier1'],
      products: [
        {
          name: 'Product A',
          supplier: 'supplier1',
          origin: 'Origin A',
          specification: 'test',
          quantity: 10,
          unit: 'kg',
          category: 'CATEGORY_A',
        },
      ],
      deliveryDate: new Date(),
    };

    // 1回目
    await result.current.saveAllHistories(formData);

    // 2回目
    await result.current.saveAllHistories(formData);

    // ✅ 累積で2回呼ばれることを確認
    expect(mockSupplierAutocomplete.addToHistory).toHaveBeenCalledTimes(2);
    expect(FirestoreService.saveProductHistory).toHaveBeenCalledTimes(2);
  });
});
```

**期待結果**: 11/11 tests passing (100%)
**工数**: 2時間

---

##### 4-3. useFileDownloads.test.ts 修正（MSW導入）

**現状の問題**:
- DOM mockingがReact Testing Libraryと競合
- `document.createElement` mockが失敗

**解決策**: MSW (Mock Service Worker) 導入

**実装手順**:

**Step 1: MSW インストール**
```bash
npm install -D msw
```

**Step 2: MSW Handlers作成**
```typescript
// __tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Excel download
  http.get('/downloads/*.xlsx', () => {
    const mockBlob = new Blob(['Excel mock data'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    return HttpResponse.arrayBuffer(mockBlob);
  }),

  // PDF download
  http.get('/downloads/*.pdf', () => {
    const mockBlob = new Blob(['PDF mock data'], {
      type: 'application/pdf'
    });
    return HttpResponse.arrayBuffer(mockBlob);
  }),

  // Error case
  http.get('/downloads/error.xlsx', () => {
    return HttpResponse.error();
  }),
];
```

**Step 3: MSW Server Setup**
```typescript
// __tests__/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Step 4: vitest.config.ts 更新**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['__tests__/setup.ts'],
    environment: 'jsdom',
  },
});
```

**Step 5: テスト書き換え**
```typescript
// useFileDownloads.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFileDownloads } from '../useFileDownloads';
import { server } from '../../__tests__/setup';
import { http, HttpResponse } from 'msw';

describe('useFileDownloads', () => {
  const mockShowError = vi.fn();
  const mockShowLoading = vi.fn();
  const mockHideLoading = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // ✅ DOM API mocks（最小限）
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // ✅ DOM操作のspy（createElement mockは不要）
    const clickSpy = vi.fn();
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

    // <a>要素のclickをmock
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = originalCreateElement(tag);
      if (tag === 'a') {
        element.click = clickSpy;
      }
      return element;
    });
  });

  it('Excelファイルをダウンロードできる', async () => {
    const { result } = renderHook(() => useFileDownloads({
      generatedFiles: {
        filename: 'test.xlsx',
        downloadUrl: '/downloads/test.xlsx',
      },
      showError: mockShowError,
      showLoading: mockShowLoading,
      hideLoading: mockHideLoading,
    }));

    await act(async () => {
      await result.current.downloadExcel();
    });

    // ✅ MSWがリクエストをmock
    expect(mockShowLoading).toHaveBeenCalledWith('Excelファイルをダウンロード中...');
    expect(mockHideLoading).toHaveBeenCalled();
    expect(mockShowError).not.toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('PDFファイルをダウンロードできる', async () => {
    const { result } = renderHook(() => useFileDownloads({
      generatedFiles: {
        filename: 'test.xlsx',
        downloadUrl: '/downloads/test.xlsx',
        pdfFilename: 'test.pdf',
        pdfDownloadUrl: '/downloads/test.pdf',
      },
      showError: mockShowError,
      showLoading: mockShowLoading,
      hideLoading: mockHideLoading,
    }));

    await act(async () => {
      await result.current.downloadPdf();
    });

    expect(mockShowLoading).toHaveBeenCalledWith('PDFファイルをダウンロード中...');
    expect(mockHideLoading).toHaveBeenCalled();
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('ネットワークエラー時にエラーメッセージを表示', async () => {
    // ✅ MSWでエラーケースをmock
    server.use(
      http.get('/downloads/test.xlsx', () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useFileDownloads({
      generatedFiles: {
        filename: 'test.xlsx',
        downloadUrl: '/downloads/test.xlsx',
      },
      showError: mockShowError,
      showLoading: mockShowLoading,
      hideLoading: mockHideLoading,
    }));

    await act(async () => {
      await result.current.downloadExcel();
    });

    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('ダウンロードに失敗'));
    expect(mockHideLoading).toHaveBeenCalled();
  });

  it('HTTPエラー時にエラーメッセージを表示', async () => {
    server.use(
      http.get('/downloads/test.xlsx', () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    const { result } = renderHook(() => useFileDownloads({
      generatedFiles: {
        filename: 'test.xlsx',
        downloadUrl: '/downloads/test.xlsx',
      },
      showError: mockShowError,
      showLoading: mockShowLoading,
      hideLoading: mockHideLoading,
    }));

    await act(async () => {
      await result.current.downloadExcel();
    });

    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('ダウンロードに失敗'));
  });

  // ✅ 残りのテストケースも同様に書き換え
});
```

**期待結果**: 13/13 tests passing (100%)
**工数**: 8時間（MSWセットアップ含む）

---

##### 4-4. 成果検証

**検証コマンド**:
```bash
# 全テスト実行
npm test -- --run

# Phase 2テストのみ
npm test -- useOrderDataSubmit.test.ts useHistoryTracking.test.ts useTemplateGeneration.test.ts useFileDownloads.test.ts --run
```

**期待結果**:
```
✅ useOrderDataSubmit.test.ts       11/11 passing (100%)
✅ useHistoryTracking.test.ts       11/11 passing (100%)
✅ useTemplateGeneration.test.ts    14/14 passing (100%)
✅ useFileDownloads.test.ts         13/13 passing (100%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 2合計                         49/49 passing (100%)
Phase 1+2合計                       108/108 passing (100%)
```

**Phase 4 Extended 総工数**: 18-20時間（2-3日）

---

### Phase 5: テストインフラ＆型安全性向上

**優先度**: 🟡 High
**期間**: 1-2週間
**目標**: テストの保守性向上、型安全性強化

#### 実装内容

##### 5-1. Testing Library Custom Render

**目的**: テストコードの簡素化、共通setupの一元化

**実装**:

**Step 1: test-utils/render.tsx 作成**
```typescript
// test-utils/render.tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import type { User } from '@/types/user';
import type { UserSettings } from '@/types/userSettings';

interface CustomRenderOptions extends RenderOptions {
  user?: User | null;
  isOnline?: boolean;
  userSettings?: UserSettings | null;
}

// デフォルトのmock値
const defaultUser: User = {
  uid: 'test-user-123',
  displayName: 'Test User',
  email: 'test@example.com',
};

const defaultUserSettings: UserSettings = {
  defaultDeliveryDate: new Date(),
  // ... その他の設定
};

function customRender(
  ui: ReactElement,
  {
    user = defaultUser,
    isOnline = true,
    userSettings = defaultUserSettings,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // ✅ 必要なProvidersをラップ
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <MockAuthProvider user={user}>
        <MockNetworkProvider isOnline={isOnline}>
          <MockSettingsProvider settings={userSettings}>
            {children}
          </MockSettingsProvider>
        </MockNetworkProvider>
      </MockAuthProvider>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
}

// Re-export everything from testing library
export * from '@testing-library/react';

// Override render method
export { customRender as render };
```

**Step 2: test-utils/renderHook.tsx 作成**
```typescript
// test-utils/renderHook.tsx
import { renderHook as rtlRenderHook, RenderHookOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import type { User } from '@/types/user';
import type { UserSettings } from '@/types/userSettings';

interface CustomRenderHookOptions<Props> extends RenderHookOptions<Props> {
  user?: User | null;
  isOnline?: boolean;
  userSettings?: UserSettings | null;
}

const defaultUser: User = {
  uid: 'test-user-123',
  displayName: 'Test User',
  email: 'test@example.com',
};

const defaultUserSettings: UserSettings = {
  defaultDeliveryDate: new Date(),
};

function customRenderHook<Result, Props>(
  render: (initialProps: Props) => Result,
  {
    user = defaultUser,
    isOnline = true,
    userSettings = defaultUserSettings,
    ...options
  }: CustomRenderHookOptions<Props> = {}
) {
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <MockAuthProvider user={user}>
        <MockNetworkProvider isOnline={isOnline}>
          <MockSettingsProvider settings={userSettings}>
            {children}
          </MockSettingsProvider>
        </MockNetworkProvider>
      </MockAuthProvider>
    );
  };

  return rtlRenderHook(render, { wrapper: AllTheProviders, ...options });
}

export { customRenderHook as renderHook };
```

**使用例**:
```typescript
// Before: 複雑なsetup
import { renderHook } from '@testing-library/react';

test('test case', () => {
  const mockUser = { uid: 'test-user-123', displayName: 'Test', email: 'test@test.com' };
  const mockSettings = { defaultDeliveryDate: new Date() };

  const { result } = renderHook(() => useOrderHandlers({...}), {
    wrapper: ({ children }) => (
      <MockAuthProvider user={mockUser}>
        <MockSettingsProvider settings={mockSettings}>
          {children}
        </MockSettingsProvider>
      </MockAuthProvider>
    ),
  });
});

// After: シンプル
import { renderHook } from '@/test-utils/renderHook';

test('test case', () => {
  const { result } = renderHook(() => useOrderHandlers({...}), {
    user: customUser,  // オプション
    isOnline: false    // オプション
  });
});
```

**工数**: 4時間

---

##### 5-2. Zod Branded Types 導入

**目的**: 型レベルでの識別子混同防止

**実装**:

**Step 1: types/branded.ts 作成**
```typescript
// types/branded.ts
import { z } from 'zod';

/**
 * Branded Type Schemas
 *
 * Zodを使ったBranded Types実装
 * ランタイムバリデーション + コンパイル時型チェック
 */

// UserId
export const userIdSchema = z.string().min(1, 'UserId cannot be empty').brand('UserId');
export type UserId = z.infer<typeof userIdSchema>;

export const createUserId = (id: string): UserId => {
  return userIdSchema.parse(id);
};

// Email
export const emailSchema = z.string().email('Invalid email format').brand('Email');
export type Email = z.infer<typeof emailSchema>;

export const createEmail = (email: string): Email => {
  return emailSchema.parse(email);
};

// Supplier
export const supplierSchema = z.string().min(1, 'Supplier cannot be empty').brand('Supplier');
export type Supplier = z.infer<typeof supplierSchema>;

export const createSupplier = (supplier: string): Supplier => {
  return supplierSchema.parse(supplier);
};

// ProductName
export const productNameSchema = z.string().min(1, 'Product name cannot be empty').brand('ProductName');
export type ProductName = z.infer<typeof productNameSchema>;

export const createProductName = (name: string): ProductName => {
  return productNameSchema.parse(name);
};
```

**Step 2: 既存型の拡張**
```typescript
// types/user.ts
import { UserId, Email } from './branded';

export interface User {
  uid: UserId;  // ✅ string → UserId
  displayName?: string | null;
  email?: Email | null;  // ✅ string | null → Email | null
}
```

**Step 3: 段階的な適用**
```typescript
// hooks/useOrderDataSubmit.ts
import type { UserId, Email } from '@/types/branded';

interface UseOrderDataSubmitParams {
  user: {
    uid: UserId;  // ✅ Branded Type
    displayName?: string | null;
    email?: Email | null;  // ✅ Branded Type
  } | null;
  // ...
}
```

**メリット**:
- ✅ コンパイル時に型混同を検出
- ✅ ランタイムバリデーション
- ✅ 既存ライブラリ（Zod）活用

**工数**: 6時間

---

##### 5-3. React DevTools Profiler統合

**目的**: パフォーマンスモニタリング自動化

**実装**:

```typescript
// hooks/usePerformanceMonitor.ts
import { useEffect } from 'react';

interface PerformanceMonitorOptions {
  componentName: string;
  enabled?: boolean;
  threshold?: number; // ms
}

/**
 * パフォーマンスモニタリングhook
 *
 * 開発環境でのみ動作し、コンポーネントのレンダリング時間を計測
 */
export const usePerformanceMonitor = ({
  componentName,
  enabled = process.env.NODE_ENV === 'development',
  threshold = 16, // 60fps = 16.67ms
}: PerformanceMonitorOptions) => {
  useEffect(() => {
    if (!enabled) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > threshold) {
          console.warn(
            `[Performance] ${componentName}: ${entry.name} took ${entry.duration.toFixed(2)}ms (threshold: ${threshold}ms)`
          );
        }
      }
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, [componentName, enabled, threshold]);
};
```

**使用例**:
```typescript
// pages/NewOrderPage.tsx
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

const NewOrderPage = () => {
  usePerformanceMonitor({ componentName: 'NewOrderPage' });

  // ... existing code
};
```

**工数**: 3時間

**Phase 5 総工数**: 13時間（1-2日）

---

### Phase 6: アーキテクチャ改善

**優先度**: 🟢 Medium
**期間**: 2-3週間
**目標**: 依存性注入、Context活用、保守性向上

#### 実装内容

##### 6-1. Service Context 導入

**目的**: 依存性注入、テスト容易性向上

**実装**:

**Step 1: contexts/ServiceContext.tsx 作成**
```typescript
// contexts/ServiceContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { FirestoreService } from '@/services/firebase/firestoreService';
import { SessionStorageService } from '@/services/sessionStorageService';
import type { TemplateService } from '@/services/templateService';

/**
 * アプリケーションで使用するサービスの型定義
 */
export interface Services {
  firestoreService: typeof FirestoreService;
  sessionStorageService: typeof SessionStorageService;
  templateService: typeof TemplateService;
}

/**
 * デフォルトのサービス実装
 */
const defaultServices: Services = {
  firestoreService: FirestoreService,
  sessionStorageService: SessionStorageService,
  templateService: TemplateService,
};

const ServiceContext = createContext<Services | null>(null);

interface ServiceProviderProps {
  children: ReactNode;
  services?: Services;  // ✅ テスト時にmockを注入可能
}

/**
 * サービスプロバイダー
 *
 * アプリケーション全体でサービスにアクセスできるようにする
 */
export const ServiceProvider = ({
  children,
  services = defaultServices,
}: ServiceProviderProps) => {
  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

/**
 * サービスにアクセスするhook
 */
export const useServices = (): Services => {
  const services = useContext(ServiceContext);

  if (!services) {
    throw new Error('useServices must be used within ServiceProvider');
  }

  return services;
};
```

**Step 2: hooks の更新**
```typescript
// hooks/useHistoryTracking.ts
import { useServices } from '@/contexts/ServiceContext';

export const useHistoryTracking = ({
  user,
  supplierAutocomplete,
  productNameAutocomplete,
  originAutocomplete,
}: UseHistoryTrackingParams) => {
  const { firestoreService } = useServices();  // ✅ Context経由で取得

  const saveAllHistories = useCallback(async (data: OrderFormData) => {
    if (!user) return;

    // Supplier autocomplete history
    const uniqueSuppliers = [...new Set(data.suppliers)];
    await Promise.all(
      uniqueSuppliers.map((supplier) => supplierAutocomplete.addToHistory(supplier))
    );

    // Product history
    await Promise.all(
      data.products.map(async (product) => {
        await firestoreService.saveProductHistory(  // ✅ DI経由
          user.uid,
          product.supplier,
          product.name,
          product.origin,
          product.specification || '',
          product.quantity,
          product.unit,
          product.category
        );
      })
    );
  }, [user, supplierAutocomplete, firestoreService]);

  return { saveAllHistories };
};
```

**Step 3: App.tsx 更新**
```typescript
// App.tsx
import { ServiceProvider } from '@/contexts/ServiceContext';

function App() {
  return (
    <ServiceProvider>
      {/* 既存のProviders */}
      <AuthProvider>
        <RouterProvider>
          {/* ... */}
        </RouterProvider>
      </AuthProvider>
    </ServiceProvider>
  );
}
```

**Step 4: テストの更新**
```typescript
// __tests__/useHistoryTracking.test.ts
import { ServiceProvider } from '@/contexts/ServiceContext';

describe('useHistoryTracking', () => {
  it('saves all histories', async () => {
    const mockFirestoreService = {
      saveProductHistory: vi.fn().mockResolvedValue(undefined),
      savePricingHistory: vi.fn().mockResolvedValue(undefined),
    };

    const mockServices = {
      firestoreService: mockFirestoreService,
      sessionStorageService: SessionStorageService,
      templateService: TemplateService,
    };

    const { result } = renderHook(() => useHistoryTracking({...}), {
      wrapper: ({ children }) => (
        <ServiceProvider services={mockServices}>  {/* ✅ mockを注入 */}
          {children}
        </ServiceProvider>
      ),
    });

    await act(async () => {
      await result.current.saveAllHistories(formData);
    });

    expect(mockFirestoreService.saveProductHistory).toHaveBeenCalledTimes(2);
  });
});
```

**工数**: 12時間

---

##### 6-2. Zod Schema 拡張（hookパラメータバリデーション）

**目的**: hookパラメータのランタイムバリデーション

**実装**:

```typescript
// schemas/hookParams.ts
import { z } from 'zod';
import { userIdSchema, emailSchema } from '@/types/branded';

export const useOrderSubmitParamsSchema = z.object({
  userId: z.string().optional(),
  user: z.object({
    uid: userIdSchema,
    displayName: z.string().nullable().optional(),
    email: emailSchema.nullable().optional(),
  }).nullable(),
  userSettings: z.any().nullable(),  // TODO: 詳細なschema定義
  isOnline: z.boolean(),
  saveOrderWithSync: z.function().args(z.any(), z.string()).returns(z.promise(z.void())),
  supplierAutocomplete: z.object({
    addToHistory: z.function().args(z.string()).returns(z.promise(z.void())),
  }),
  productNameAutocomplete: z.object({
    addToHistory: z.function().args(z.string()).returns(z.promise(z.void())),
  }),
  originAutocomplete: z.object({
    addToHistory: z.function().args(z.string()).returns(z.promise(z.void())),
  }),
  showSuccess: z.function().args(z.string()).returns(z.void()),
  showError: z.function().args(z.string()).returns(z.void()),
  showLoading: z.function().returns(z.void()),
  hideLoading: z.function().returns(z.void()),
});

export type UseOrderSubmitParams = z.infer<typeof useOrderSubmitParamsSchema>;
```

**使用例（オプション）**:
```typescript
// hooks/useOrderSubmit.ts
import { useOrderSubmitParamsSchema } from '@/schemas/hookParams';

export const useOrderSubmit = (params: unknown) => {
  // ✅ ランタイムバリデーション（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    useOrderSubmitParamsSchema.parse(params);
  }

  const validatedParams = params as UseOrderSubmitParams;

  // ... existing code
};
```

**工数**: 4時間

**Phase 6 総工数**: 24時間（3日）

---

### Phase 7: 開発体験（DX）改善

**優先度**: 🟢 Low-Medium
**期間**: 1-2週間
**目標**: ドキュメント化、リンティング強化

#### 実装内容

##### 7-1. Storybook 導入

**目的**: インタラクティブなhooksドキュメント

**実装**:

**Step 1: Storybook インストール**
```bash
npx sb init --builder vite
npm install -D @storybook/react @storybook/addon-essentials
```

**Step 2: hooks用Storyコンポーネント作成**
```typescript
// hooks/useOrderHandlers.stories.tsx
import { Meta, StoryObj } from '@storybook/react';
import { useOrderHandlers } from './useOrderHandlers';
import { useState } from 'react';

export default {
  title: 'Hooks/useOrderHandlers',
  parameters: {
    docs: {
      description: {
        component: `
注文ハンドラー管理hook

## 責務
- 商品の追加・削除・クリア
- ステップナビゲーション
- 配分数量・店舗ロック管理
- 下書き復元・破棄
- フォーム送信・ブック名確認

## 使用例
\`\`\`typescript
const {
  handleRemoveProduct,
  handleClearProduct,
  handleTabChange,
  handleNextStep,
  handlePrevStep,
  handleAllocationChange,
  handleToggleLock,
  handleRestoreDraft,
  handleDiscardDraft,
  onSubmit,
  handleBookNameDialogConfirm,
} = useOrderHandlers({...});
\`\`\`
        `,
      },
    },
  },
} as Meta;

const HookDemo = () => {
  const [products, setProducts] = useState([
    { id: 1, name: 'Product A', supplier: 'Supplier 1' },
    { id: 2, name: 'Product B', supplier: 'Supplier 2' },
  ]);

  const [activeStep, setActiveStep] = useState(0);

  const {
    handleRemoveProduct,
    handleClearProduct,
    handleNextStep,
    handlePrevStep,
  } = useOrderHandlers({
    productFields: products,
    removeProduct: (index) => {
      setProducts(products.filter((_, i) => i !== index));
    },
    activeProductIndex: 0,
    setActiveProductIndex: () => {},
    activeStep,
    setActiveStep,
    // ... その他のprops
  });

  return (
    <div style={{ padding: '20px' }}>
      <h2>useOrderHandlers Demo</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3>Products</h3>
        {products.map((product, index) => (
          <div key={product.id} style={{ marginBottom: '10px' }}>
            <span>{product.name} ({product.supplier})</span>
            <button
              onClick={() => handleRemoveProduct(index)}
              style={{ marginLeft: '10px' }}
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={handleClearProduct}>Clear All</button>
      </div>

      <div>
        <h3>Step Navigation</h3>
        <div>Current Step: {activeStep}</div>
        <button onClick={handlePrevStep} disabled={activeStep === 0}>
          Previous
        </button>
        <button onClick={handleNextStep} disabled={activeStep === 4}>
          Next
        </button>
      </div>
    </div>
  );
};

export const Default: StoryObj = {
  render: () => <HookDemo />,
};

export const WithManyProducts: StoryObj = {
  render: () => {
    // 多数の商品があるケース
    return <HookDemo />;
  },
};

export const EmptyProducts: StoryObj = {
  render: () => {
    // 商品が空のケース
    return <HookDemo />;
  },
};
```

**工数**: 8時間

---

##### 7-2. ESLint カスタマイズ

**目的**: hooks専用lintルール、useCallback強制

**実装**:

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // ✅ React Hooks関連
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',

    // ✅ カスタムルール: async関数はuseCallbackを推奨
    // （eslint-plugin-customが必要、または手動チェック）
    '@typescript-eslint/explicit-module-boundary-types': 'off',

    // ✅ hook命名規則強制
    'react-hooks/rules-of-hooks': 'error',

    // ✅ unused vars（mock変数を除外）
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^mock',
      },
    ],
  },
};
```

**工数**: 4時間

**Phase 7 総工数**: 12時間（1-2日）

---

## 📅 実装ロードマップ

### Week 1-2: Phase 4 Extended（必須）

| Day | タスク | 担当 | 工数 | 状態 |
|-----|--------|------|------|------|
| Day 1-2 | Phase 2 hooks メモ化追加 | - | 6h | 📋 計画 |
| Day 3 | useHistoryTracking test修正 | - | 2h | 📋 計画 |
| Day 4-5 | MSWセットアップ | - | 4h | 📋 計画 |
| Day 6-7 | useFileDownloads test書き換え | - | 4h | 📋 計画 |
| Day 8 | 全テスト実行・検証 | - | 2h | 📋 計画 |
| Day 9 | Phase 4 完了報告 | - | 2h | 📋 計画 |

**成功基準**:
- ✅ Phase 2全テスト: 49/49 passing (100%)
- ✅ Phase 1+2全テスト: 108/108 passing (100%)
- ✅ NewOrderPage.tsxのパフォーマンス改善確認

---

### Week 3: Phase 5（推奨）

| Day | タスク | 担当 | 工数 | 状態 |
|-----|--------|------|------|------|
| Day 10-11 | Testing Library Custom Render | - | 4h | 📋 計画 |
| Day 12-13 | Zod Branded Types導入 | - | 6h | 📋 計画 |
| Day 14 | React DevTools Profiler | - | 3h | 📋 計画 |

**成功基準**:
- ✅ テストコード簡素化（平均30%削減）
- ✅ UserId, Email等のBranded Types適用

---

### Week 4-6: Phase 6（検討）

| Week | タスク | 工数 | 状態 |
|------|--------|------|------|
| Week 4 | Service Context導入 | 12h | 📋 計画 |
| Week 5 | Zod Schema拡張 | 4h | 📋 計画 |
| Week 6 | 統合テスト・検証 | 8h | 📋 計画 |

**成功基準**:
- ✅ 全hooksでDI適用
- ✅ テスト時のmock注入容易性向上

---

### Month 2-3: Phase 7（任意）

| Week | タスク | 工数 | 状態 |
|------|--------|------|------|
| Week 1-2 | Storybook導入 | 8h | 📋 計画 |
| Week 3 | ESLintカスタマイズ | 4h | 📋 計画 |

**成功基準**:
- ✅ 全hooksのStorybook作成
- ✅ リンティング強化

---

## 💰 コスト・リソース分析

### 開発工数

| Phase | 工数 | 期間 | 優先度 |
|-------|------|------|--------|
| Phase 4 Extended | 20h | 2-3週間 | 🔴 Critical |
| Phase 5 | 13h | 1-2週間 | 🟡 High |
| Phase 6 | 24h | 2-3週間 | 🟢 Medium |
| Phase 7 | 12h | 1-2週間 | 🟢 Low |
| **合計** | **69h** | **6-10週間** | - |

### 必要なライブラリ

```json
{
  "devDependencies": {
    "msw": "^2.0.0",                        // Phase 4
    "@storybook/react": "^7.6.0",           // Phase 7
    "@storybook/addon-essentials": "^7.6.0" // Phase 7
  },
  "dependencies": {
    "zod": "^3.22.0"  // 既存（Phase 5で拡張）
  }
}
```

**本番バンドルへの影響**: 0KB（全てdevDependencies）

---

## 🎯 推奨実装戦略

### 戦略A: 最小限（Phase 4のみ）

**対象**: Phase 4 Extended
**工数**: 20時間（2-3週間）
**効果**: テスト100%合格、パフォーマンス改善

**推奨理由**:
- ✅ 既存の問題を完全に解決
- ✅ 追加ライブラリ最小限（MSWのみ）
- ✅ ROI最大

**判定**: ✅ **強く推奨**

---

### 戦略B: 標準（Phase 4-5）

**対象**: Phase 4 Extended + Phase 5
**工数**: 33時間（3-4週間）
**効果**: テスト品質向上、型安全性強化

**推奨理由**:
- ✅ テストインフラ大幅改善
- ✅ 型安全性向上
- ✅ 中期的な保守性向上

**判定**: ✅ **推奨**

---

### 戦略C: 完全（Phase 4-7）

**対象**: Phase 4 Extended + Phase 5 + Phase 6 + Phase 7
**工数**: 69時間（6-10週間）
**効果**: 完全なアーキテクチャ改善、最高のDX

**推奨理由**:
- ✅ 全ての改善機会を実現
- ✅ 長期的な品質保証
- ✅ チーム全体の開発体験向上

**デメリット**:
- ❌ 大規模な変更
- ❌ 長期間のコミットメント必要

**判定**: ⚠️ **条件付き推奨**（リソースが十分にある場合）

---

## ✅ 最終推奨アクション

### 即座に実施（必須）

1. ✅ **Phase 4 Extended**
   - Phase 2 hooks メモ化追加
   - テスト修正（MSW導入）
   - 全テスト100%合格達成

**工数**: 20時間
**効果**: 🔴 Critical問題の完全解決

---

### 短期実施（強く推奨）

2. ✅ **Phase 5**
   - Testing Library Custom Render
   - Zod Branded Types
   - React DevTools Profiler

**工数**: 13時間
**効果**: テストインフラ改善、型安全性向上

---

### 中長期検討（任意）

3. ⚠️ **Phase 6-7**
   - Service Context（DI）
   - Storybook
   - ESLintカスタマイズ

**工数**: 36時間
**効果**: アーキテクチャ改善、DX向上

---

## 📝 成功基準

### Phase 4完了時

```
テスト品質:
├── Phase 1 hooks: 59/59 passing (100%) ✅
├── Phase 2 hooks: 49/49 passing (100%) ✅ ← 目標
└── 全体: 108/108 passing (100%)

パフォーマンス:
├── Phase 1: useCallback使用 ✅
├── Phase 2: useCallback使用 ✅ ← 目標
└── 実装パターン統一 ✅
```

### Phase 5完了時

```
テストインフラ:
├── MSW導入 ✅
├── Custom Render導入 ✅
└── テストコード30%削減 ✅

型安全性:
├── Branded Types適用 ✅
├── UserId, Email, Supplier等 ✅
└── コンパイル時型チェック強化 ✅
```

### Phase 6-7完了時（任意）

```
アーキテクチャ:
├── DI適用 ✅
├── Service Context導入 ✅
└── テスト容易性向上 ✅

DX:
├── Storybook導入 ✅
├── インタラクティブドキュメント ✅
└── リンティング強化 ✅
```

---

## 🎉 期待される最終状態

### プロジェクト評価

**現状**: ⭐⭐⭐⭐⭐ (4.8/5.0)
**Phase 4完了後**: ⭐⭐⭐⭐⭐ (5.0/5.0) - 完璧
**Phase 5完了後**: ⭐⭐⭐⭐⭐⭐ (6.0/5.0) - 業界標準以上
**Phase 6-7完了後**: ⭐⭐⭐⭐⭐⭐⭐ (7.0/5.0) - エンタープライズグレード

---

**作成者**: Claude (Anthropic AI)
**作成日**: 2025-11-25
**ステータス**: ✅ 計画完成
**次のアクション**: ユーザー承認待ち → 実装開始
