# Phase 0 (v2): 深層分析と拡張改善計画

## 📋 概要

**実施日**: 2025-11-25
**目的**: Phase 0-3完了後の深層分析により、元の計画になかった改善機会を特定
**スコープ**: パフォーマンス、テスト、型安全性、アーキテクチャ、ライブラリ活用

---

## 🔍 発見された新たな問題点

### 🔴 Critical: Phase 1とPhase 2の実装パターン不一致

#### 問題1: メモ化の不一致

**Phase 1実装**:
```typescript
// ✅ useProductActions.ts
const handleRemoveProduct = useCallback((index: number) => {
  if (productFields.length <= 1) return;
  removeProduct(index);
  // ...
}, [productFields.length, removeProduct, activeProductIndex, setActiveProductIndex]);
```

**Phase 2実装**:
```typescript
// ❌ useOrderDataSubmit.ts - useCallbackなし
const submitOrderData = async (
  data: OrderFormData,
  onBookNameDialogOpen: () => void
): Promise<boolean> => {
  try {
    // ...
  } catch (error) {
    // ...
  }
};
```

**影響**:
- Phase 2のhooksを使うコンポーネントで不要な再レンダリングが発生
- `useOrderSubmit`を使う`NewOrderPage.tsx`のパフォーマンス劣化の可能性

**重大度**: 🔴 High

---

### 🟡 Medium: テストインフラの一貫性欠如

#### 問題2: モック戦略の不統一

**現状**:
```typescript
// Phase 1テスト: vi.fn()を使用
const mockSetValue = vi.fn();

// Phase 2テスト: 同じくvi.fn()だがDOM mockで問題発生
vi.spyOn(document, 'createElement').mockImplementation(...);
```

**発見**:
- DOM mockingがReact Testing Libraryと競合
- API mockingに統一的な戦略がない

**解決策の候補**:
1. **MSW (Mock Service Worker)** - API mockingの業界標準
2. **Testing Library utilities** - より宣言的なテスト

---

### 🟢 Low: 型安全性の向上余地

#### 問題3: 型推論の弱さ

**現状**:
```typescript
interface UseOrderDataSubmitParams {
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
  } | null;
  // ...
}
```

**改善可能性**:
```typescript
// Branded Types for type safety
type UserId = string & { readonly __brand: 'UserId' };
type Email = string & { readonly __brand: 'Email' };

interface User {
  uid: UserId;
  displayName?: string | null;
  email?: Email | null;
}
```

---

## 💡 新たな改善機会

### 1. パフォーマンス最適化（Phase 4 拡張）

#### 1-1. Phase 2 hooksのメモ化追加

**対象**:
- `useOrderDataSubmit`: submitOrderData
- `useHistoryTracking`: saveAllHistories
- `useTemplateGeneration`: generateTemplate
- `useFileDownloads`: downloadFile, downloadExcel, downloadPdf

**期待効果**:
- 不要な再レンダリング削減
- メモリ使用量削減
- NewOrderPage.tsxのパフォーマンス改善

**実装例**:
```typescript
// useOrderDataSubmit.ts - 修正版
export const useOrderDataSubmit = ({
  user,
  userSettings,
  isOnline,
  saveOrderWithSync,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
}: UseOrderDataSubmitParams) => {
  const submitOrderData = useCallback(async (
    data: OrderFormData,
    onBookNameDialogOpen: () => void
  ): Promise<boolean> => {
    try {
      // ... existing code
    } catch (error) {
      // ... existing code
    }
  }, [
    user,
    userSettings,
    isOnline,
    saveOrderWithSync,
    showSuccess,
    showError,
    showLoading,
    hideLoading,
  ]); // ✅ 依存配列を明示

  return { submitOrderData };
};
```

**優先度**: 🔴 High

---

#### 1-2. React DevTools Profiler統合

**提案**: パフォーマンスモニタリングの自動化

```typescript
// hooks/usePerformanceMonitor.ts (新規)
import { useEffect } from 'react';

export const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`[${componentName}] ${entry.name}: ${entry.duration}ms`);
        }
      });

      observer.observe({ entryTypes: ['measure'] });

      return () => observer.disconnect();
    }
  }, [componentName]);
};
```

**使用例**:
```typescript
const NewOrderPage = () => {
  usePerformanceMonitor('NewOrderPage');
  // ...
};
```

---

### 2. テストインフラ改善（Phase 4 拡張）

#### 2-1. MSW (Mock Service Worker) 導入

**現状の問題**:
```typescript
// ❌ 現在: fetch mockが散在
global.fetch = vi.fn().mockResolvedValue({...});
```

**MSW導入後**:
```typescript
// ✅ MSW: 宣言的なAPI mocking
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/template/generate', (req, res, ctx) => {
    return res(ctx.json({
      filename: 'test.xlsx',
      download_url: '/downloads/test.xlsx',
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**メリット**:
- ✅ APIリクエストを実際のHTTPレベルでmock
- ✅ ブラウザとNode.js両対応
- ✅ テストが実環境に近い
- ✅ DOM mockingの問題を回避

**パッケージ**:
```bash
npm install -D msw
```

**優先度**: 🟡 Medium-High

---

#### 2-2. Testing Library拡張

**提案**: カスタムレンダラーで共通setup

```typescript
// test-utils/render.tsx (新規)
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

interface CustomRenderOptions extends RenderOptions {
  user?: User;
  isOnline?: boolean;
}

function customRender(
  ui: ReactElement,
  {
    user = mockUser,
    isOnline = true,
    ...options
  }: CustomRenderOptions = {}
) {
  return render(
    <MockProviders user={user} isOnline={isOnline}>
      {ui}
    </MockProviders>,
    options
  );
}

export * from '@testing-library/react';
export { customRender as render };
```

**使用例**:
```typescript
import { render } from '@/test-utils/render';

test('renders correctly', () => {
  render(<NewOrderPage />, { user: testUser, isOnline: false });
  // ...
});
```

---

### 3. 型安全性の向上（Phase 5）

#### 3-1. Branded Types導入

**提案**: ランタイムエラーをコンパイル時に検出

```typescript
// types/branded.ts (新規)
export type Brand<K, T> = K & { __brand: T };

export type UserId = Brand<string, 'UserId'>;
export type Email = Brand<string, 'Email'>;
export type Supplier = Brand<string, 'Supplier'>;

// ヘルパー関数
export const createUserId = (id: string): UserId => id as UserId;
export const createEmail = (email: string): Email => {
  if (!email.includes('@')) {
    throw new Error('Invalid email format');
  }
  return email as Email;
};
```

**使用例**:
```typescript
interface User {
  uid: UserId;  // ✅ string型だが、UserId専用
  email: Email; // ✅ string型だが、Email専用
}

// ✅ コンパイルエラー: 型不一致
const user: User = {
  uid: "123", // Error: Type 'string' is not assignable to type 'UserId'
  email: "test@example.com", // Error
};

// ✅ 正しい使用法
const user: User = {
  uid: createUserId("123"),
  email: createEmail("test@example.com"),
};
```

**メリット**:
- ✅ 型レベルでの識別子混同防止
- ✅ ランタイムオーバーヘッドなし
- ✅ バリデーションロジックの一元化

**優先度**: 🟢 Medium

---

#### 3-2. Zod活用の拡張

**現状**: orderSchemaで使用中

**拡張提案**: hookのパラメータバリデーション

```typescript
// schemas/hookParams.ts (新規)
import { z } from 'zod';

export const useOrderSubmitParamsSchema = z.object({
  userId: z.string().optional(),
  user: z.object({
    uid: z.string().min(1),
    displayName: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
  }).nullable(),
  userSettings: z.any().nullable(), // UserSettings型を詳細に定義
  isOnline: z.boolean(),
  // ...
});

export type UseOrderSubmitParams = z.infer<typeof useOrderSubmitParamsSchema>;
```

**使用例**:
```typescript
export const useOrderSubmit = (params: unknown) => {
  // ✅ ランタイムバリデーション
  const validatedParams = useOrderSubmitParamsSchema.parse(params);

  // ...
};
```

---

### 4. アーキテクチャ改善（Phase 6）

#### 4-1. Dependency Injection パターン

**現状の問題**:
```typescript
// ❌ 直接インポート - テストしにくい
import { FirestoreService } from '@/services/firebase/firestoreService';

const saveAllHistories = async (data: OrderFormData) => {
  await FirestoreService.saveProductHistory(...); // 直接呼び出し
};
```

**改善案**:
```typescript
// ✅ DI - テストしやすい
interface HistoryService {
  saveProductHistory: (...) => Promise<void>;
  savePricingHistory: (...) => Promise<void>;
}

interface UseHistoryTrackingParams {
  user: User | null;
  supplierAutocomplete: {...};
  historyService: HistoryService; // ✅ 注入
}

export const useHistoryTracking = ({
  user,
  supplierAutocomplete,
  historyService, // ✅ 依存性を外部から注入
}: UseHistoryTrackingParams) => {
  const saveAllHistories = async (data: OrderFormData) => {
    await historyService.saveProductHistory(...);
  };
};
```

**テスト**:
```typescript
test('saves history', () => {
  const mockHistoryService = {
    saveProductHistory: vi.fn(),
    savePricingHistory: vi.fn(),
  };

  const { result } = renderHook(() => useHistoryTracking({
    historyService: mockHistoryService, // ✅ mockを注入
  }));

  // ... test
});
```

**優先度**: 🟢 Low-Medium

---

#### 4-2. Context API活用

**提案**: 共通依存性をContextで提供

```typescript
// contexts/ServiceContext.tsx (新規)
import { createContext, useContext } from 'react';

interface Services {
  firestoreService: typeof FirestoreService;
  templateService: typeof TemplateService;
  sessionStorageService: typeof SessionStorageService;
}

const ServiceContext = createContext<Services | null>(null);

export const ServiceProvider = ({ children }: { children: React.ReactNode }) => {
  const services: Services = {
    firestoreService: FirestoreService,
    templateService: TemplateService,
    sessionStorageService: SessionStorageService,
  };

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

export const useServices = () => {
  const services = useContext(ServiceContext);
  if (!services) {
    throw new Error('useServices must be used within ServiceProvider');
  }
  return services;
};
```

**使用例**:
```typescript
export const useHistoryTracking = ({...}) => {
  const { firestoreService } = useServices(); // ✅ Context経由

  const saveAllHistories = async (data: OrderFormData) => {
    await firestoreService.saveProductHistory(...);
  };
};
```

---

### 5. 開発体験改善（Phase 7）

#### 5-1. Storybook導入

**目的**: hookの視覚的ドキュメント化

```bash
npm install -D @storybook/react @storybook/addon-essentials
```

**例**:
```typescript
// useOrderHandlers.stories.tsx
import { useOrderHandlers } from './useOrderHandlers';

export default {
  title: 'Hooks/useOrderHandlers',
  component: HookDemo,
};

const HookDemo = () => {
  const handlers = useOrderHandlers({...});

  return (
    <div>
      <button onClick={() => handlers.handleNextStep()}>
        Next Step
      </button>
      {/* ... */}
    </div>
  );
};

export const Default = () => <HookDemo />;
```

**優先度**: 🟢 Low

---

#### 5-2. ESLint Pluginカスタマイズ

**提案**: hooks専用のlintルール

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // ✅ useCallbackの強制
    'react-hooks/exhaustive-deps': 'error',

    // ✅ カスタムルール: async関数はuseCallbackを使用
    'custom/async-functions-need-callback': 'error',

    // ✅ hook命名規則
    'react-hooks/rules-of-hooks': 'error',
  },
};
```

---

## 📊 優先度マトリクス

### 🔴 Phase 4 拡張: パフォーマンス＆テスト品質（優先度: Critical）

| タスク | 難易度 | 工数 | 効果 | 優先度 |
|--------|--------|------|------|--------|
| Phase 2 hooksメモ化追加 | 低 | 4-6h | 高 | 🔴 1 |
| useHistoryTracking test修正 | 低 | 2h | 中 | 🔴 2 |
| useFileDownloads test修正 | 中 | 4h | 中 | 🔴 3 |
| MSW導入 | 中 | 8h | 高 | 🟡 4 |

**合計工数**: 18-20時間（2-3日）

### 🟡 Phase 5: 型安全性＆テストインフラ（優先度: High）

| タスク | 難易度 | 工数 | 効果 | 優先度 |
|--------|--------|------|------|--------|
| Testing Library拡張 | 低 | 4h | 中 | 🟡 5 |
| Branded Types導入 | 中 | 6h | 中 | 🟡 6 |
| React DevTools Profiler | 低 | 3h | 低 | 🟡 7 |

**合計工数**: 13時間（1-2日）

### 🟢 Phase 6: アーキテクチャ改善（優先度: Medium）

| タスク | 難易度 | 工数 | 効果 | 優先度 |
|--------|--------|------|------|--------|
| Dependency Injection | 高 | 12h | 高 | 🟢 8 |
| Context API活用 | 中 | 8h | 中 | 🟢 9 |
| Zod拡張 | 低 | 4h | 低 | 🟢 10 |

**合計工数**: 24時間（3日）

### 🟢 Phase 7: 開発体験（優先度: Low）

| タスク | 難易度 | 工数 | 効果 | 優先度 |
|--------|--------|------|------|--------|
| Storybook導入 | 中 | 8h | 低 | 🟢 11 |
| ESLint カスタマイズ | 低 | 4h | 中 | 🟢 12 |

**合計工数**: 12時間（1-2日）

---

## 🎯 推奨実装順序

### 即座に実施（Phase 4拡張）

**Week 1-2**:
1. ✅ Phase 2 hooksメモ化追加（6h）
2. ✅ useHistoryTracking test修正（2h）
3. ✅ useFileDownloads test修正（4h）

**成果**: テスト100%合格、パフォーマンス改善

### 短期実施（Phase 5）

**Week 3**:
4. ✅ MSW導入（8h）
5. ✅ Testing Library拡張（4h）

**成果**: テストインフラ改善

### 中期検討（Phase 6）

**Month 2**:
6. Dependency Injection（12h）
7. Branded Types導入（6h）

**成果**: アーキテクチャ改善、型安全性向上

### 長期検討（Phase 7）

**Month 3+**:
8. Storybook導入（8h）
9. ESLint カスタマイズ（4h）

**成果**: 開発体験向上

---

## 📦 必要なライブラリ/フレームワーク

### 追加推奨パッケージ

```json
{
  "devDependencies": {
    "msw": "^2.0.0",                    // API mocking
    "@storybook/react": "^7.6.0",      // Component documentation
    "@storybook/addon-essentials": "^7.6.0",
    "eslint-plugin-custom": "^1.0.0"   // カスタムルール
  },
  "dependencies": {
    // 既存パッケージで対応可能
  }
}
```

**合計コスト**: 開発依存関係のみ、本番バンドルサイズへの影響なし

---

## ✅ 最終推奨アクション

### 必須実施（Phase 4拡張）

1. ✅ **Phase 2 hooksメモ化追加** - パフォーマンス改善
2. ✅ **テスト修正** - 100%合格率達成

### 強く推奨（Phase 5）

3. ✅ **MSW導入** - テストインフラ改善
4. ✅ **Testing Library拡張** - テスト可読性向上

### 検討推奨（Phase 6-7）

5. ⚠️ **Dependency Injection** - アーキテクチャ改善（大規模変更）
6. 💡 **Storybook** - ドキュメント化（任意）

---

**作成者**: Claude (Anthropic AI)
**作成日**: 2025-11-25
**ステータス**: ✅ 分析完了
**次のアクション**: Phase 4拡張計画の承認待ち
