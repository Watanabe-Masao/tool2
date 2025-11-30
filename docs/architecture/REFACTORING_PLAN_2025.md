# リファクタリング計画書 2025

**作成日**: 2025-11-30
**ステータス**: 🟡 レビュー中
**優先度**: 高
**対象**: フロントエンドアーキテクチャ全体

---

## 📋 エグゼクティブサマリー

本計画書は、8つのアーキテクチャ原則に基づいて現在のコードベースを評価し、段階的なリファクタリングロードマップを提示します。

### 現状評価スコア

| アーキテクチャ原則 | スコア | 評価 |
|-------------------|--------|------|
| 1. 構造整理（関心の分離） | ⭐⭐⭐☆☆ 60% | 部分的に達成、大規模コンポーネントに課題 |
| 2. 依存関係の最適化 | ⭐⭐⭐⭐☆ 75% | Repository層は良好、UI層に改善余地 |
| 3. 抽象化層の整理 | ⭐⭐⭐⭐☆ 80% | Facade/Repository パターンで優れた実装 |
| 4. 単一情報源の確立 | ⭐⭐⭐⭐☆ 85% | 型定義・定数は良好、一部重複あり |
| 5. スケーラブル・安全な構成 | ⭐⭐⭐☆☆ 65% | 基盤は良好だがテスト不足 |
| 6. 保守性・再利用性 | ⭐⭐⭐☆☆ 70% | パターンは統一、ドキュメント不足 |
| 7. シンプルさ重視 | ⭐⭐⭐☆☆ 60% | 2,486行の巨大ファイルが存在 |
| 8. トレードオフの明示 | ⭐⭐☆☆☆ 40% | 設計判断のドキュメント不足 |

**総合評価**: ⭐⭐⭐☆☆ **67%** - 良好な基盤だが改善余地あり

---

## 🎯 リファクタリングの主要目標

### 短期目標（1-2ヶ月）
1. **AllocationHistoryPage の分割** - 2,486行 → 250行以下 × 8コンポーネント
2. **状態管理の統一** - Context API と Zustand の役割を明確化
3. **レガシーコードの削減** - `firestoreService.ts` を完全に廃止
4. **テストカバレッジ向上** - コンポーネント層を 4% → 40%に

### 中期目標（3-6ヶ月）
1. **Feature-Sliced Design への移行** - ルートの `components/`, `hooks/` を機能別に再編成
2. **E2E テスト基盤の構築** - Playwright で 20+ シナリオ
3. **パフォーマンス最適化** - 初期ロード 30% 改善
4. **ドキュメント整備** - API ドキュメント、アーキテクチャ決定記録（ADR）

---

## 📊 8つのアーキテクチャ原則による詳細評価

### 1. 構造整理：関心の分離と責務の明確化 ⭐⭐⭐☆☆ 60%

#### ✅ 良好な実装

**1.1 Repository パターンの適用**
```
services/firestore/
├── FirestoreServiceFacade.ts      # 統一インターフェース
├── base/FirestoreBaseService.ts   # 抽象基底クラス
└── repositories/                   # 7個の専門リポジトリ
    ├── OrderRepository.ts          # 注文 CRUD
    ├── ProductHistoryRepository.ts # 商品履歴
    └── ...
```
- ✅ 各リポジトリが単一のドメインエンティティを管理
- ✅ Facade パターンで複雑性を隠蔽
- ✅ `toFirestoreFormat()` / `fromFirestoreFormat()` で変換を分離

**1.2 カスタムフックでビジネスロジックを分離**
```typescript
// UI コンポーネント
export const NewOrderPage = () => {
  const orderHandlers = useOrderHandlers();  // ビジネスロジック
  const orderSubmit = useOrderSubmit();      // 送信ロジック

  return <OrderForm onSubmit={orderSubmit.submit} />;
};
```
- ✅ 30個のカスタムフックでロジックを抽象化
- ✅ React Hook Form で form 状態を分離

#### ❌ 問題点と改善が必要な領域

**1.1 AllocationHistoryPage の巨大化（2,486行）**

**問題点:**
```typescript
// AllocationHistoryPage.tsx (2,486行)
export const AllocationHistoryPage = () => {
  // 責務1: データフェッチング
  const [batches, setBatches] = useState<AllocationBatch[]>([]);
  const fetchBatches = async () => { /* 50行 */ };

  // 責務2: フィルタリング
  const [filters, setFilters] = useState({ /* ... */ });
  const applyFilters = () => { /* 100行 */ };

  // 責務3: モーダル管理（5種類）
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  // ...

  // 責務4: テーブルレンダリング（DataGrid設定）
  const columns: GridColDef[] = [ /* 200行 */ ];

  // 責務5: カレンダー表示
  const renderCalendar = () => { /* 150行 */ };

  // 責務6: 詳細モーダルコンテンツ
  const renderDetailModal = () => { /* 300行 */ };

  // 責務7: 統計計算
  const calculateStatistics = () => { /* 80行 */ };

  return (
    <>
      {/* 800行以上のJSX */}
    </>
  );
};
```

**影響:**
- 🔴 単一責任の原則を大幅に違反（7つ以上の責務）
- 🔴 保守性の低下（変更時の影響範囲が不明確）
- 🔴 テストが困難（モックが複雑）
- 🔴 再利用不可（他のページで類似機能を使えない）

**改善案:**

```typescript
// pages/AllocationHistoryPage/index.tsx (150行以下)
export const AllocationHistoryPage = () => {
  return (
    <AllocationHistoryLayout>
      <AllocationHistoryContainer />
    </AllocationHistoryLayout>
  );
};

// pages/AllocationHistoryPage/AllocationHistoryContainer.tsx (200行)
const AllocationHistoryContainer = () => {
  const { batches, loading, error } = useAllocationBatches();
  const filters = useAllocationFilters();
  const modals = useAllocationModals();

  return (
    <>
      <AllocationHistoryToolbar filters={filters} />
      <AllocationHistoryTable
        batches={batches}
        onRowClick={modals.detail.open}
      />
      <AllocationHistoryModals modals={modals} />
    </>
  );
};

// components/AllocationHistory/AllocationHistoryTable.tsx (150行)
// components/AllocationHistory/AllocationHistoryToolbar.tsx (100行)
// components/AllocationHistory/AllocationDetailModal.tsx (200行)
// hooks/useAllocationBatches.ts (100行)
// hooks/useAllocationFilters.ts (80行)
// hooks/useAllocationModals.ts (60行)
```

**期待効果:**
- ✅ 各コンポーネントが 250行以下（理解しやすい）
- ✅ 責務が明確（変更時の影響範囲を限定）
- ✅ 再利用可能（他のページでも使用可能）
- ✅ テスト容易性向上（単体テストが簡単）

**1.2 その他の大規模コンポーネント**

| ファイル | 行数 | 推奨リファクタリング |
|---------|------|---------------------|
| StoreAllocationMobile.tsx | 1,498 | スワイプ機能、フィルタ、配分入力を分離 |
| ProductFormCardBasic.tsx | 1,412 | フォームフィールドをグループ化 |
| ProductPresetModal.tsx | 1,338 | プリセットリスト、検索、フィルタを分離 |

**1.3 Context vs Zustand の役割重複**

**問題点:**
```typescript
// context/OrderFormContext.tsx - UI状態を管理
const OrderFormProvider = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [products, setProducts] = useState([]);
  // ...
};

// stores/orderFormStore.ts - 同じUI状態を管理
const useOrderFormStore = create((set) => ({
  activeStep: 0,
  setActiveStep: (step) => set({ activeStep: step }),
  // ...
}));
```

**改善案:**

```typescript
// ✅ Zustand に統一（UI状態）
// stores/orderFormStore.ts
export const useOrderFormStore = create<OrderFormState>((set) => ({
  // ステップナビゲーション
  activeStep: 0,
  setActiveStep: (step) => set({ activeStep: step }),

  // モーダル状態
  modals: { /* ... */ },

  // 店舗ロック状態
  lockedStores: new Map(),
  // ...
}));

// ❌ Context は削除または認証・テーマのみに限定
// context/AuthContext.tsx (維持)
// context/ThemeContext.tsx (維持)
// context/OrderFormContext.tsx (削除 → Zustand へ移行)
```

---

### 2. 依存関係の最適化：疎結合・高凝集 ⭐⭐⭐⭐☆ 75%

#### ✅ 良好な実装

**2.1 Facade パターンによる依存性の隠蔽**

```typescript
// ✅ 優れた実装
// FirestoreServiceFacade が内部リポジトリへの依存を隠蔽
export class FirestoreServiceFacade {
  private orderRepo: OrderRepository;
  private productHistoryRepo: ProductHistoryRepository;
  // ...

  // 外部からはシンプルなインターフェース
  async saveOrder(orderData: OrderData, userId: string): Promise<string> {
    return this.orderRepo.saveOrder(orderData, userId);
  }
}

// 利用側はリポジトリの存在を知らない
const facade = new FirestoreServiceFacade(db);
await facade.saveOrder(order, userId);
```

**2.2 型定義の単一情報源（SSOT）**

```typescript
// types/index.ts - すべての型を再エクスポート
export * from './product';
export * from './order';
export * from './store';
// ...

// 使用側は単一のimportで完結
import type { OrderData, ProductData } from '@/types';
```

#### ❌ 問題点と改善が必要な領域

**2.1 AllocationHistoryPage の過剰な依存**

```typescript
// AllocationHistoryPage.tsx
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
import { StoreCategoryService } from '@/services/firebase/storeCategoryService';
import { useSupplierPresets } from '@/hooks/useSupplierPresets';
import { STORE_DATA } from '@/utils/constants';
import { getFirebaseFirestore } from '@/services/firebase/config';
// ... 合計20個以上のimport

// ✅ 改善後
import { useAllocationHistory } from '@/features/allocation-history/hooks';
import { AllocationHistoryTable } from '@/features/allocation-history/components';
// すべての依存をフィーチャー内に隠蔽
```

**2.2 循環依存のリスク**

現在の依存グラフ:
```
useOrderSubmit
  ├─→ useOrderDataSubmit
  │     └─→ OrderService
  │           └─→ FirestoreServiceFacade
  ├─→ useTemplateGeneration
  │     ├─→ OrderService (重複)
  │     └─→ useFileDownloads
  └─→ useHistoryTracking
        └─→ FirestoreServiceFacade (重複)
```

**改善案:**

```typescript
// OrderService に依存を集約
export class OrderService {
  constructor(
    private firestoreService: FirestoreServiceFacade,
    private templateService: TemplateService,
    private historyService: HistoryService
  ) {}

  async submitOrder(data: OrderFormData): Promise<OrderResult> {
    // すべてのサービスをここで統合
    const orderId = await this.firestoreService.saveOrder(data);
    const template = await this.templateService.generate(data);
    await this.historyService.save(data);

    return { orderId, template };
  }
}

// フックは OrderService のみに依存
export const useOrderSubmit = () => {
  const orderService = useOrderService();

  const submit = async (data: OrderFormData) => {
    return orderService.submitOrder(data);
  };

  return { submit };
};
```

**2.3 レガシーコードとの二重依存**

```typescript
// ❌ 現状: 2つのサービスが共存
import { FirestoreService } from '@/services/firebase/firestoreService'; // @deprecated
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';

// ✅ 改善: Facade のみに統一
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
```

---

### 3. 抽象化層の整理：共通処理の抽象化 ⭐⭐⭐⭐☆ 80%

#### ✅ 良好な実装

**3.1 FirestoreBaseService による抽象化**

```typescript
// base/FirestoreBaseService.ts
export abstract class FirestoreBaseService<T, F = T> {
  abstract toFirestoreFormat(entity: T): F;
  abstract fromFirestoreFormat(data: F, id: string): T;

  // 共通CRUD操作
  async save(entity: T): Promise<string> { /* ... */ }
  async findById(id: string): Promise<T | null> { /* ... */ }
  async findAll(): Promise<T[]> { /* ... */ }
  async update(id: string, entity: T): Promise<void> { /* ... */ }
  async delete(id: string): Promise<void> { /* ... */ }
}

// 各リポジトリは変換ロジックのみ実装
export class OrderRepository extends FirestoreBaseService<OrderData, FirestoreOrderData> {
  toFirestoreFormat(order: OrderData): FirestoreOrderData {
    return {
      delivery_date: format(order.deliveryDate, 'yyyy-MM-dd'),
      products: order.products.map(this.productToFirestore),
      // ...
    };
  }

  fromFirestoreFormat(data: FirestoreOrderData, id: string): OrderData {
    return {
      id,
      deliveryDate: new Date(data.delivery_date),
      products: data.products.map(this.productFromFirestore),
      // ...
    };
  }
}
```

**評価:**
- ✅ DRY原則を徹底（CRUD操作の重複を排除）
- ✅ Open/Closed原則（拡張は容易、修正は不要）
- ✅ テンプレートメソッドパターンの適用

**3.2 カスタムフックによるロジックの抽象化**

```typescript
// useFileDownloads.ts - ダウンロード共通処理を抽象化
export const useFileDownloads = () => {
  const downloadFile = useCallback(async (
    url: string,
    filename: string,
    onProgress?: (progress: number) => void
  ) => {
    // 共通のダウンロードロジック
    const blob = await fetch(url).then(r => r.blob());
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  return { downloadFile };
};

// 使用例
const { downloadFile } = useFileDownloads();
await downloadFile(pdfUrl, '配分表.pdf');
```

#### ❌ 問題点と改善が必要な領域

**3.1 モーダル管理の抽象化不足**

```typescript
// ❌ 現状: 各ページで個別にモーダル状態を管理
const AllocationHistoryPage = () => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  // ... 5個のモーダル
};

// ✅ 改善: 汎用的なモーダル管理フック
export const useModals = <T extends Record<string, boolean>>(
  initialState: T
) => {
  const [modals, setModals] = useState(initialState);

  const open = (key: keyof T) => setModals(prev => ({ ...prev, [key]: true }));
  const close = (key: keyof T) => setModals(prev => ({ ...prev, [key]: false }));
  const toggle = (key: keyof T) => setModals(prev => ({ ...prev, [key]: !prev[key] }));

  return { modals, open, close, toggle };
};

// 使用例
const { modals, open, close } = useModals({
  detail: false,
  settings: false,
  filter: false,
});
```

**3.2 テーブルレンダリングの共通化**

```typescript
// ✅ 提案: DataGrid用の共通設定フック
export const useDataGridConfig = <T extends GridValidRowModel>(
  options: DataGridConfigOptions
) => {
  const defaultConfig = useMemo(() => ({
    density: 'compact',
    pagination: true,
    pageSize: 25,
    localeText: jaJP.components.MuiDataGrid.defaultProps.localeText,
    // ...
  }), []);

  return { ...defaultConfig, ...options };
};
```

---

### 4. 単一情報源の確立：一元管理 ⭐⭐⭐⭐☆ 85%

#### ✅ 良好な実装

**4.1 型定義の SSOT**

```typescript
// types/index.ts - 単一のエントリーポイント
export * from './product';
export * from './order';
export * from './store';
export * from './api';
// ...

// README.md で使用方法を明示
/**
 * 型定義は types/index.ts から import すること
 *
 * ✅ Good:
 * import type { OrderData, ProductData } from '@/types';
 *
 * ❌ Bad:
 * import type { OrderData } from '@/types/order';
 */
```

**4.2 定数の一元管理**

```typescript
// constants/zIndex.ts - z-index を一元管理
export const MODAL_Z_INDEX = {
  BASE: 1300,
  PDF_PREVIEW: 1400,
  DIALOG: 1500,
  TOOLTIP: 1600,
  SNACKBAR: 1700,
} as const;

// スクリプトでチェック
// scripts/check-zindex.ts
// z-indexのハードコードを検出して警告
```

**4.3 環境設定の一元化**

```typescript
// config/env.ts
export const env = {
  apiUrl: import.meta.env.VITE_API_URL,
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    // ...
  },
  features: {
    enableOfflineMode: import.meta.env.VITE_ENABLE_OFFLINE === 'true',
    enableDebugMode: import.meta.env.MODE === 'development',
  },
} as const;
```

#### ❌ 問題点と改善が必要な領域

**4.1 型定義の重複**

```typescript
// ❌ types/order.ts
export interface OrderFormData { /* ... */ } // @deprecated

// ❌ schemas/orderSchema.ts
export const orderSchema = z.object({ /* ... */ });

// ✅ 改善: Zod schema から型を推論
export const orderSchema = z.object({ /* ... */ });
export type OrderFormData = z.infer<typeof orderSchema>;

// types/order.ts から重複定義を削除
```

**4.2 エラーメッセージの分散**

```typescript
// ❌ 現状: 各コンポーネントでハードコード
throw new Error('注文の保存に失敗しました');
throw new Error('帳合先を選択してください');

// ✅ 改善: メッセージを一元管理
// messages/errors.ts
export const ERROR_MESSAGES = {
  ORDER: {
    SAVE_FAILED: '注文の保存に失敗しました',
    SUPPLIER_REQUIRED: '帳合先を選択してください',
    PRODUCT_REQUIRED: '商品を追加してください',
  },
  VALIDATION: {
    REQUIRED: (field: string) => `${field}は必須です`,
    INVALID_FORMAT: (field: string) => `${field}の形式が正しくありません`,
  },
} as const;

// 使用例
throw new Error(ERROR_MESSAGES.ORDER.SAVE_FAILED);
```

---

### 5. スケーラブルで安全な構成 ⭐⭐⭐☆☆ 65%

#### ✅ 良好な実装

**5.1 Branded Types による型安全性**

```typescript
// utils/brandedTypes.ts
export type UserId = Brand<string, 'UserId'>;
export type OrderId = Brand<string, 'OrderId'>;

// 型の混同を防止
function getOrder(orderId: OrderId) { /* ... */ }

const userId: UserId = 'user-123' as UserId;
const orderId: OrderId = 'order-456' as OrderId;

getOrder(userId); // ❌ Type error!
getOrder(orderId); // ✅ OK
```

**5.2 Zod によるランタイムバリデーション**

```typescript
// schemas/orderSchema.ts
export const orderSchema = z.object({
  deliveryDate: z.date(),
  suppliers: z.array(z.string()).min(1, '帳合先を選択してください'),
  products: z.array(productSchema).min(1, '商品を追加してください'),
});

// 実行時に検証
const result = orderSchema.safeParse(data);
if (!result.success) {
  throw new ValidationError(result.error);
}
```

#### ❌ 問題点と改善が必要な領域

**5.1 テストカバレッジ不足**

```
現状のカバレッジ（推定）:
- Repository層: 71%  ✅ 良好
- Hooks層: 50%       ⚠️ 改善必要
- Components層: 4%   🔴 不十分
- Pages層: 0%        🔴 テストなし
```

**改善案:**

```typescript
// AllocationHistoryPage.test.tsx （新規作成）
describe('AllocationHistoryPage', () => {
  it('should load and display batches', async () => {
    const { getByText, getByRole } = render(<AllocationHistoryPage />);

    await waitFor(() => {
      expect(getByText('配分履歴一覧')).toBeInTheDocument();
    });
  });

  it('should open detail modal on row click', async () => {
    const { getByRole } = render(<AllocationHistoryPage />);

    const row = getByRole('row', { name: /2025-01-01/ });
    fireEvent.click(row);

    await waitFor(() => {
      expect(getByRole('dialog')).toBeInTheDocument();
    });
  });
});
```

**5.2 エラーハンドリングの標準化不足**

```typescript
// ❌ 現状: 各コンポーネントで個別対応
try {
  await saveOrder(order);
} catch (error) {
  console.error(error);
  alert('エラーが発生しました');
}

// ✅ 改善: エラー境界とグローバルハンドラー
// components/common/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logErrorToService(error, errorInfo);
    this.setState({ hasError: true, error });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// services/error/ErrorHandler.ts
export class ErrorHandler {
  handle(error: Error): void {
    if (error instanceof ValidationError) {
      notificationService.error(error.message);
    } else if (error instanceof NetworkError) {
      notificationService.error('ネットワークエラーが発生しました');
    } else {
      notificationService.error('予期しないエラーが発生しました');
      logErrorToService(error);
    }
  }
}
```

**5.3 セキュリティベストプラクティスの適用不足**

```typescript
// ✅ 追加推奨: Content Security Policy
// index.html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">

// ✅ 追加推奨: XSS対策
// utils/sanitize.ts
import DOMPurify from 'dompurify';

export const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty);
};

// 使用例
<div dangerouslySetInnerHTML={{ __html: sanitizeHTML(userInput) }} />
```

---

### 6. 保守性・再利用性向上 ⭐⭐⭐☆☆ 70%

#### ✅ 良好な実装

**6.1 一貫した命名規則**

```typescript
// フック: use + 機能名
useOrderSubmit
useProductActions
useAllocationHistory

// コンポーネント: PascalCase
OrderFormCard
ProductPresetModal
AllocationHistoryTable

// サービス: ドメイン + Service
OrderService
TemplateService
EmailService

// リポジトリ: エンティティ + Repository
OrderRepository
ProductHistoryRepository
```

**6.2 設計パターンの統一**

```typescript
// Container/Presentational パターン
// Container: ロジックを持つ
const OrderFormContainer = () => {
  const { data, loading } = useOrderData();
  return <OrderFormView data={data} loading={loading} />;
};

// Presentational: 表示のみ
const OrderFormView = ({ data, loading }) => {
  if (loading) return <Skeleton />;
  return <div>{data}</div>;
};
```

#### ❌ 問題点と改善が必要な領域

**6.1 JSDoc ドキュメントの不足**

```typescript
// ❌ 現状: 一部のファイルのみドキュメント化
export const useOrderSubmit = () => {
  // ...
};

// ✅ 改善: すべての公開APIにJSDoc
/**
 * 注文送信フック
 *
 * 注文データの検証、送信、履歴保存を行います。
 *
 * @example
 * ```tsx
 * const { submit, isSubmitting } = useOrderSubmit();
 *
 * const handleSubmit = async (data: OrderFormData) => {
 *   const result = await submit(data);
 *   console.log(result.orderId);
 * };
 * ```
 *
 * @returns {UseOrderSubmitReturn} 送信関数と状態
 */
export const useOrderSubmit = (): UseOrderSubmitReturn => {
  // ...
};
```

**6.2 Storybook の未導入**

```typescript
// ✅ 提案: Storybook でコンポーネントカタログ作成
// ProductFormCard.stories.tsx
export default {
  title: 'Forms/ProductFormCard',
  component: ProductFormCard,
} as Meta;

export const Default: Story = {
  args: {
    productIndex: 0,
    defaultValues: mockProductData,
  },
};

export const WithErrors: Story = {
  args: {
    productIndex: 0,
    errors: { name: { message: '商品名は必須です' } },
  },
};
```

**6.3 共通コンポーネントライブラリの不足**

```typescript
// ✅ 提案: 再利用可能なコンポーネントライブラリ
// components/common/DataTable/DataTable.tsx
export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  pagination?: boolean;
}

export const DataTable = <T,>({
  data,
  columns,
  loading,
  onRowClick,
  pagination = true,
}: DataTableProps<T>) => {
  // 共通のテーブルロジック
  // DataGrid の設定を標準化
};

// 使用例
<DataTable
  data={orders}
  columns={orderColumns}
  onRowClick={handleRowClick}
/>
```

---

### 7. シンプルさ重視 ⭐⭐⭐☆☆ 60%

#### ✅ 良好な実装

**7.1 シンプルな状態管理**

```typescript
// Zustand でシンプルに状態管理
const useOrderFormStore = create<OrderFormState>((set) => ({
  activeStep: 0,
  setActiveStep: (step) => set({ activeStep: step }),

  nextStep: () => set((state) => ({
    activeStep: Math.min(state.activeStep + 1, TOTAL_STEPS - 1)
  })),
}));

// Redux と比較して大幅にシンプル
```

**7.2 React Hook Form によるフォーム管理**

```typescript
// シンプルなフォーム宣言
const methods = useForm<OrderFormData>({
  defaultValues: { /* ... */ },
});

// バリデーションはスキーマで宣言的に
const schema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
});
```

#### ❌ 問題点と改善が必要な領域

**7.1 過度な抽象化**

```typescript
// ❌ 現状: 3階層の抽象化
useOrderSubmit
  └─→ useOrderDataSubmit
       └─→ OrderService
            └─→ FirestoreServiceFacade
                 └─→ OrderRepository

// ✅ 改善: 2階層に削減
useOrderSubmit
  └─→ OrderService
       └─→ OrderRepository

// useOrderDataSubmit は useOrderSubmit に統合
```

**7.2 不要な Context の削除**

```typescript
// ❌ 現状: OrderFormContext が Zustand と重複
// context/OrderFormContext.tsx (削除)

// ✅ 改善: Zustand のみ使用
import { useOrderFormStore } from '@/stores/orderFormStore';
```

**7.3 Dead Code の削除**

```typescript
// ❌ @deprecated マークされたコードが残存
// services/firebase/firestoreService.ts (@deprecated)
// types/order.ts - OrderFormData (@deprecated)

// ✅ 改善: 完全に削除して技術債を減らす
```

---

### 8. トレードオフの明示 ⭐⭐☆☆☆ 40%

#### ❌ 現状の課題

**8.1 アーキテクチャ決定記録（ADR）の不在**

現在、設計判断の理由が記録されていません。

**改善案:**

```markdown
# ADR-001: Zustand を状態管理ライブラリに選定

## ステータス
承認済み

## コンテクスト
フロントエンドの状態管理ライブラリを選定する必要がある。
候補: Redux, Zustand, Jotai, Recoil

## 決定
Zustand を採用する

## 理由
- シンプルなAPI（学習コスト低）
- Redux DevTools 対応
- TypeScript サポートが優秀
- バンドルサイズが小さい（2KB）
- 既存のReact Hook Formと相性が良い

## トレードオフ
✅ メリット:
- 開発速度が速い
- 保守が容易

❌ デメリット:
- Reduxほどエコシステムが大きくない
- 大規模アプリでのベストプラクティスが少ない

## 影響
- 全開発者がZustandを学習する必要がある
- 既存のContextベースのコードを段階的に移行
```

**8.2 パフォーマンス vs 可読性のトレードオフ**

```typescript
// ❌ 現状: トレードオフが明示されていない
const columns = useMemo(() => generateColumns(), []);

// ✅ 改善: コメントで説明
/**
 * カラム定義をメモ化
 *
 * トレードオフ:
 * - パフォーマンス: 再レンダリング時に再計算を防ぐ
 * - 可読性: useMemo により若干コードが複雑に
 *
 * 判断: AllocationHistoryPage は2,486行と大規模なため、
 *       パフォーマンスを優先してメモ化を適用
 */
const columns = useMemo(() => generateColumns(), []);
```

---

## 🚀 段階的リファクタリング計画

### Phase 1: 緊急対応（2週間）- 2025年12月

**目標**: 最も影響の大きい問題を修正

#### Week 1-2: AllocationHistoryPage の分割

**タスク:**
1. **AllocationHistoryContainer の作成** (Day 1-2)
   ```typescript
   // pages/AllocationHistoryPage/AllocationHistoryContainer.tsx
   - データフェッチング
   - フィルタリング
   - モーダル管理
   ```

2. **プレゼンテーショナルコンポーネント分割** (Day 3-5)
   ```typescript
   // components/AllocationHistory/
   - AllocationHistoryTable.tsx (200行)
   - AllocationHistoryToolbar.tsx (100行)
   - AllocationDetailModal.tsx (300行)
   - AllocationFilterDrawer.tsx (150行)
   - AllocationCalendarView.tsx (200行)
   ```

3. **カスタムフック抽出** (Day 6-8)
   ```typescript
   // hooks/
   - useAllocationBatches.ts
   - useAllocationFilters.ts
   - useAllocationModals.ts
   - useAllocationStatistics.ts
   ```

4. **テスト作成** (Day 9-10)
   ```typescript
   - AllocationHistoryContainer.test.tsx
   - AllocationHistoryTable.test.tsx
   - useAllocationBatches.test.ts
   ```

**期待効果:**
- ✅ 2,486行 → 8ファイル × 平均250行
- ✅ テストカバレッジ 0% → 60%
- ✅ 保守性が大幅に向上

---

### Phase 2: 構造改善（4週間）- 2025年1月

**目標**: アーキテクチャの整理と標準化

#### Week 1: 状態管理の統一

**タスク:**
1. OrderFormContext を Zustand に移行
2. Context API は認証・テーマのみに限定
3. 全モーダル状態を Zustand に集約

**実装例:**
```typescript
// stores/orderFormStore.ts に統合
interface OrderFormState {
  // 既存の状態
  activeStep: number;

  // OrderFormContext から移行
  suppliers: string[];
  products: ProductFormData[];

  // アクション
  addSupplier: (supplier: string) => void;
  removeSupplier: (supplier: string) => void;
  addProduct: (product: ProductFormData) => void;
}
```

#### Week 2: レガシーコードの削除

**タスク:**
1. `firestoreService.ts` (@deprecated) を完全削除
2. すべての参照を `FirestoreServiceFacade` に変更
3. 重複型定義の削除（Zodスキーマに統一）

**マイグレーションスクリプト:**
```bash
# 1. firestoreService.ts の使用箇所を検索
grep -r "import.*firestoreService" frontend/src/

# 2. 一括置換
find frontend/src -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i 's/import.*firestoreService/import { FirestoreServiceFacade }/g'

# 3. テスト実行
npm test

# 4. firestoreService.ts を削除
rm frontend/src/services/firebase/firestoreService.ts
```

#### Week 3-4: Feature-Sliced Design への移行

**タスク:**
1. `features/` ディレクトリ作成
2. `allocation-history` フィーチャーの移行
3. `order` フィーチャーの整理

**新しいディレクトリ構造:**
```
frontend/src/
├── features/
│   ├── allocation-history/
│   │   ├── api/              # データ取得
│   │   ├── components/       # UI コンポーネント
│   │   ├── hooks/            # カスタムフック
│   │   ├── types/            # ローカル型定義
│   │   └── index.ts          # 公開インターフェース
│   ├── order/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
│   └── product/
│       ├── api/
│       ├── components/
│       └── index.ts
├── shared/                   # 共通リソース
│   ├── ui/                   # 共通UIコンポーネント
│   ├── lib/                  # ユーティリティ
│   └── api/                  # API クライアント
└── pages/                    # ルーティングのみ
    ├── AllocationHistoryPage.tsx
    └── NewOrderPage.tsx
```

**マイグレーション手順:**
```bash
# 1. features ディレクトリ作成
mkdir -p frontend/src/features/allocation-history/{api,components,hooks,types}

# 2. ファイルを移動
mv frontend/src/components/AllocationHistory* \
   frontend/src/features/allocation-history/components/

mv frontend/src/hooks/useAllocation* \
   frontend/src/features/allocation-history/hooks/

# 3. import パスを更新
# @/components/AllocationHistory → @/features/allocation-history/components
```

---

### Phase 3: 品質向上（4週間）- 2025年2月

**目標**: テスト・ドキュメント・パフォーマンス改善

#### Week 1-2: テストカバレッジ向上

**目標:** コンポーネント層 4% → 40%

**優先順位:**
1. **P0: 主要ページコンポーネント**
   - AllocationHistoryPage
   - NewOrderPage
   - UserProfilePage

2. **P1: 共通コンポーネント**
   - ProductFormCard
   - StoreAllocationForm
   - AllocationPreviewModal

3. **P2: フォームコンポーネント**
   - ProductBasicInfoForm
   - ProductPricingForm

**テストテンプレート:**
```typescript
// AllocationHistoryPage.test.tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AllocationHistoryPage } from './AllocationHistoryPage';
import { createMockFirestore } from '@/test-utils/firestore';

describe('AllocationHistoryPage', () => {
  beforeEach(() => {
    // モックデータのセットアップ
  });

  describe('初期表示', () => {
    it('should display loading state initially', () => {
      const { getByRole } = render(<AllocationHistoryPage />);
      expect(getByRole('progressbar')).toBeInTheDocument();
    });

    it('should load and display batches', async () => {
      const { getByText } = render(<AllocationHistoryPage />);

      await waitFor(() => {
        expect(getByText('配分履歴一覧')).toBeInTheDocument();
      });
    });
  });

  describe('フィルタリング', () => {
    it('should filter batches by supplier', async () => {
      const { getByLabelText, queryByText } = render(<AllocationHistoryPage />);

      fireEvent.click(getByLabelText('帳合先フィルタ'));
      fireEvent.click(getByText('帳合先A'));

      await waitFor(() => {
        expect(queryByText('帳合先B')).not.toBeInTheDocument();
      });
    });
  });

  describe('モーダル操作', () => {
    it('should open detail modal on row click', async () => {
      const { getByRole } = render(<AllocationHistoryPage />);

      const row = getByRole('row', { name: /2025-01-01/ });
      fireEvent.click(row);

      await waitFor(() => {
        expect(getByRole('dialog')).toBeInTheDocument();
      });
    });
  });
});
```

#### Week 3: E2E テスト実装

**Playwright シナリオ:**
```typescript
// e2e/allocation-history.spec.ts
import { test, expect } from '@playwright/test';

test.describe('配分履歴機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/allocation-history');
    await page.waitForLoadState('networkidle');
  });

  test('配分履歴一覧が表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '配分履歴一覧' }))
      .toBeVisible();

    // テーブルが表示される
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('行をクリックすると詳細モーダルが開く', async ({ page }) => {
    // 最初の行をクリック
    await page.getByRole('row').first().click();

    // モーダルが表示される
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('配分詳細')).toBeVisible();
  });

  test('フィルタリングが機能する', async ({ page }) => {
    // フィルタボタンをクリック
    await page.getByRole('button', { name: 'フィルタ' }).click();

    // 帳合先を選択
    await page.getByLabel('帳合先A').check();
    await page.getByRole('button', { name: '適用' }).click();

    // フィルタ結果を確認
    await expect(page.getByText('帳合先A')).toBeVisible();
    await expect(page.getByText('帳合先B')).not.toBeVisible();
  });
});
```

#### Week 4: ドキュメント整備

**作成するドキュメント:**

1. **API ドキュメント** (TypeDoc)
   ```bash
   npm install -D typedoc
   npx typedoc --out docs/api src/index.ts
   ```

2. **アーキテクチャ決定記録（ADR）**
   ```markdown
   docs/adr/
   ├── 001-zustand-state-management.md
   ├── 002-repository-pattern.md
   ├── 003-feature-sliced-design.md
   └── 004-testing-strategy.md
   ```

3. **コンポーネントカタログ** (Storybook)
   ```bash
   npx storybook@latest init

   # Storybook ファイル作成
   components/
   ├── ProductFormCard/
   │   ├── ProductFormCard.tsx
   │   ├── ProductFormCard.stories.tsx
   │   └── ProductFormCard.test.tsx
   ```

---

### Phase 4: パフォーマンス最適化（2週間）- 2025年3月

**目標**: 初期ロード時間 30% 改善

#### Week 1: バンドル最適化

**タスク:**
1. **コード分割（Code Splitting）**
   ```typescript
   // App.tsx
   import { lazy, Suspense } from 'react';

   const AllocationHistoryPage = lazy(() =>
     import('./pages/AllocationHistoryPage')
   );

   const NewOrderPage = lazy(() =>
     import('./pages/NewOrderPage')
   );

   function App() {
     return (
       <Suspense fallback={<PageSkeleton />}>
         <Routes>
           <Route path="/allocation-history" element={<AllocationHistoryPage />} />
           <Route path="/new-order" element={<NewOrderPage />} />
         </Routes>
       </Suspense>
     );
   }
   ```

2. **依存関係の最適化**
   ```bash
   # バンドルサイズ分析
   npm run build
   npx vite-bundle-visualizer

   # 重い依存を特定
   # - date-fns: 必要な関数のみimport
   # - MUI: tree-shaking を確認
   ```

3. **画像・アセットの最適化**
   ```bash
   # 画像圧縮
   npm install -D vite-plugin-image-optimizer
   ```

#### Week 2: レンダリング最適化

**タスク:**
1. **React.memo の適用**
   ```typescript
   // AllocationHistoryTable.tsx
   export const AllocationHistoryTable = React.memo(({ batches, onRowClick }) => {
     // ...
   }, (prev, next) => {
     // カスタム比較関数
     return prev.batches === next.batches && prev.onRowClick === next.onRowClick;
   });
   ```

2. **useMemo / useCallback の最適化**
   ```typescript
   // 重い計算をメモ化
   const statistics = useMemo(() => {
     return calculateStatistics(batches);
   }, [batches]);

   // コールバックを安定化
   const handleRowClick = useCallback((row: AllocationBatch) => {
     setSelectedBatch(row);
     setShowDetailModal(true);
   }, []);
   ```

3. **仮想化（Virtualization）**
   ```typescript
   // 大量データのテーブルを仮想化
   import { DataGrid } from '@mui/x-data-grid';

   <DataGrid
     rows={batches}
     columns={columns}
     virtualization  // 仮想化を有効化
     rowHeight={52}
   />
   ```

**パフォーマンス目標:**
```
Before:
- 初期ロード: 2.5秒
- バンドルサイズ: 1.2MB
- Time to Interactive: 3.5秒

After:
- 初期ロード: 1.5秒 (40% 改善)
- バンドルサイズ: 800KB (33% 削減)
- Time to Interactive: 2.0秒 (43% 改善)
```

---

## 📈 成功指標（KPI）

### コード品質指標

| 指標 | 現状 | 目標 | 達成期限 |
|------|------|------|---------|
| 最大ファイル行数 | 2,486行 | 250行以下 | Phase 1終了 |
| テストカバレッジ（全体） | 67% | 80% | Phase 3終了 |
| テストカバレッジ（UI） | 4% | 40% | Phase 3終了 |
| 循環的複雑度（平均） | 15 | 10以下 | Phase 2終了 |
| 技術的負債（@deprecated） | 5ファイル | 0ファイル | Phase 2終了 |

### パフォーマンス指標

| 指標 | 現状 | 目標 | 達成期限 |
|------|------|------|---------|
| 初期ロード時間 | 2.5秒 | 1.5秒 | Phase 4終了 |
| バンドルサイズ | 1.2MB | 800KB | Phase 4終了 |
| Lighthouse スコア | 75 | 90+ | Phase 4終了 |

### 開発生産性指標

| 指標 | 現状 | 目標 | 達成期限 |
|------|------|------|---------|
| ビルド時間 | 45秒 | 30秒 | Phase 4終了 |
| 新機能開発時間 | 5日 | 3日 | Phase 3終了 |
| バグ修正時間 | 2日 | 1日 | Phase 2終了 |

---

## ⚠️ リスクと対策

### リスク1: リファクタリング中のバグ混入

**リスクレベル**: 🔴 高

**対策:**
1. **段階的移行**
   - 一度に全体を変更せず、フィーチャーごとに移行
   - Facade パターンで既存コードとの互換性を維持

2. **包括的なテスト**
   - リファクタリング前にテストを作成
   - リグレッションテストを自動化

3. **コードレビュー**
   - すべての変更をレビュー
   - リファクタリングPRは小さく保つ（300行以内）

### リスク2: スケジュール遅延

**リスクレベル**: 🟡 中

**対策:**
1. **優先度付け**
   - Phase 1-2 を最優先（緊急度が高い）
   - Phase 3-4 は段階的にリリース可能

2. **週次レビュー**
   - 毎週進捗を確認
   - ブロッカーを早期に解決

3. **バッファの確保**
   - 各フェーズに20%のバッファを設定

### リスク3: パフォーマンス劣化

**リスクレベル**: 🟡 中

**対策:**
1. **継続的な計測**
   - Lighthouse CI を導入
   - パフォーマンスベンチマークを自動化

2. **段階的な最適化**
   - Phase 4 でパフォーマンスに集中
   - 計測 → 最適化 → 検証のサイクル

---

## 📝 承認とレビュー

### 承認プロセス

- [ ] 技術リード承認
- [ ] プロダクトオーナー承認
- [ ] セキュリティレビュー完了
- [ ] パフォーマンステスト完了

### レビュー項目

- [ ] リファクタリング計画の妥当性
- [ ] スケジュールの実現可能性
- [ ] リソース配分の適切性
- [ ] リスク対策の十分性

---

## 🔗 関連ドキュメント

- [追加機能実装計画書](./FEATURE_IMPLEMENTATION_PLAN_2025.md)
- [今後のアップデートロードマップ](./UPDATE_ROADMAP_2025.md)
- [アーキテクチャ概要](./README.md)
- [既存リファクタリング計画](../_archive/2025-rfcs/001-comprehensive-refactoring-plan.md)

---

**最終更新日**: 2025-11-30
**次回レビュー**: 2025-12-15
