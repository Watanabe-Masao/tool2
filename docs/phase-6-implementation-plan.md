# Phase 6: アーキテクチャ改善 - 実装計画書

## 📋 概要

**フェーズ**: Phase 6 (Architecture Improvements)
**期間**: 3-4 週間（推定 28-38 時間）
**優先度**: 長期的品質向上
**前提条件**: Phase 5-2 完了（98.3% テスト合格率達成）

---

## 🎯 Phase 6 の目標

### 主要目標

1. **E2E 自動テスト導入**
   - ユーザーフロー全体の品質保証
   - リグレッション防止
   - CI/CD での自動実行

2. **Dependency Injection パターン導入**
   - テスタビリティ向上
   - Service Context による依存性管理
   - エンタープライズグレードのアーキテクチャ

3. **useOrderFormState 分割**
   - コード可読性向上
   - 単一責任原則の徹底
   - 保守性向上

### 成功指標

| 指標 | 目標 |
|------|------|
| **E2E テストカバレッジ** | コアフロー 100% |
| **DI 導入率** | Service 層 100% |
| **useOrderFormState 行数** | 380行 → 各 100行以下 |
| **テスト合格率** | 98.3% 維持 |
| **TypeScript エラー** | 0 errors 維持 |

---

## 📦 Phase 6-1: E2E 自動テスト導入

### 目標

ユーザーフロー全体を自動テストでカバーし、実際のユーザー体験を保証する。

### 工数見積もり

**合計**: 8-12 時間（1-2 週間）

| タスク | 工数 |
|--------|------|
| Playwright セットアップ | 2 時間 |
| 注文作成フロー E2E テスト | 3-4 時間 |
| 下書き保存・復元 E2E テスト | 2-3 時間 |
| テンプレート生成 E2E テスト | 1-2 時間 |
| CI/CD 統合 | 1 時間 |

### 実装内容

#### 6-1-1. Playwright セットアップ

**ファイル**: `frontend/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**依存関係**:
```bash
npm install -D @playwright/test
npx playwright install
```

---

#### 6-1-2. 注文作成フロー E2E テスト

**ファイル**: `frontend/e2e/order-creation-flow.spec.ts`

**テストケース**:
1. ステップ 1: 基本情報入力
2. ステップ 2: 商品追加
3. ステップ 3: 配分設定
4. ステップ 4: 確認
5. ステップ 5: テンプレート生成

```typescript
import { test, expect } from '@playwright/test';

test.describe('注文作成フロー', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理（Firebase Auth エミュレータ使用）
    await page.goto('/');
    await page.click('[data-testid="login-button"]');
    // ... authentication
  });

  test('全5ステップで注文を作成できる', async ({ page }) => {
    await page.goto('/orders/new');

    // ステップ1: 基本情報
    await page.fill('[data-testid="delivery-date"]', '2025-12-01');
    await page.selectOption('[data-testid="supplier"]', 'supplier1');
    await page.click('[data-testid="next-button"]');

    // ステップ2: 商品追加
    await page.fill('[data-testid="product-name"]', 'りんご');
    await page.fill('[data-testid="product-origin"]', '青森県');
    await page.click('[data-testid="add-product-button"]');
    await page.click('[data-testid="next-button"]');

    // ステップ3: 配分設定
    await page.fill('[data-testid="store-allocation-0"]', '10');
    await page.click('[data-testid="next-button"]');

    // ステップ4: 確認
    await expect(page.locator('[data-testid="product-summary"]')).toContainText('りんご');
    await page.click('[data-testid="next-button"]');

    // ステップ5: テンプレート生成
    await page.fill('[data-testid="book-name"]', 'テストブック');
    await page.click('[data-testid="generate-template-button"]');

    // 成功メッセージ確認
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('各ステップでバリデーションが動作する', async ({ page }) => {
    await page.goto('/orders/new');

    // 必須フィールド未入力で次へ
    await page.click('[data-testid="next-button"]');

    // エラーメッセージ確認
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
```

---

#### 6-1-3. 下書き保存・復元 E2E テスト

**ファイル**: `frontend/e2e/draft-management.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('下書き保存・復元', () => {
  test('下書きを保存して復元できる', async ({ page }) => {
    await page.goto('/orders/new');

    // データ入力
    await page.fill('[data-testid="delivery-date"]', '2025-12-01');
    await page.selectOption('[data-testid="supplier"]', 'supplier1');
    await page.fill('[data-testid="product-name"]', 'バナナ');

    // 下書き保存（自動保存）
    await page.waitForTimeout(1000); // SessionStorage への保存を待つ

    // ページリロード
    await page.reload();

    // 復元確認ダイアログ
    await expect(page.locator('[data-testid="restore-draft-dialog"]')).toBeVisible();
    await page.click('[data-testid="restore-draft-button"]');

    // データが復元されているか確認
    await expect(page.locator('[data-testid="delivery-date"]')).toHaveValue('2025-12-01');
    await expect(page.locator('[data-testid="product-name"]')).toHaveValue('バナナ');
  });

  test('下書きをクリアできる', async ({ page }) => {
    await page.goto('/orders/new');

    // データ入力
    await page.fill('[data-testid="product-name"]', 'オレンジ');

    // 下書きクリア
    await page.click('[data-testid="clear-draft-button"]');
    await page.click('[data-testid="confirm-clear-button"]');

    // データがクリアされているか確認
    await expect(page.locator('[data-testid="product-name"]')).toHaveValue('');
  });
});
```

---

#### 6-1-4. テンプレート生成 E2E テスト

**ファイル**: `frontend/e2e/template-generation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('テンプレート生成', () => {
  test('Excel テンプレートを生成してダウンロードできる', async ({ page }) => {
    await page.goto('/orders/new');

    // 注文作成フローを完了
    // ... (省略)

    // テンプレート生成
    await page.fill('[data-testid="book-name"]', 'E2E テストブック');
    await page.click('[data-testid="generate-template-button"]');

    // ローディング表示
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();

    // 成功メッセージ
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'テンプレートを生成しました'
    );

    // ダウンロードリンク確認
    await expect(page.locator('[data-testid="download-excel-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-pdf-link"]')).toBeVisible();

    // ダウンロード実行
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-excel-link"]'),
    ]);

    // ダウンロードファイル名確認
    expect(download.suggestedFilename()).toMatch(/配分表_E2E テストブック_\d{8}\.xlsx/);
  });

  test('PDF プレビューを表示できる', async ({ page }) => {
    await page.goto('/orders/new');

    // ... テンプレート生成

    // PDF プレビュー表示
    await page.click('[data-testid="preview-pdf-button"]');

    // PDF ビューア確認
    await expect(page.locator('[data-testid="pdf-viewer"]')).toBeVisible();
  });
});
```

---

#### 6-1-5. CI/CD 統合

**ファイル**: `.github/workflows/e2e-tests.yml`

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        working-directory: frontend

      - name: Run E2E tests
        run: npm run test:e2e
        working-directory: frontend

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 30
```

**package.json スクリプト追加**:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

## 📦 Phase 6-2: Dependency Injection + Service Context

### 目標

Service 層の依存性を Context API で管理し、テスタビリティと保守性を向上させる。

### 工数見積もり

**合計**: 12-16 時間（1.5-2 週間）

| タスク | 工数 |
|--------|------|
| Service Context 設計・実装 | 3-4 時間 |
| useHistoryTracking DI 対応 | 2-3 時間 |
| useTemplateGeneration DI 対応 | 2-3 時間 |
| useFileDownloads DI 対応 | 2-3 時間 |
| テスト更新 | 2-3 時間 |
| ドキュメント作成 | 1 時間 |

### 実装内容

#### 6-2-1. Service Context 設計・実装

**ファイル**: `frontend/src/contexts/ServiceContext.tsx`

```typescript
import React, { createContext, useContext, useMemo } from 'react';
import { FirestoreService } from '@/services/firebase/firestoreService';
import { TemplateService } from '@/services/api/templateService';
import { SessionStorageService } from '@/utils/sessionStorageService';

/**
 * Service インターフェース定義
 */
export interface IFirestoreService {
  saveProductHistory: typeof FirestoreService.saveProductHistory;
  savePricingHistory: typeof FirestoreService.savePricingHistory;
  saveAutocompleteHistory: typeof FirestoreService.saveAutocompleteHistory;
  getAutocompleteHistory: typeof FirestoreService.getAutocompleteHistory;
  getUserSettings: typeof FirestoreService.getUserSettings;
}

export interface ITemplateService {
  generateTemplate: typeof TemplateService.generateTemplate;
  getDownloadUrl: typeof TemplateService.getDownloadUrl;
}

export interface ISessionStorageService {
  saveDraft: typeof SessionStorageService.saveDraft;
  getDraft: typeof SessionStorageService.getDraft;
  clearDraft: typeof SessionStorageService.clearDraft;
}

/**
 * Services の型定義
 */
export interface Services {
  firestoreService: IFirestoreService;
  templateService: ITemplateService;
  sessionStorageService: ISessionStorageService;
}

/**
 * Service Context
 */
const ServiceContext = createContext<Services | null>(null);

/**
 * ServiceProvider Props
 */
export interface ServiceProviderProps {
  children: React.ReactNode;
  /** テスト用 Service override */
  services?: Partial<Services>;
}

/**
 * ServiceProvider
 *
 * アプリケーション全体に Service を提供する Context Provider。
 * テスト時は services prop で Service をオーバーライド可能。
 *
 * @example
 * ```tsx
 * // 本番環境
 * <ServiceProvider>
 *   <App />
 * </ServiceProvider>
 *
 * // テスト環境
 * <ServiceProvider services={{ firestoreService: mockFirestoreService }}>
 *   <ComponentUnderTest />
 * </ServiceProvider>
 * ```
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  children,
  services: overrideServices
}) => {
  const services = useMemo<Services>(() => ({
    firestoreService: overrideServices?.firestoreService ?? FirestoreService,
    templateService: overrideServices?.templateService ?? TemplateService,
    sessionStorageService: overrideServices?.sessionStorageService ?? SessionStorageService,
  }), [overrideServices]);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

/**
 * useServices Hook
 *
 * Service Context から Services を取得する。
 * ServiceProvider の外で使用するとエラーを投げる。
 *
 * @returns Services オブジェクト
 * @throws ServiceProvider の外で使用した場合
 *
 * @example
 * ```tsx
 * const { firestoreService, templateService } = useServices();
 *
 * await firestoreService.saveProductHistory(...);
 * await templateService.generateTemplate(...);
 * ```
 */
export const useServices = (): Services => {
  const services = useContext(ServiceContext);

  if (!services) {
    throw new Error(
      'useServices must be used within a ServiceProvider. ' +
      'Make sure your component is wrapped with <ServiceProvider>.'
    );
  }

  return services;
};

/**
 * 個別 Service Hooks (オプション)
 */
export const useFirestoreService = (): IFirestoreService => {
  return useServices().firestoreService;
};

export const useTemplateService = (): ITemplateService => {
  return useServices().templateService;
};

export const useSessionStorageService = (): ISessionStorageService => {
  return useServices().sessionStorageService;
};
```

---

#### 6-2-2. useHistoryTracking DI 対応

**変更前** (`frontend/src/hooks/useHistoryTracking.ts`):
```typescript
import { FirestoreService } from '@/services/firebase/firestoreService';

export const useHistoryTracking = ({ user, supplierAutocomplete }: Params) => {
  const saveAllHistories = async (data: OrderFormData) => {
    // 直接インポートを使用
    await FirestoreService.saveProductHistory(...);
    await FirestoreService.savePricingHistory(...);
  };
  // ...
};
```

**変更後**:
```typescript
import { useFirestoreService } from '@/contexts/ServiceContext';
import type { IFirestoreService } from '@/contexts/ServiceContext';

/**
 * useHistoryTracking Parameters
 */
export interface UseHistoryTrackingParams {
  user: User | null;
  supplierAutocomplete: UseAutocompleteReturn;
  /** DI: Firestore Service (テスト用) */
  firestoreService?: IFirestoreService;
}

export const useHistoryTracking = ({
  user,
  supplierAutocomplete,
  firestoreService: injectedService,
}: UseHistoryTrackingParams) => {
  // Context または Injected Service を使用
  const contextService = useFirestoreService();
  const firestoreService = injectedService ?? contextService;

  const saveAllHistories = useCallback(async (data: OrderFormData) => {
    if (!user) return;

    try {
      // DI された Service を使用
      await firestoreService.saveProductHistory(
        user.uid,
        data.products,
        data.deliveryDate
      );

      await firestoreService.savePricingHistory(
        user.uid,
        data.products,
        data.deliveryDate
      );

      console.log('✅ History saved successfully');
    } catch (error) {
      console.error('❌ Failed to save history:', error);
      throw error;
    }
  }, [user, firestoreService]);

  return {
    saveAllHistories,
  };
};
```

**テスト更新**:
```typescript
// frontend/src/__tests__/hooks/useHistoryTracking.test.ts
import { renderHook } from '@testing-library/react';
import { useHistoryTracking } from '@/hooks/useHistoryTracking';
import type { IFirestoreService } from '@/contexts/ServiceContext';

describe('useHistoryTracking with DI', () => {
  it('uses injected service', async () => {
    // Mock Service を作成
    const mockFirestoreService: IFirestoreService = {
      saveProductHistory: vi.fn().mockResolvedValue(undefined),
      savePricingHistory: vi.fn().mockResolvedValue(undefined),
      // ... 他のメソッド
    };

    const { result } = renderHook(() =>
      useHistoryTracking({
        user: mockUser,
        supplierAutocomplete: mockAutocomplete,
        firestoreService: mockFirestoreService, // ✅ DI
      })
    );

    await result.current.saveAllHistories(mockData);

    // Mock が呼ばれたことを確認
    expect(mockFirestoreService.saveProductHistory).toHaveBeenCalled();
  });
});
```

---

#### 6-2-3. App.tsx への ServiceProvider 追加

**ファイル**: `frontend/src/App.tsx`

```typescript
import { ServiceProvider } from '@/contexts/ServiceContext';
import { AuthProvider } from '@/context/AuthContext';

function App() {
  return (
    <ServiceProvider>
      <AuthProvider>
        {/* ... 既存のアプリケーション */}
      </AuthProvider>
    </ServiceProvider>
  );
}

export default App;
```

---

## 📦 Phase 6-3: useOrderFormState 分割

### 目標

useOrderFormState (380行) を単一責任原則に従って分割し、可読性と保守性を向上させる。

### 工数見積もり

**合計**: 8-10 時間（1-1.5 週間）

| タスク | 工数 |
|--------|------|
| useFormStepState 実装 | 2 時間 |
| useProductIndexState 実装 | 2 時間 |
| useFormModalState 実装 | 1-2 時間 |
| useFormLockState 実装 | 1-2 時間 |
| useOrderFormState リファクタリング | 2 時間 |

### 実装内容

#### 6-3-1. useFormStepState 実装

**ファイル**: `frontend/src/hooks/useFormStepState.ts`

```typescript
import { useState, useCallback } from 'react';

/**
 * フォームステップ状態管理
 *
 * 責務:
 * - activeStep の管理
 * - ステップ遷移ロジック
 * - ステップバリデーション
 */
export const useFormStepState = (totalSteps: number = 5) => {
  const [activeStep, setActiveStep] = useState(0);

  /**
   * 次のステップへ進む
   */
  const handleNextStep = useCallback(() => {
    setActiveStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  /**
   * 前のステップへ戻る
   */
  const handlePrevStep = useCallback(() => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  }, []);

  /**
   * 特定のステップへ移動
   */
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setActiveStep(step);
    }
  }, [totalSteps]);

  /**
   * ステップをリセット
   */
  const resetStep = useCallback(() => {
    setActiveStep(0);
  }, []);

  return {
    activeStep,
    setActiveStep,
    handleNextStep,
    handlePrevStep,
    goToStep,
    resetStep,
    isFirstStep: activeStep === 0,
    isLastStep: activeStep === totalSteps - 1,
  };
};
```

---

#### 6-3-2. useProductIndexState 実装

**ファイル**: `frontend/src/hooks/useProductIndexState.ts`

```typescript
import { useState, useCallback } from 'react';

/**
 * 商品インデックス状態管理
 *
 * 責務:
 * - activeProductIndex の管理
 * - 商品選択ロジック
 */
export const useProductIndexState = (totalProducts: number) => {
  const [activeProductIndex, setActiveProductIndex] = useState(0);

  /**
   * 次の商品へ
   */
  const goToNextProduct = useCallback(() => {
    setActiveProductIndex((prev) => Math.min(prev + 1, totalProducts - 1));
  }, [totalProducts]);

  /**
   * 前の商品へ
   */
  const goToPrevProduct = useCallback(() => {
    setActiveProductIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  /**
   * 特定の商品へ
   */
  const goToProduct = useCallback((index: number) => {
    if (index >= 0 && index < totalProducts) {
      setActiveProductIndex(index);
    }
  }, [totalProducts]);

  /**
   * インデックスをリセット
   */
  const resetProductIndex = useCallback(() => {
    setActiveProductIndex(0);
  }, []);

  return {
    activeProductIndex,
    setActiveProductIndex,
    goToNextProduct,
    goToPrevProduct,
    goToProduct,
    resetProductIndex,
    isFirstProduct: activeProductIndex === 0,
    isLastProduct: activeProductIndex === totalProducts - 1,
  };
};
```

---

#### 6-3-3. useFormModalState 実装

**ファイル**: `frontend/src/hooks/useFormModalState.ts`

```typescript
import { useState, useCallback } from 'react';

/**
 * モーダル状態
 */
export interface ModalState {
  open: boolean;
  bookName: string;
}

/**
 * フォームモーダル状態管理
 *
 * 責務:
 * - モーダルの開閉状態
 * - モーダル内のフォーム状態
 */
export const useFormModalState = () => {
  const [bookNameDialog, setBookNameDialog] = useState<ModalState>({
    open: false,
    bookName: '',
  });

  const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);

  /**
   * ブック名ダイアログを開く
   */
  const openBookNameDialog = useCallback(() => {
    setBookNameDialog({ open: true, bookName: '' });
  }, []);

  /**
   * ブック名ダイアログを閉じる
   */
  const closeBookNameDialog = useCallback(() => {
    setBookNameDialog({ open: false, bookName: '' });
  }, []);

  /**
   * ブック名を更新
   */
  const updateBookName = useCallback((name: string) => {
    setBookNameDialog((prev) => ({ ...prev, bookName: name }));
  }, []);

  /**
   * プレビューを表示
   */
  const showPreview = useCallback(() => {
    setShowGeneratedPreview(true);
  }, []);

  /**
   * プレビューを非表示
   */
  const hidePreview = useCallback(() => {
    setShowGeneratedPreview(false);
  }, []);

  return {
    bookNameDialog,
    setBookNameDialog,
    showGeneratedPreview,
    setShowGeneratedPreview,
    openBookNameDialog,
    closeBookNameDialog,
    updateBookName,
    showPreview,
    hidePreview,
  };
};
```

---

#### 6-3-4. useFormLockState 実装

**ファイル**: `frontend/src/hooks/useFormLockState.ts`

```typescript
import { useState, useCallback } from 'react';

/**
 * フォームロック状態管理
 *
 * 責務:
 * - ロック状態の管理
 * - 未保存変更フラグ
 */
export const useFormLockState = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /**
   * フォームをロック
   */
  const lockForm = useCallback(() => {
    setIsLocked(true);
  }, []);

  /**
   * フォームをアンロック
   */
  const unlockForm = useCallback(() => {
    setIsLocked(false);
  }, []);

  /**
   * 未保存変更をマーク
   */
  const markAsUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  /**
   * 未保存変更をクリア
   */
  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  return {
    isLocked,
    setIsLocked,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    lockForm,
    unlockForm,
    markAsUnsaved,
    markAsSaved,
  };
};
```

---

#### 6-3-5. useOrderFormState リファクタリング

**変更後** (`frontend/src/hooks/useOrderFormState.ts`):

```typescript
import { useFormStepState } from './useFormStepState';
import { useProductIndexState } from './useProductIndexState';
import { useFormModalState } from './useFormModalState';
import { useFormLockState } from './useFormLockState';

/**
 * useOrderFormState
 *
 * 複数の状態管理 hooks を統合し、NewOrderPage に提供する。
 *
 * 改善内容:
 * - 380行 → 約100行（統合のみ）
 * - 各状態は独立した hook で管理
 * - 単一責任原則の徹底
 */
export const useOrderFormState = (totalProducts: number) => {
  // ステップ管理
  const stepState = useFormStepState(5);

  // 商品インデックス管理
  const productIndexState = useProductIndexState(totalProducts);

  // モーダル状態管理
  const modalState = useFormModalState();

  // ロック状態管理
  const lockState = useFormLockState();

  return {
    // ステップ
    ...stepState,

    // 商品インデックス
    ...productIndexState,

    // モーダル
    ...modalState,

    // ロック
    ...lockState,
  };
};
```

---

## 📊 Phase 6 実装スケジュール

### Week 1-2: Phase 6-1 (E2E テスト)

| Day | タスク | 工数 |
|-----|--------|------|
| Day 1 | Playwright セットアップ | 2h |
| Day 2-3 | 注文作成フロー E2E | 4h |
| Day 4-5 | 下書き・テンプレート E2E | 3h |
| Day 6 | CI/CD 統合 | 1h |

**マイルストーン**: E2E テスト 100% カバレッジ達成

---

### Week 3: Phase 6-2 (DI + Service Context)

| Day | タスク | 工数 |
|-----|--------|------|
| Day 1-2 | Service Context 実装 | 4h |
| Day 3-4 | hooks DI 対応 | 6h |
| Day 5-6 | テスト更新 | 3h |
| Day 7 | ドキュメント | 1h |

**マイルストーン**: DI パターン導入完了

---

### Week 4: Phase 6-3 (State 分割)

| Day | タスク | 工数 |
|-----|--------|------|
| Day 1-2 | 4つの State hooks 実装 | 6h |
| Day 3-4 | useOrderFormState リファクタリング | 2h |
| Day 5 | テスト実行・検証 | 2h |

**マイルストーン**: useOrderFormState 分割完了

---

## ✅ Phase 6 完了条件

### 必須条件

- [ ] E2E テストが全て passing
- [ ] Service Context が全 Service に統合
- [ ] useOrderFormState が 4つの hook に分割
- [ ] 既存テスト 98.3% 維持
- [ ] TypeScript エラー 0 維持
- [ ] CI/CD パイプライン正常動作

### 推奨条件

- [ ] E2E テストカバレッジレポート作成
- [ ] DI パターンドキュメント作成
- [ ] State 分割アーキテクチャ図作成

---

## 📦 成果物

### コード

1. **E2E テスト**
   - `frontend/playwright.config.ts`
   - `frontend/e2e/order-creation-flow.spec.ts`
   - `frontend/e2e/draft-management.spec.ts`
   - `frontend/e2e/template-generation.spec.ts`

2. **Service Context**
   - `frontend/src/contexts/ServiceContext.tsx`
   - Updated hooks with DI support

3. **State 分割**
   - `frontend/src/hooks/useFormStepState.ts`
   - `frontend/src/hooks/useProductIndexState.ts`
   - `frontend/src/hooks/useFormModalState.ts`
   - `frontend/src/hooks/useFormLockState.ts`
   - Refactored `frontend/src/hooks/useOrderFormState.ts`

### ドキュメント

1. `/docs/phase-6-implementation-plan.md` - 本計画書
2. `/docs/phase-6-completion-report.md` - 完了報告書
3. `/docs/e2e-testing-guide.md` - E2E テストガイド
4. `/docs/dependency-injection-guide.md` - DI パターンガイド

---

## 🎯 期待される効果

### 定量的効果

| 指標 | Before | After | 改善 |
|------|--------|-------|------|
| **E2E テストカバレッジ** | 0% | 100% | +100% |
| **useOrderFormState 行数** | 380行 | 4 hooks (各 ~100行) | 分割化 |
| **テスト合格率** | 98.3% | 98.3%+ | 維持 |
| **Service モック不要化** | 0% | 100% | DI 導入 |

### 定性的効果

1. **品質保証向上**
   - ユーザーフロー全体の自動テスト
   - リグレッション防止
   - CI/CD での継続的検証

2. **保守性向上**
   - Service 層のテスタビリティ向上
   - 依存性の明示化
   - コードの可読性向上

3. **開発体験向上**
   - モック不要のテスト
   - 単一責任原則の徹底
   - 新規開発者のオンボーディング容易化

---

## 🚨 リスクと対策

### リスク 1: E2E テスト実行時間

**問題**: E2E テストの実行時間が長くなる可能性

**対策**:
- Parallel 実行（Playwright の設定）
- Critical パスのみ CI で実行
- Full suite は nightly ビルドで実行

### リスク 2: DI 導入による破壊的変更

**問題**: 既存コードへの影響が大きい

**対策**:
- 段階的導入（hook ごとに実施）
- 既存 API の維持（inject は optional）
- 十分なテストカバレッジ

### リスク 3: State 分割による複雑性

**問題**: 分割しすぎて逆に複雑になる可能性

**対策**:
- useOrderFormState で統合して提供
- 各 hook の責務を明確化
- ドキュメント充実

---

## 🏁 次のステップ

Phase 6 完了後:

1. **Phase 7 検討**: 開発体験向上（Storybook、ESLint 強化）
2. **運用フェーズ移行**: 完成したアーキテクチャで本番運用
3. **継続的改善**: E2E テストの拡充、DI パターンの他 hooks への適用

---

**作成者**: Claude (Anthropic AI)
**作成日**: 2025-11-25
**ステータス**: 📋 計画完成 - 実装開始準備完了
**次のアクション**: Phase 6-1 (E2E テスト) 実装開始

