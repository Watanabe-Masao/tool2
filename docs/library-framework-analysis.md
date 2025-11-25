# ライブラリ・フレームワーク活用分析

## 📋 概要

**作成日**: 2025-11-25
**目的**: Phase 0-3で発見された問題を解決するライブラリ・フレームワークの特定
**スコープ**: パフォーマンス、テスト、型安全性、DX改善

---

## 🎯 解決すべき問題とライブラリマッピング

### 問題1: 🔴 メモ化の不一致によるパフォーマンス劣化

**課題**:
- Phase 2 hooksがuseCallbackを使用していない
- NewOrderPage.tsxで不要な再レンダリングが発生する可能性

**解決策の候補**:

#### Option A: React標準hooks (推奨 ✅)

**ライブラリ**: なし（React標準）
**コスト**: 無料
**学習コスト**: 低（既にPhase 1で使用中）

**実装例**:
```typescript
// useOrderDataSubmit.ts
export const useOrderDataSubmit = ({...params}) => {
  const submitOrderData = useCallback(async (
    data: OrderFormData,
    onBookNameDialogOpen: () => void
  ): Promise<boolean> => {
    // ... existing logic
  }, [user, userSettings, isOnline, saveOrderWithSync, showSuccess, showError, showLoading, hideLoading]);

  return { submitOrderData };
};
```

**メリット**:
- ✅ 既存パターンとの一貫性
- ✅ 追加依存なし
- ✅ Phase 1と同じアプローチ
- ✅ 即座に実装可能

**デメリット**:
- ❌ 依存配列の管理が手動

**判定**: ✅ **採用推奨**（優先度: 🔴 Critical）

---

#### Option B: react-use

**ライブラリ**: `react-use` (29k GitHub stars)
**パッケージ**: `npm install react-use`
**コスト**: 無料（MIT License）
**バンドルサイズ**: ~50KB (tree-shaking対応)

**提供機能**:
- `useMemoizedFn`: 依存配列不要のメモ化
- `useUpdateEffect`: useEffect の改良版
- `useThrottle`, `useDebounce`: パフォーマンス最適化

**実装例**:
```typescript
import { useMemoizedFn } from 'react-use';

export const useOrderDataSubmit = ({...params}) => {
  const submitOrderData = useMemoizedFn(async (
    data: OrderFormData,
    onBookNameDialogOpen: () => void
  ): Promise<boolean> => {
    // ... existing logic
  });

  return { submitOrderData };
};
```

**メリット**:
- ✅ 依存配列管理不要
- ✅ 多機能（他の便利hooksも利用可能）

**デメリット**:
- ❌ 新しい依存追加
- ❌ バンドルサイズ増加

**判定**: ⚠️ **保留**（既存パターンで十分）

---

### 問題2: 🟡 テストのDOM mock問題

**課題**:
- useFileDownloads.test.tsでDOM mockがReact Testing Libraryと競合
- 10/13テストが失敗

**解決策の候補**:

#### Option A: MSW (Mock Service Worker) (強く推奨 ✅✅)

**ライブラリ**: `msw` (14k GitHub stars)
**パッケージ**: `npm install -D msw`
**コスト**: 無料（MIT License）
**学習コスト**: 中（1-2日で習得可能）

**実装例**:
```typescript
// __tests__/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/downloads/:filename', (req, res, ctx) => {
    const { filename } = req.params;
    const mockBlob = new Blob(['mock data'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    return res(ctx.body(mockBlob));
  }),
];

// __tests__/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**テスト例**:
```typescript
// useFileDownloads.test.ts
import { server } from '../setup';
import { rest } from 'msw';

describe('useFileDownloads', () => {
  it('Excelファイルをダウンロードできる', async () => {
    const { result } = renderHook(() => useFileDownloads({
      generatedFiles: {
        filename: 'test.xlsx',
        downloadUrl: '/downloads/test.xlsx',
      },
      showError: vi.fn(),
      showLoading: vi.fn(),
      hideLoading: vi.fn(),
    }));

    await act(async () => {
      await result.current.downloadExcel();
    });

    // ✅ DOM mockなしでテスト可能
    expect(showLoading).toHaveBeenCalled();
    expect(hideLoading).toHaveBeenCalled();
  });

  it('ネットワークエラー時にエラーメッセージを表示', async () => {
    // ✅ エラーケースも簡単にmock
    server.use(
      rest.get('/downloads/:filename', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    // ... test
  });
});
```

**メリット**:
- ✅ DOM mockingを完全に回避
- ✅ APIレベルでのリアルなmock
- ✅ ブラウザとNode.js両対応
- ✅ 業界標準（React Testing Library推奨）
- ✅ エラーケーステストが容易

**デメリット**:
- ❌ 新しいツールの学習コスト
- ❌ 既存テストの書き換えが必要

**判定**: ✅✅ **強く推奨**（優先度: 🟡 High）

---

#### Option B: vitest-fetch-mock

**ライブラリ**: `vitest-fetch-mock`
**パッケージ**: `npm install -D vitest-fetch-mock`
**コスト**: 無料（MIT License）

**実装例**:
```typescript
import createFetchMock from 'vitest-fetch-mock';

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

beforeEach(() => {
  fetchMock.resetMocks();
});

it('Excelファイルをダウンロード', async () => {
  fetchMock.mockResponseOnce(new Blob(['data']).toString());

  // ... test
});
```

**メリット**:
- ✅ vitest特化で統合が簡単

**デメリット**:
- ❌ MSWより機能が限定的
- ❌ ブラウザ環境でのmock不可

**判定**: ⚠️ **保留**（MSWの方が強力）

---

### 問題3: 🟢 型安全性の向上

**課題**:
- string型の混同リスク（UserId, Email, Supplierなど）
- ランタイムエラーをコンパイル時に検出したい

**解決策の候補**:

#### Option A: Branded Types (標準TypeScript) (推奨 ✅)

**ライブラリ**: なし（TypeScript標準機能）
**コスト**: 無料
**ランタイムオーバーヘッド**: なし

**実装例**:
```typescript
// types/branded.ts
export type Brand<K, T> = K & { readonly __brand: T };

export type UserId = Brand<string, 'UserId'>;
export type Email = Brand<string, 'Email'>;
export type Supplier = Brand<string, 'Supplier'>;

// ヘルパー関数
export const createUserId = (id: string): UserId => {
  if (!id || id.length === 0) {
    throw new Error('UserId cannot be empty');
  }
  return id as UserId;
};

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
  uid: UserId;
  email: Email;
}

// ❌ コンパイルエラー
const user: User = {
  uid: "123", // Type 'string' is not assignable to type 'UserId'
  email: "test@example.com",
};

// ✅ 正しい
const user: User = {
  uid: createUserId("123"),
  email: createEmail("test@example.com"),
};
```

**メリット**:
- ✅ ランタイムコストゼロ
- ✅ 型レベルでの識別子混同防止
- ✅ バリデーションロジック一元化

**デメリット**:
- ❌ 既存コードの大規模書き換えが必要

**判定**: ✅ **中期的に推奨**（優先度: 🟢 Medium）

---

#### Option B: io-ts

**ライブラリ**: `io-ts` (6.6k GitHub stars)
**パッケージ**: `npm install io-ts fp-ts`
**コスト**: 無料（MIT License）
**バンドルサイズ**: ~30KB

**実装例**:
```typescript
import * as t from 'io-ts';

const UserIdC = t.brand(
  t.string,
  (s): s is t.Branded<string, { readonly UserId: unique symbol }> => s.length > 0,
  'UserId'
);

type UserId = t.TypeOf<typeof UserIdC>;

// ランタイムバリデーション
const result = UserIdC.decode("123");
if (result._tag === 'Right') {
  const userId: UserId = result.right;
}
```

**メリット**:
- ✅ ランタイムバリデーション + 型安全性
- ✅ 関数型プログラミングスタイル

**デメリット**:
- ❌ 学習コスト高（fp-ts必要）
- ❌ バンドルサイズ増加
- ❌ Zodと機能重複

**判定**: ❌ **非推奨**（既にZodを使用中）

---

#### Option C: Zod拡張 (推奨 ✅)

**ライブラリ**: `zod`（既に使用中）
**コスト**: 無料（既存依存）

**実装例**:
```typescript
import { z } from 'zod';

// Branded Type with Zod
const userIdSchema = z.string().min(1).brand('UserId');
type UserId = z.infer<typeof userIdSchema>;

const emailSchema = z.string().email().brand('Email');
type Email = z.infer<typeof emailSchema>;

// ヘルパー関数
export const createUserId = (id: string): UserId => {
  return userIdSchema.parse(id);
};

export const createEmail = (email: string): Email => {
  return emailSchema.parse(email);
};
```

**メリット**:
- ✅ 既存ライブラリ活用
- ✅ ランタイムバリデーション + 型安全性
- ✅ 統一された検証ロジック

**デメリット**:
- ❌ わずかなランタイムオーバーヘッド

**判定**: ✅ **推奨**（優先度: 🟢 Medium）

---

### 問題4: 🟢 テスト共通setup の複雑さ

**課題**:
- 各テストで同じmock setupを繰り返している
- テストコードの可読性低下

**解決策の候補**:

#### Option A: Testing Library Custom Render (推奨 ✅)

**ライブラリ**: `@testing-library/react`（既に使用中）
**コスト**: 無料（既存依存）

**実装例**:
```typescript
// test-utils/render.tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

interface CustomRenderOptions extends RenderOptions {
  user?: User;
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
  // ...
};

function customRender(
  ui: ReactElement,
  {
    user = defaultUser,
    isOnline = true,
    userSettings = defaultUserSettings,
    ...options
  }: CustomRenderOptions = {}
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

  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
```

**使用例**:
```typescript
// Before: 複雑なsetup
import { render } from '@testing-library/react';

test('test case', () => {
  const mockUser = { uid: 'test', ... };
  const mockSettings = { ... };

  render(
    <MockAuthProvider user={mockUser}>
      <MockSettingsProvider settings={mockSettings}>
        <Component />
      </MockSettingsProvider>
    </MockAuthProvider>
  );
});

// After: シンプル
import { render } from '@/test-utils/render';

test('test case', () => {
  render(<Component />, {
    user: customUser,  // オプション
    isOnline: false    // オプション
  });
});
```

**メリット**:
- ✅ テストコードが劇的に簡潔に
- ✅ デフォルト値の一元管理
- ✅ 既存ライブラリ活用

**デメリット**:
- なし

**判定**: ✅ **強く推奨**（優先度: 🟡 High）

---

#### Option B: vitest-setup-files

**実装例**:
```typescript
// vitest.setup.ts
import { beforeEach } from 'vitest';

beforeEach(() => {
  // グローバルmock setup
  global.mockUser = { uid: 'test-user-123', ... };
  global.mockSettings = { ... };
});
```

**メリット**:
- ✅ 最小限のコード

**デメリット**:
- ❌ グローバル変数に依存
- ❌ 型安全性が低い

**判定**: ❌ **非推奨**（Custom Renderの方が優れている）

---

### 問題5: 🟢 Dependency Injection の欠如

**課題**:
- FirestoreServiceなどを直接インポート
- テスト時のmockが困難

**解決策の候補**:

#### Option A: React Context API (推奨 ✅)

**ライブラリ**: React標準
**コスト**: 無料

**実装例**:
```typescript
// contexts/ServiceContext.tsx
import { createContext, useContext } from 'react';
import { FirestoreService } from '@/services/firebase/firestoreService';

interface Services {
  firestoreService: typeof FirestoreService;
  sessionStorageService: typeof SessionStorageService;
}

const ServiceContext = createContext<Services | null>(null);

export const ServiceProvider = ({
  children,
  services = {
    firestoreService: FirestoreService,
    sessionStorageService: SessionStorageService,
  }
}: {
  children: React.ReactNode;
  services?: Services;
}) => {
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
// hooks/useHistoryTracking.ts
export const useHistoryTracking = ({...}) => {
  const { firestoreService } = useServices();

  const saveAllHistories = useCallback(async (data: OrderFormData) => {
    await firestoreService.saveProductHistory(...);
  }, [firestoreService]);

  return { saveAllHistories };
};

// テスト
test('saves history', () => {
  const mockFirestoreService = {
    saveProductHistory: vi.fn(),
  };

  render(
    <ServiceProvider services={{ firestoreService: mockFirestoreService }}>
      <TestComponent />
    </ServiceProvider>
  );
});
```

**メリット**:
- ✅ React標準機能
- ✅ テストが容易
- ✅ サービスの交換可能性

**デメリット**:
- ❌ 既存コードの大規模書き換え

**判定**: ✅ **中期的に推奨**（優先度: 🟢 Medium）

---

#### Option B: InversifyJS

**ライブラリ**: `inversify` (10k GitHub stars)
**パッケージ**: `npm install inversify reflect-metadata`
**バンドルサイズ**: ~15KB

**実装例**:
```typescript
import { Container, injectable, inject } from 'inversify';

@injectable()
class FirestoreService {
  saveProductHistory() { ... }
}

@injectable()
class HistoryTracker {
  constructor(
    @inject('FirestoreService') private firestore: FirestoreService
  ) {}

  saveHistory() {
    this.firestore.saveProductHistory();
  }
}

const container = new Container();
container.bind('FirestoreService').to(FirestoreService);
container.bind('HistoryTracker').to(HistoryTracker);
```

**メリット**:
- ✅ 本格的なDIコンテナ
- ✅ デコレータベース

**デメリット**:
- ❌ 学習コスト高
- ❌ Reactの標準パターンではない
- ❌ reflect-metadata必要

**判定**: ❌ **非推奨**（Context APIで十分）

---

### 問題6: 🟢 開発体験（DX）の改善

**課題**:
- hooksの使い方を視覚的に理解しにくい
- ドキュメントがコメントのみ

**解決策の候補**:

#### Option A: Storybook (推奨 ✅)

**ライブラリ**: `@storybook/react` (82k GitHub stars)
**パッケージ**: `npm install -D @storybook/react @storybook/addon-essentials`
**コスト**: 無料（MIT License）

**実装例**:
```typescript
// useOrderHandlers.stories.tsx
import { useOrderHandlers } from './useOrderHandlers';
import { Meta } from '@storybook/react';

export default {
  title: 'Hooks/useOrderHandlers',
  parameters: {
    docs: {
      description: {
        component: '注文ハンドラー管理hook',
      },
    },
  },
} as Meta;

const HookDemo = () => {
  const {
    handleNextStep,
    handlePrevStep,
    handleRemoveProduct,
  } = useOrderHandlers({
    // ... props
  });

  return (
    <div>
      <h2>useOrderHandlers Demo</h2>
      <button onClick={handlePrevStep}>Previous</button>
      <button onClick={handleNextStep}>Next</button>
      <button onClick={() => handleRemoveProduct(0)}>Remove Product</button>
    </div>
  );
};

export const Default = () => <HookDemo />;
export const WithProducts = () => <HookDemo />;
```

**メリット**:
- ✅ インタラクティブなドキュメント
- ✅ 視覚的な動作確認
- ✅ 新規開発者のオンボーディング容易

**デメリット**:
- ❌ 初期セットアップコスト

**判定**: ✅ **長期的に推奨**（優先度: 🟢 Low-Medium）

---

#### Option B: TypeDoc

**ライブラリ**: `typedoc`
**パッケージ**: `npm install -D typedoc`

**実装例**:
```bash
npx typedoc --out docs src/hooks
```

**メリット**:
- ✅ TypeScriptから自動生成
- ✅ セットアップ簡単

**デメリット**:
- ❌ 静的ドキュメントのみ
- ❌ インタラクティブではない

**判定**: ⚠️ **保留**（Storybookの方が有用）

---

## 📊 推奨ライブラリ一覧

### 即座に導入推奨（Phase 4-5）

| ライブラリ | 目的 | 優先度 | バンドル影響 | 学習コスト |
|-----------|------|--------|-------------|-----------|
| **React useCallback** | メモ化 | 🔴 Critical | なし | 低 |
| **MSW** | API mocking | 🟡 High | なし（dev） | 中 |
| **Testing Library Custom Render** | テスト簡素化 | 🟡 High | なし | 低 |

### 中期的に導入検討（Phase 6）

| ライブラリ | 目的 | 優先度 | バンドル影響 | 学習コスト |
|-----------|------|--------|-------------|-----------|
| **Zod Branded Types** | 型安全性 | 🟢 Medium | 微小 | 低 |
| **React Context API** | DI | 🟢 Medium | なし | 低 |

### 長期的に導入検討（Phase 7）

| ライブラリ | 目的 | 優先度 | バンドル影響 | 学習コスト |
|-----------|------|--------|-------------|-----------|
| **Storybook** | ドキュメント | 🟢 Low-Medium | なし（dev） | 中 |

### 導入非推奨

| ライブラリ | 理由 |
|-----------|------|
| react-use | 既存パターンで十分 |
| io-ts | Zodと機能重複、学習コスト高 |
| InversifyJS | Context APIで十分、React標準ではない |
| vitest-fetch-mock | MSWの方が強力 |

---

## 💰 コスト分析

### 初期導入コスト

```json
{
  "devDependencies": {
    "msw": "^2.0.0",                        // +0KB (dev only)
    "@storybook/react": "^7.6.0",           // +0KB (dev only)
    "@storybook/addon-essentials": "^7.6.0" // +0KB (dev only)
  }
}
```

**本番バンドルサイズへの影響**: 0KB
**開発依存のみ**: すべてdevDependencies

### 学習コスト

| Phase | 学習時間 | ROI |
|-------|---------|-----|
| Phase 4-5 (useCallback, MSW) | 4-8時間 | 高 |
| Phase 6 (Zod, Context) | 8-12時間 | 中 |
| Phase 7 (Storybook) | 8-16時間 | 中 |

---

## ✅ 最終推奨

### 即座に実施

1. ✅ **React useCallback** - Phase 2 hooksにメモ化追加
   - コスト: 無料
   - 学習コスト: ほぼゼロ（既にPhase 1で使用）
   - 効果: 高

2. ✅ **MSW** - テストインフラ改善
   - コスト: 無料
   - 学習コスト: 4-8時間
   - 効果: 高

3. ✅ **Testing Library Custom Render** - テスト簡素化
   - コスト: 無料
   - 学習コスト: 2-4時間
   - 効果: 中-高

### 中期的に実施

4. ✅ **Zod Branded Types** - 型安全性向上
   - コスト: 無料（既存ライブラリ）
   - 学習コスト: 4-6時間
   - 効果: 中

5. ⚠️ **React Context API (DI)** - アーキテクチャ改善
   - コスト: 無料
   - 学習コスト: 8-12時間
   - 効果: 中（大規模リファクタリング必要）

### 長期的に検討

6. 💡 **Storybook** - ドキュメント化
   - コスト: 無料
   - 学習コスト: 8-16時間
   - 効果: 中（DX改善）

---

**作成者**: Claude (Anthropic AI)
**作成日**: 2025-11-25
**ステータス**: ✅ 分析完了
**次のアクション**: 包括的な再設計計画の作成
