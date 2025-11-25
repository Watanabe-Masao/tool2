# 依存性注入 (DI) パターン使用ガイド

**Phase 6 で導入された Service Context による依存性注入パターンの使用方法**

---

## 📚 目次

1. [概要](#概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [基本的な使い方](#基本的な使い方)
4. [テストでの使い方](#テストでの使い方)
5. [新しいサービスの追加](#新しいサービスの追加)
6. [ベストプラクティス](#ベストプラクティス)
7. [トラブルシューティング](#トラブルシューティング)

---

## 概要

### 依存性注入 (DI) とは？

依存性注入は、オブジェクトが必要とする依存関係を外部から「注入」するデザインパターンです。これにより:

- ✅ **テスタビリティの向上**: テスト時にモック実装を簡単に注入可能
- ✅ **疎結合**: コンポーネントが具体的な実装に依存しない
- ✅ **保守性の向上**: 実装変更が他のコードに影響しにくい
- ✅ **拡張性**: 新しい実装への切り替えが容易

### Phase 6 で実装した DI パターン

React Context API を使用した Service Context パターンを実装しました。

```typescript
// 本番環境での使用
<ServiceProvider>
  <App />
</ServiceProvider>

// テスト環境での使用
<ServiceProvider services={{ firestoreService: mockService }}>
  <ComponentUnderTest />
</ServiceProvider>
```

---

## アーキテクチャ

### コンポーネント構成

```
┌─────────────────────────────────────────┐
│           ServiceProvider               │
│  (Service Context を提供)               │
└─────────────────┬───────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────▼─────┐     ┌────▼──────┐
    │ Service  │     │ Service   │
    │ Hooks    │     │ Instances │
    └────┬─────┘     └───────────┘
         │
    ┌────▼────────────────────┐
    │ Component / Hook        │
    │ (firestoreService使用)  │
    └─────────────────────────┘
```

### ファイル構成

```
frontend/
├── src/
│   ├── context/
│   │   └── ServiceContext.tsx         # DI の中核
│   ├── services/
│   │   ├── firebase/
│   │   │   └── firestoreService.ts    # Firestore 実装
│   │   ├── api/
│   │   │   └── templateService.ts     # Template API 実装
│   │   └── ...
│   ├── utils/
│   │   └── sessionStorageService.ts   # SessionStorage 実装
│   └── hooks/
│       ├── useHistoryTracking.ts      # DI 対応済み ✅
│       ├── useTemplateGeneration.ts   # DI 対応済み ✅
│       └── ...
└── ...
```

---

## 基本的な使い方

### 1. App.tsx でのセットアップ

`ServiceProvider` をアプリケーションのルートに配置します。

```tsx
// src/App.tsx
import { ServiceProvider } from './context/ServiceContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <ServiceProvider>  {/* ← ここに追加 */}
            <NavigationProvider>
              <AppContent />
            </NavigationProvider>
          </ServiceProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};
```

### 2. フックでのサービス利用

#### パターン A: 個別サービスフックを使用（推奨）

```typescript
// src/hooks/useMyFeature.ts
import { useFirestoreService } from '@/context/ServiceContext';

export const useMyFeature = (userId: string) => {
  // Service Context から Firestore Service を取得
  const firestoreService = useFirestoreService();

  const saveData = async (data: MyData) => {
    // サービスメソッドを呼び出し
    await firestoreService.saveProductHistory(
      userId,
      data.supplier,
      data.name,
      // ...
    );
  };

  return { saveData };
};
```

#### パターン B: useServices で複数サービスを取得

```typescript
import { useServices } from '@/context/ServiceContext';

export const useComplexFeature = () => {
  // 複数のサービスを一度に取得
  const { firestoreService, templateService } = useServices();

  const processAndSave = async (data: FormData) => {
    // 複数のサービスを使用
    const template = await templateService.generateTemplate(data);
    await firestoreService.saveProductHistory(/* ... */);
  };

  return { processAndSave };
};
```

### 3. 利用可能なサービス

| サービス | フック | 用途 |
|---------|--------|------|
| `IFirestoreService` | `useFirestoreService()` | Firestore データベース操作 |
| `ITemplateService` | `useTemplateService()` | Excel/PDF テンプレート生成 |
| `ISessionStorageService` | `useSessionStorageService()` | セッションストレージ管理 |

---

## テストでの使い方

### テストにおける DI の威力

DI パターンの最大の利点は、**テスト時にモック実装を簡単に注入できる**ことです。

### パターン A: ServiceProvider Wrapper を使用

```typescript
// src/__tests__/hooks/useMyFeature.test.tsx
import { renderHook } from '@testing-library/react';
import React from 'react';
import { ServiceProvider } from '@/context/ServiceContext';
import { useMyFeature } from '@/hooks/useMyFeature';

describe('useMyFeature', () => {
  // モックサービスを作成
  const mockFirestoreService = {
    saveProductHistory: vi.fn().mockResolvedValue(undefined),
    savePricingHistory: vi.fn().mockResolvedValue(undefined),
    saveAutocompleteHistory: vi.fn(),
    getAutocompleteHistory: vi.fn(),
  };

  // ServiceProvider でラップする wrapper を作成
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const services = { firestoreService: mockFirestoreService };
    return (
      <ServiceProvider services={services as any}>
        {children}
      </ServiceProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save data using firestoreService', async () => {
    // wrapper を指定して renderHook
    const { result } = renderHook(() => useMyFeature('user-123'), { wrapper });

    // フック関数を呼び出し
    await result.current.saveData(mockData);

    // モックが呼ばれたことを検証
    expect(mockFirestoreService.saveProductHistory).toHaveBeenCalledWith(
      'user-123',
      'supplier1',
      'Product A',
      // ...
    );
  });
});
```

### パターン B: 部分的なモック（一部のサービスのみ）

```typescript
// 一部のサービスだけモックして、他は実際の実装を使用
const wrapper = ({ children }: { children: React.ReactNode }) => {
  const services = {
    firestoreService: mockFirestoreService,
    // templateService と sessionStorageService は実装を使用
  };
  return (
    <ServiceProvider services={services as any}>
      {children}
    </ServiceProvider>
  );
};
```

### 実例: useHistoryTracking のテスト

```typescript
// src/__tests__/hooks/useHistoryTracking.test.tsx
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useHistoryTracking } from '@/hooks/useHistoryTracking';
import { ServiceProvider } from '@/context/ServiceContext';

describe('useHistoryTracking', () => {
  const mockFirestoreService = {
    saveProductHistory: vi.fn().mockResolvedValue(undefined),
    savePricingHistory: vi.fn().mockResolvedValue(undefined),
    saveAutocompleteHistory: vi.fn(),
    getAutocompleteHistory: vi.fn(),
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const services = { firestoreService: mockFirestoreService };
    return (
      <ServiceProvider services={services as any}>
        {children}
      </ServiceProvider>
    );
  };

  it('すべての履歴を保存できる', async () => {
    const { result } = renderHook(
      () => useHistoryTracking({
        user: { uid: 'test-user' },
        supplierAutocomplete: { addToHistory: vi.fn() },
        productNameAutocomplete: { addToHistory: vi.fn() },
        originAutocomplete: { addToHistory: vi.fn() },
      }),
      { wrapper }
    );

    await act(async () => {
      await result.current.saveAllHistories(mockFormData);
    });

    expect(mockFirestoreService.saveProductHistory).toHaveBeenCalledTimes(2);
    expect(mockFirestoreService.savePricingHistory).toHaveBeenCalledTimes(1);
  });
});
```

---

## 新しいサービスの追加

新しいサービスを DI パターンに統合する手順です。

### ステップ 1: サービス実装を作成

```typescript
// src/services/myService.ts
export class MyService {
  static async fetchData(id: string): Promise<Data> {
    const response = await fetch(`/api/data/${id}`);
    return response.json();
  }

  static async saveData(data: Data): Promise<void> {
    await fetch('/api/data', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
```

### ステップ 2: ServiceContext にインターフェースを追加

```typescript
// src/context/ServiceContext.tsx
import { MyService } from '@/services/myService';

// 1. インターフェースを定義
export interface IMyService {
  fetchData: typeof MyService.fetchData;
  saveData: typeof MyService.saveData;
}

// 2. Services 型に追加
export interface Services {
  firestoreService: IFirestoreService;
  templateService: ITemplateService;
  sessionStorageService: ISessionStorageService;
  myService: IMyService;  // ← 追加
}
```

### ステップ 3: Provider でサービスを提供

```typescript
// src/context/ServiceContext.tsx (続き)
export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  children,
  services: overrideServices,
}) => {
  const services = useMemo<Services>(
    () => ({
      firestoreService: overrideServices?.firestoreService ?? FirestoreService,
      templateService: overrideServices?.templateService ?? TemplateService,
      sessionStorageService: overrideServices?.sessionStorageService ?? SessionStorageService,
      myService: overrideServices?.myService ?? MyService,  // ← 追加
    }),
    [overrideServices]
  );

  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
};
```

### ステップ 4: 個別フックを作成（オプション、推奨）

```typescript
// src/context/ServiceContext.tsx (続き)
/**
 * useMyService
 *
 * My Service を取得する。
 */
export const useMyService = (): IMyService => {
  return useServices().myService;
};
```

### ステップ 5: フックでサービスを使用

```typescript
// src/hooks/useDataManagement.ts
import { useMyService } from '@/context/ServiceContext';

export const useDataManagement = (id: string) => {
  const myService = useMyService();

  const fetchData = async () => {
    const data = await myService.fetchData(id);
    return data;
  };

  return { fetchData };
};
```

---

## ベストプラクティス

### ✅ DO（推奨）

#### 1. 個別サービスフックを使用する

```typescript
// ✅ Good: 使用するサービスだけを取得
const firestoreService = useFirestoreService();
```

```typescript
// ❌ Bad: すべてのサービスを取得
const { firestoreService } = useServices();
```

**理由**: 使用するサービスのみを取得することで、依存関係が明確になります。

#### 2. インターフェースで型定義する

```typescript
// ✅ Good: インターフェースで定義
export interface IMyService {
  fetchData: typeof MyService.fetchData;
  saveData: typeof MyService.saveData;
}
```

```typescript
// ❌ Bad: any 型を使用
export interface IMyService {
  fetchData: any;
  saveData: any;
}
```

**理由**: 型安全性が保たれ、メソッドのシグネチャ変更時にコンパイルエラーで気づけます。

#### 3. テストで必ずモックを使用する

```typescript
// ✅ Good: モックサービスを注入
const wrapper = ({ children }) => (
  <ServiceProvider services={{ firestoreService: mockService }}>
    {children}
  </ServiceProvider>
);
```

```typescript
// ❌ Bad: 実際のサービスを使用
const wrapper = ({ children }) => (
  <ServiceProvider>
    {children}
  </ServiceProvider>
);
```

**理由**: 実際のサービスを使用すると、外部依存（Firestore、API）に依存してしまいます。

#### 4. beforeEach でモックをクリアする

```typescript
// ✅ Good
beforeEach(() => {
  vi.clearAllMocks();
});
```

**理由**: テスト間でモックの状態が引き継がれるのを防ぎます。

### ❌ DON'T（非推奨）

#### 1. サービスを直接インポートしない

```typescript
// ❌ Bad
import { FirestoreService } from '@/services/firebase/firestoreService';

const saveData = async () => {
  await FirestoreService.saveProductHistory(/* ... */);
};
```

```typescript
// ✅ Good
const firestoreService = useFirestoreService();

const saveData = async () => {
  await firestoreService.saveProductHistory(/* ... */);
};
```

**理由**: 直接インポートすると DI の利点がなくなります。

#### 2. ServiceProvider の外でサービスフックを使用しない

```typescript
// ❌ Bad: ServiceProvider の外で使用するとエラー
function MyComponent() {
  const firestoreService = useFirestoreService();  // Error!
  // ...
}

<MyComponent />  // ServiceProvider がない
```

```typescript
// ✅ Good
<ServiceProvider>
  <MyComponent />
</ServiceProvider>
```

#### 3. テストファイルを .ts のままにしない

```typescript
// ❌ Bad: useMyFeature.test.ts
// JSX を使うと TypeScript コンパイルエラー
```

```typescript
// ✅ Good: useMyFeature.test.tsx
// JSX が正しくパースされる
```

---

## トラブルシューティング

### エラー: "useServices must be used within a ServiceProvider"

**原因**: ServiceProvider の外でサービスフックを使用しています。

**解決方法**:
```tsx
// App.tsx で ServiceProvider を追加
<ServiceProvider>
  <App />
</ServiceProvider>
```

### エラー: "Property 'myMethod' does not exist on type 'typeof MyService'"

**原因**: インターフェースで定義したメソッドが実際のサービスに存在しません。

**解決方法**:
1. サービス実装にメソッドを追加するか
2. インターフェースから不要なメソッドを削除します

```typescript
// サービスに存在するメソッドのみをインターフェースに定義
export interface IMyService {
  // getUserSettings は存在しないので削除
  saveData: typeof MyService.saveData;
}
```

### エラー: TypeScript コンパイルエラー（JSX in .ts file）

**原因**: `.test.ts` ファイルで JSX を使用しています。

**解決方法**:
```bash
# .ts → .tsx にリネーム
mv useMyFeature.test.ts useMyFeature.test.tsx
```

### テストが失敗する: モックが呼ばれない

**原因**: モックサービスが正しく注入されていないか、メソッド名が間違っています。

**解決方法**:
1. wrapper で正しくモックを注入しているか確認
2. メソッド名が一致しているか確認
3. `vi.clearAllMocks()` を beforeEach で呼んでいるか確認

```typescript
// デバッグ用に呼び出しを確認
console.log('Mock calls:', mockService.saveData.mock.calls);
```

---

## まとめ

### DI パターンのメリット

| メリット | 説明 |
|---------|------|
| **テスタビリティ** | モック注入が簡単 |
| **保守性** | 実装変更が局所化される |
| **拡張性** | 新しいサービスの追加が容易 |
| **疎結合** | コンポーネントが実装に依存しない |

### 実装済みフック

| フック | DI 対応 | 使用サービス |
|--------|---------|-------------|
| `useHistoryTracking` | ✅ | FirestoreService |
| `useTemplateGeneration` | ✅ | TemplateService, SessionStorageService |
| `useFileDownloads` | ✅ | (外部サービス不使用) |

### 次のステップ

1. ✅ Phase 6-1: E2E テスト環境構築（完了）
2. ✅ Phase 6-2: Service Context 実装（完了）
3. ✅ Phase 6-3: Custom Hooks 分割（完了）
4. ⏭️ 今後: 他のフックを DI パターンに移行

---

**Phase 6 DI パターン導入完了！** 🎉

このガイドに従って、新しいサービスやフックを DI パターンで実装してください。

---

## 参考リンク

- [Phase 6 実装計画書](./phase-6-implementation-plan.md)
- [Phase 6 完了報告書](./phase-6-completion-report.md)
- [React Context API ドキュメント](https://react.dev/reference/react/useContext)
- [依存性注入パターン (Wikipedia)](https://ja.wikipedia.org/wiki/%E4%BE%9D%E5%AD%98%E6%80%A7%E3%81%AE%E6%B3%A8%E5%85%A5)
