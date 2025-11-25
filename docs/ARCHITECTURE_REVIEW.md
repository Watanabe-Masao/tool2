# コードベース アーキテクチャレビュー & 改善計画

> **レビュー日**: 2025年11月25日
> **対象**: frontend/ (Vite + React TypeScript プロジェクト)
> **規模**: 171 TypeScript ファイル、41,313行のコード

---

## 目次

1. [現状分析サマリー](#現状分析サマリー)
2. [設計原則に基づく評価](#設計原則に基づく評価)
3. [特定された問題点](#特定された問題点)
4. [改善計画](#改善計画)
5. [技術的負債の解消](#技術的負債の解消)
6. [フレームワーク・ライブラリの最適化](#フレームワークライブラリの最適化)
7. [将来の拡張性](#将来の拡張性)

---

## 現状分析サマリー

### 技術スタック

| カテゴリ | 現状 | 評価 |
|---------|------|------|
| **ビルドツール** | Vite 7.2.2 | ✅ 最新・最適 |
| **フレームワーク** | React 19.2.0 | ✅ 最新 |
| **ルーティング** | React Router 5.3.4 | ⚠️ v6移行推奨 |
| **状態管理** | Zustand + React Hook Form + Context | ⚠️ 複雑 |
| **UIライブラリ** | MUI 6.3 + Ionic 8.5 | ⚠️ 重複 |
| **型安全性** | TypeScript 5.9 + Zod | ✅ 良好 |
| **データ取得** | Axios + React Query (未活用) | ⚠️ 改善余地 |

### アーキテクチャの健全性スコア

```
単一情報源 (SSOT)     : ████████░░ 80%
関心の分離            : ██████░░░░ 60%
責務の明確化          : ███████░░░ 70%
疎結合・高凝集        : █████░░░░░ 50%
抽象化・隠蔽          : ███████░░░ 70%
変更容易性            : ██████░░░░ 60%
スケーラビリティ      : ███████░░░ 70%
シンプルさ            : ████░░░░░░ 40%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
総合評価              : ██████░░░░ 62.5%
```

---

## 設計原則に基づく評価

### 1. 単一情報源の原則 (SSOT) - 80%

**良い点:**
- `types/index.ts` で型定義を一元化
- `schemas/orderSchema.ts` でZodスキーマから型を生成
- `utils/constants.ts` で定数を集約

**問題点:**
```typescript
// 問題: FirestoreServiceとFirestoreServiceFacadeの二重構造
// src/context/ServiceContext.tsx
import { FirestoreService } from '@/services/firebase/firestoreService';
// 別の場所では
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
```

**改善案:**
- `FirestoreService` を非推奨にし、`FirestoreServiceFacade` に一本化
- 店舗データ (`STORE_DATA`) を外部設定またはAPIから取得

---

### 2. 関心の分離 - 60%

**良い点:**
- Repository パターンの導入
- hooks/ による ロジック分離
- services/ によるビジネスロジック層の分離

**問題点:**

```typescript
// 問題1: NewOrderPage.tsx が17+のhookを使用
// src/pages/NewOrderPage.tsx:41-236
export const NewOrderPage: React.FC = () => {
  // 17個以上のhookを直接使用
  const { user } = useAuthContext();
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();
  const { setStepNavigation, showProgressSummary } = useNavigationContext();
  const { isOnline, saveOrder: saveOrderWithSync } = useDataSync();
  const supplierAutocomplete = useAutocomplete('supplier');
  const productNameAutocomplete = useAutocomplete('productName');
  const originAutocomplete = useAutocomplete('origin');
  const userSettings = useUserSettings(user);
  // ... さらに続く
};
```

```typescript
// 問題2: FloatingProgressSummary.tsx が896行と肥大化
// 複数の責務が混在:
// - 進捗表示
// - 商品カード表示
// - コンテキストメニュー
// - 配分編集モーダル
// - 長押し検知
```

**改善案:**
- `NewOrderPage` を複数のContainer/Presenterに分割
- `FloatingProgressSummary` を `ProgressHeader`, `ProductCardList`, `AllocationModal` に分割

---

### 3. 責務の明確化 - 70%

**良い点:**
- Service層のインターフェース定義 (`IFirestoreService`, `ITemplateService`)
- カスタムフックによるロジック抽出

**問題点:**

```typescript
// 問題: 29個のhookが存在し、責務が断片化
// 類似名のhookが多数:
- useOrderFormState
- useFormStepState
- useFormLockState
- useProductIndexState
- useOrderSubmit
- useOrderDataSubmit
- useOrderHandlers
```

**改善案:**
- フックの統合・再編成
- ドメインごとのフック整理 (`useOrder*`, `useProduct*`, `useForm*`)

---

### 4. 疎結合・高凝集 - 50%

**問題点:**

```typescript
// 問題1: NewOrderPage から OrderFormWithTabs への過剰なprops渡し
<OrderFormWithTabs
  isMobile={isMobile}
  control={control}
  errors={errors}
  productFields={productFields}
  appendProduct={appendProduct}
  removeProduct={removeProduct}
  moveProduct={moveProduct}
  handleSubmit={handleSubmit}
  supplierOptions={supplierAutocomplete.options}
  productNameOptions={productNameAutocomplete.options}
  originOptions={originAutocomplete.options}
  suppliers={suppliers || []}
  products={products || []}
  deliveryDate={deliveryDate}
  generatedFiles={generatedFiles}
  setGeneratedFiles={setGeneratedFiles}
  setExcelBlob={setExcelBlob}
  handleSuppliersChange={handleSuppliersChange}
  onSubmit={onSubmit}
  handleAllocationChange={handleAllocationChange}
  handleDownloadExcel={handleDownloadExcel}
  handleDownloadPdf={handleDownloadPdf}
/>
// 20+のpropsはProp Drilling問題
```

**改善案:**
- Contextパターンの活用 (`OrderFormContext`)
- Compound Componentパターンの導入

---

### 5. 抽象化・隠蔽 - 70%

**良い点:**
- `ServiceContext` によるDI
- `FirestoreServiceFacade` による抽象化
- Branded Types (`UserId`, `OrderId`) の導入

**問題点:**
```typescript
// 問題: ServiceContextでスタティックメソッドを参照
// テスト時のモック差し替えが困難
const services = useMemo<Services>(
  () => ({
    firestoreService: overrideServices?.firestoreService ?? FirestoreService,
    // ↑ スタティッククラスへの参照
```

**改善案:**
- インスタンスベースのDI
- Factory パターンの導入

---

### 6. 変更容易性 - 60%

**問題点:**
- React Router v5 の使用（v6が標準）
- Ionic と MUI の混在

**改善案:**
- React Router v6への移行
- UIライブラリの統一

---

### 7. スケーラビリティ - 70%

**良い点:**
- PWA対応
- React Query導入済み（未活用）
- IndexedDBによるオフライン対応

**問題点:**
- React Queryの実活用が限定的
- バンドルサイズの最適化余地

---

### 8. シンプルさ - 40%

**問題点:**

```json
// package.json に重複ライブラリ
"@splidejs/react-splide": "^0.7.12",  // カルーセル
"swiper": "^12.0.3",                   // カルーセル（重複）

"@ionic/react": "^8.5.4",              // モバイルUI
"@mui/material": "^6.3.0",             // UIライブラリ（重複機能多数）
```

```typescript
// 3つの状態管理手法が混在
// 1. Zustand
const activeStep = useOrderFormStore((state) => state.activeStep);

// 2. React Hook Form
const methods = useForm<OrderFormData>({...});

// 3. Context API
const { user, loading } = useAuthContext();
```

---

## 特定された問題点

### 🔴 Critical (即時対応推奨)

| # | 問題 | 影響 | 場所 |
|---|------|------|------|
| C1 | React Router v5 使用 | セキュリティ・保守性 | App.tsx |
| C2 | Splide + Swiper 重複 | バンドルサイズ | package.json |
| C3 | 896行のコンポーネント | 保守性・可読性 | FloatingProgressSummary.tsx |

### 🟠 High (近々対応推奨)

| # | 問題 | 影響 | 場所 |
|---|------|------|------|
| H1 | 17+ hooks in NewOrderPage | 可読性・テスト容易性 | NewOrderPage.tsx |
| H2 | 20+ props drilling | 保守性 | OrderFormWithTabs |
| H3 | Service二重構造 | SSOT違反 | FirestoreService* |
| H4 | 29個の分断されたhooks | 認知負荷 | hooks/ |
| H5 | Ionic + MUI 混在 | 一貫性・バンドルサイズ | App.tsx |

### 🟡 Medium (計画的対応)

| # | 問題 | 影響 | 場所 |
|---|------|------|------|
| M1 | React Query未活用 | キャッシュ効率 | services/ |
| M2 | Error Boundary未導入 | ユーザー体験 | App.tsx |
| M3 | 店舗データハードコード | 変更容易性 | constants.ts |
| M4 | テストカバレッジ | 品質保証 | __tests__/ |

---

## 改善計画

### Phase 1: 技術的負債解消 (1-2週間)

#### 1.1 React Router v5 → v6 移行

```typescript
// Before (v5)
<Route exact path="/login">
  {user ? <Redirect to="/new-order" /> : <LoginPage />}
</Route>

// After (v6)
<Route path="/login" element={
  user ? <Navigate to="/new-order" replace /> : <LoginPage />
} />
```

**変更ファイル:**
- `App.tsx`
- `components/layout/MainLayout.tsx`
- `components/common/ProtectedRoute.tsx`

#### 1.2 重複ライブラリ削除

```bash
# Splideを削除、Swiperに統一
npm uninstall @splidejs/react-splide @splidejs/splide
```

**変更ファイル:**
- `components/forms/FloatingProgressSummary.tsx`
- その他Splide使用箇所

#### 1.3 コンポーネント分割

```
FloatingProgressSummary.tsx (896行)
  ├── ProgressHeader.tsx (~100行)
  ├── ProductCardSwiper.tsx (~200行)
  ├── ProductCard.tsx (~150行)
  ├── ProgressStepList.tsx (~100行)
  ├── AllocationEditModal.tsx (~100行)
  └── FloatingProgressContainer.tsx (~150行)
```

---

### Phase 2: アーキテクチャ改善 (2-3週間)

#### 2.1 Hook統合・再編成

```
現状 (29 hooks):
├── useOrderFormState
├── useFormStepState
├── useFormLockState
├── useProductIndexState
├── useOrderSubmit
├── useOrderDataSubmit
├── useOrderHandlers
├── ... (22 more)

改善後 (12-15 hooks):
├── useOrderForm (統合: form state + step + handlers)
├── useOrderSubmission (統合: submit + template generation)
├── useProductManagement (統合: product actions + history)
├── useStoreAllocation (統合: allocation + lock)
├── useAutocomplete
├── useDraftManagement
├── useSupplierPresets
├── useEmailAddressBook
├── usePricingHistory
├── useDataSync
├── useAuth
├── useKeyboardShortcuts
└── useUserSettings
```

#### 2.2 OrderFormContext 導入

```typescript
// contexts/OrderFormContext.tsx
interface OrderFormContextValue {
  // Form state
  form: UseFormReturn<OrderFormData>;

  // Navigation
  activeStep: number;
  activeProductIndex: number;
  goToStep: (step: number) => void;
  goToProduct: (index: number) => void;

  // Actions
  addProduct: () => void;
  removeProduct: (index: number) => void;
  submitOrder: () => Promise<void>;

  // Autocomplete
  supplierOptions: string[];
  productNameOptions: string[];
  originOptions: string[];
}

export const OrderFormProvider: React.FC = ({ children }) => {
  // 統合されたロジック
};

// コンポーネントでの使用
const { form, activeStep, addProduct } = useOrderFormContext();
```

#### 2.3 Service層の統一

```typescript
// services/FirestoreService.ts を削除
// services/firestore/FirestoreServiceFacade.ts に一本化

// ServiceContext の更新
const services = useMemo<Services>(() => ({
  firestoreService: new FirestoreServiceFacade(getFirebaseFirestore()),
  templateService: new TemplateService(),
  sessionStorageService: new SessionStorageService(),
}), []);
```

---

### Phase 3: UI/UX最適化 (1-2週間)

#### 3.1 UIライブラリ統一

**選択肢A: MUI完全採用 (推奨)**
- Ionicを削除
- MUIのモバイル最適化を活用
- バンドルサイズ削減

```bash
npm uninstall @ionic/react @ionic/react-router ionicons
```

**選択肢B: Ionic維持**
- モバイルアプリ化を見据えて維持
- MUIとの共存ルール策定

#### 3.2 Error Boundary導入

```typescript
// components/common/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<Props> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

---

### Phase 4: データ層強化 (2-3週間)

#### 4.1 React Query本格導入

```typescript
// hooks/queries/useOrders.ts
export const useOrders = (userId: string) => {
  return useQuery({
    queryKey: ['orders', userId],
    queryFn: () => firestoreService.getUserOrders(userId),
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 30 * 60 * 1000,   // 30分
  });
};

// hooks/mutations/useCreateOrder.ts
export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OrderFormData) =>
      firestoreService.saveOrder(data, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};
```

#### 4.2 店舗データの外部化

```typescript
// Option A: Firestore設定化
export const useStoreData = () => {
  return useQuery({
    queryKey: ['stores'],
    queryFn: () => storeSettingsService.getStores(),
    staleTime: Infinity, // 静的データ
  });
};

// Option B: 環境変数/設定ファイル化
// config/stores.json
```

---

## 技術的負債の解消

### 即時対応タスク

```bash
# 1. 重複ライブラリ削除
npm uninstall @splidejs/react-splide @splidejs/splide

# 2. 型安全性向上
npm install -D @total-typescript/ts-reset

# 3. パフォーマンス分析ツール
npm install -D @tanstack/react-query-devtools
```

### リファクタリング優先度

| 優先度 | タスク | 工数 | 効果 |
|--------|--------|------|------|
| 1 | React Router v6移行 | 2日 | 高 |
| 2 | 重複ライブラリ削除 | 1日 | 中 |
| 3 | FloatingProgressSummary分割 | 2日 | 高 |
| 4 | Hook統合 | 3日 | 高 |
| 5 | OrderFormContext導入 | 2日 | 高 |
| 6 | Service層統一 | 1日 | 中 |
| 7 | React Query導入 | 3日 | 高 |
| 8 | UIライブラリ統一 | 3日 | 中 |

---

## フレームワーク・ライブラリの最適化

### 現状のバンドル分析（推定）

```
現在のバンドル構成:
├── React + ReactDOM      ~140KB
├── MUI                   ~300KB
├── Ionic                 ~200KB
├── Firebase              ~150KB
├── Swiper                ~80KB
├── Splide                ~30KB (削除可能)
├── React Router v5       ~25KB
├── React Hook Form       ~25KB
├── Zustand               ~3KB
├── その他                ~150KB
━━━━━━━━━━━━━━━━━━━━━━━━━━━
合計                      ~1.1MB
```

### 最適化後（目標）

```
最適化後のバンドル構成:
├── React + ReactDOM      ~140KB
├── MUI (tree-shaking)    ~200KB (-100KB)
├── Firebase              ~150KB
├── Swiper                ~80KB
├── React Router v6       ~20KB (-5KB)
├── React Hook Form       ~25KB
├── Zustand               ~3KB
├── その他                ~120KB (-30KB)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
合計                      ~738KB (-362KB, 33%削減)
```

---

## 将来の拡張性

### Next.js移行検討

**メリット:**
- SSR/SSGによる初期表示高速化
- ファイルベースルーティング
- APIルートの統合
- 画像最適化
- エッジ関数対応

**デメリット:**
- 移行コスト（中〜大）
- PWAとの互換性確認が必要
- Firebase Hosting からの移行

**推奨判断:**
- 現時点では移行不要
- SEOが重要になった場合に検討
- App Router (React Server Components) の成熟を待つ

### マイクロフロントエンド化

**将来の分割案:**
```
frontend/
├── shell/              # メインシェル
├── order-form/         # 注文フォーム機能
├── calendar/           # カレンダー機能
├── user-settings/      # ユーザー設定
└── shared/             # 共通コンポーネント
```

### モバイルアプリ化

**選択肢:**
1. **Capacitor** (Ionic維持の場合)
2. **React Native** (新規開発)
3. **PWA強化** (現行アプローチ)

---

## アクションアイテム

### 今週中

- [ ] React Router v6移行計画の詳細化
- [ ] Splide削除とSwiper統一
- [ ] FloatingProgressSummary分割の設計

### 今月中

- [ ] Hook統合の実施
- [ ] OrderFormContext導入
- [ ] Error Boundary導入

### 来月以降

- [ ] React Query本格導入
- [ ] UIライブラリ統一検討
- [ ] テストカバレッジ向上

---

## 参考資料

- [React Router v6 Migration Guide](https://reactrouter.com/en/main/upgrading/v5)
- [TanStack Query Best Practices](https://tanstack.com/query/latest/docs/framework/react/guides/best-practices)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/best-practices)
- [MUI Performance Optimization](https://mui.com/material-ui/guides/performance/)

---

> このドキュメントは継続的に更新されます。
> 最終更新: 2025-11-25
