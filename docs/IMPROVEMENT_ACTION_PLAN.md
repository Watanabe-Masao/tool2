# 改善アクションプラン

> **作成日**: 2025年11月25日
> **ステータス**: 計画中

---

## 実行ロードマップ

```
Week 1-2: Phase 1 - 技術的負債解消
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
├── 1.1 React Router v5 → v6 移行
├── 1.2 Splide削除 & Swiper統一
└── 1.3 FloatingProgressSummary分割

Week 3-5: Phase 2 - アーキテクチャ改善
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
├── 2.1 Hook統合・再編成
├── 2.2 OrderFormContext導入
└── 2.3 Service層統一

Week 6-7: Phase 3 - UI/UX最適化
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
├── 3.1 UIライブラリ統一検討
├── 3.2 Error Boundary導入
└── 3.3 パフォーマンス最適化

Week 8-10: Phase 4 - データ層強化
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
├── 4.1 React Query本格導入
├── 4.2 店舗データ外部化
└── 4.3 テストカバレッジ向上
```

---

## Phase 1: 技術的負債解消

### 1.1 React Router v5 → v6 移行

#### 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `App.tsx` | Switch→Routes、Route element prop |
| `components/layout/MainLayout.tsx` | useHistory→useNavigate |
| `components/common/ProtectedRoute.tsx` | 新API対応 |
| `package.json` | react-router-dom更新 |

#### 移行手順

```bash
# Step 1: パッケージ更新
npm uninstall react-router react-router-dom @ionic/react-router
npm install react-router-dom@6

# Step 2: 型定義更新
npm uninstall @types/react-router @types/react-router-dom
# v6は型が内蔵
```

#### コード変更例

```typescript
// Before: App.tsx
import { Route, Switch, Redirect } from 'react-router-dom';
import { IonReactRouter } from '@ionic/react-router';

<IonReactRouter>
  <Switch>
    <Route exact path="/login">
      {user ? <Redirect to="/new-order" /> : <LoginPage />}
    </Route>
    <Route path="/">
      {user ? <MainLayout /> : <Redirect to="/login" />}
    </Route>
  </Switch>
</IonReactRouter>

// After: App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

<BrowserRouter>
  <Routes>
    <Route
      path="/login"
      element={user ? <Navigate to="/new-order" replace /> : <LoginPage />}
    />
    <Route
      path="/*"
      element={user ? <MainLayout /> : <Navigate to="/login" replace />}
    />
  </Routes>
</BrowserRouter>
```

```typescript
// Before: useHistory
import { useHistory } from 'react-router-dom';
const history = useHistory();
history.push('/new-order');

// After: useNavigate
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/new-order');
```

#### テスト確認項目

- [ ] ログイン→ダッシュボード遷移
- [ ] ログアウト→ログイン画面遷移
- [ ] 直接URL入力でのルーティング
- [ ] ブラウザバック/フォワード
- [ ] 認証保護ルートの動作

---

### 1.2 Splide削除 & Swiper統一

#### 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `package.json` | Splide削除 |
| `FloatingProgressSummary.tsx` | 既にSwiper使用（変更なし） |
| その他Splide使用箇所 | Swiperに置換 |

#### 移行手順

```bash
# Step 1: Splide削除
npm uninstall @splidejs/react-splide @splidejs/splide

# Step 2: 使用箇所確認
grep -r "splide" src/
```

---

### 1.3 FloatingProgressSummary分割

#### 現状分析

```
FloatingProgressSummary.tsx (896行)
├── コンポーネント定義: 1-895行
├── 状態管理: 81-120行 (約40行)
├── ハンドラー: 128-195行 (約70行)
├── 計算ロジック: 222-289行 (約70行)
├── renderProductCards: 314-591行 (約280行)
└── メインレンダリング: 593-895行 (約300行)
```

#### 分割設計

```typescript
// components/forms/progress/
├── index.ts                    // re-export
├── FloatingProgressSummary.tsx // Container (150行)
├── ProgressHeader.tsx          // ヘッダー (80行)
├── ProductCardSwiper.tsx       // カード一覧 (120行)
├── ProductCard.tsx             // 個別カード (150行)
├── ProgressStepList.tsx        // ステップ表示 (100行)
├── StepHint.tsx                // ヒント表示 (50行)
├── CardContextMenu.tsx         // コンテキストメニュー (80行)
├── hooks/
│   ├── useProgressState.ts     // 状態管理 (50行)
│   ├── useProductStatus.ts     // 商品ステータス計算 (40行)
│   └── useLongPress.ts         // 長押し検知 (30行)
└── types.ts                    // 型定義 (30行)
```

#### 実装例

```typescript
// components/forms/progress/FloatingProgressSummary.tsx
import React from 'react';
import { Paper, useTheme, useMediaQuery } from '@mui/material';
import { ProgressHeader } from './ProgressHeader';
import { ProductCardSwiper } from './ProductCardSwiper';
import { ProgressStepList } from './ProgressStepList';
import { CardContextMenu } from './CardContextMenu';
import { StoreAllocationEditModal } from '@/components/modals/StoreAllocationEditModal';
import { useProgressState } from './hooks/useProgressState';
import type { FloatingProgressSummaryProps } from './types';

export const FloatingProgressSummary: React.FC<FloatingProgressSummaryProps> = (props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    containerRef,
    isProductMode,
    cardMenuState,
    allocationModalState,
    // ... other state
  } = useProgressState(props);

  return (
    <Paper ref={containerRef} elevation={8} sx={containerStyles}>
      <ProgressHeader
        activeStep={activeStep}
        totalSteps={totalSteps}
        progress={progress}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        isMobile={isMobile}
      />

      {isProductMode ? (
        <ProductCardSwiper
          products={formData.products}
          activeProductIndex={activeProductIndex}
          onProductSelect={setActiveProductIndex}
          onLongPress={handleLongPress}
        />
      ) : (
        <ProgressStepList steps={steps} activeStep={activeStep} />
      )}

      <CardContextMenu {...cardMenuState} />

      <StoreAllocationEditModal {...allocationModalState} />
    </Paper>
  );
};
```

```typescript
// components/forms/progress/types.ts
import type { OrderFormData } from '@/schemas/orderSchema';

export interface FloatingProgressSummaryProps {
  formData: OrderFormData;
  totalSteps: number;
  onHeightChange?: (height: number) => void;
  onRemoveProduct?: (index: number) => void;
  onClearProduct?: (index: number) => void;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  onAllocationChange?: (productIndex: number, storeIndex: number, value: number) => void;
}

export interface ProductCardProps {
  product: OrderFormData['products'][0];
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onLongPress: () => void;
}

export interface ProductStatus {
  hasBasicInfo: boolean;
  hasPricing: boolean;
  hasAllocation: boolean;
  hasOverAllocation: boolean;
  totalAllocated: number;
  remaining: number;
}
```

---

## Phase 2: アーキテクチャ改善

### 2.1 Hook統合・再編成

#### 統合マッピング

| 現在のHook | 統合後 |
|-----------|--------|
| `useOrderFormState` | → `useOrderForm` |
| `useFormStepState` | → `useOrderForm` |
| `useFormLockState` | → `useStoreAllocation` |
| `useProductIndexState` | → `useOrderForm` |
| `useOrderSubmit` | → `useOrderSubmission` |
| `useOrderDataSubmit` | → `useOrderSubmission` |
| `useTemplateGeneration` | → `useOrderSubmission` |
| `useFileDownloads` | → `useOrderSubmission` |
| `useOrderHandlers` | → `useOrderForm` |
| `useStepActions` | → `useOrderForm` |
| `useStepNavigation` | → `useOrderForm` |
| `useProductActions` | → `useProductManagement` |
| `useHistoryTracking` | → `useProductManagement` |
| `useAllocationActions` | → `useStoreAllocation` |
| `useDraftActions` | → `useDraftManagement` |
| `useFormModalState` | 削除（Zustand統合） |
| `useFormSubmitHandler` | → `useOrderSubmission` |

#### 統合Hook設計

```typescript
// hooks/useOrderForm.ts
interface UseOrderFormReturn {
  // Form
  form: UseFormReturn<OrderFormData>;
  productFields: FieldArrayWithId[];

  // Navigation
  activeStep: number;
  activeProductIndex: number;
  goToStep: (step: number) => void;
  goToProduct: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Product actions
  addProduct: () => void;
  removeProduct: (index: number) => void;
  clearProduct: (index: number) => void;
  moveProduct: (from: number, to: number) => void;

  // Validation
  validateCurrentStep: () => boolean;
  errors: FieldErrors<OrderFormData>;
}

export const useOrderForm = (): UseOrderFormReturn => {
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: getDefaultValues(),
    mode: 'onChange',
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'products',
  });

  const activeStep = useOrderFormStore((s) => s.activeStep);
  const setActiveStep = useOrderFormStore((s) => s.setActiveStep);
  const activeProductIndex = useOrderFormStore((s) => s.activeProductIndex);
  const setActiveProductIndex = useOrderFormStore((s) => s.setActiveProductIndex);

  // ... implementation

  return {
    form,
    productFields: fields,
    activeStep,
    activeProductIndex,
    goToStep: setActiveStep,
    goToProduct: setActiveProductIndex,
    nextStep: handleNextStep,
    prevStep: handlePrevStep,
    addProduct,
    removeProduct: handleRemove,
    clearProduct: handleClear,
    moveProduct: move,
    validateCurrentStep,
    errors: form.formState.errors,
  };
};
```

---

### 2.2 OrderFormContext導入

#### Context設計

```typescript
// contexts/OrderFormContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useOrderForm, UseOrderFormReturn } from '@/hooks/useOrderForm';
import { useOrderSubmission, UseOrderSubmissionReturn } from '@/hooks/useOrderSubmission';
import { useAutocomplete, UseAutocompleteReturn } from '@/hooks/useAutocomplete';

interface OrderFormContextValue {
  order: UseOrderFormReturn;
  submission: UseOrderSubmissionReturn;
  autocomplete: {
    supplier: UseAutocompleteReturn;
    productName: UseAutocompleteReturn;
    origin: UseAutocompleteReturn;
  };
}

const OrderFormContext = createContext<OrderFormContextValue | null>(null);

export const OrderFormProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const order = useOrderForm();
  const submission = useOrderSubmission();

  const autocomplete = {
    supplier: useAutocomplete('supplier'),
    productName: useAutocomplete('productName'),
    origin: useAutocomplete('origin'),
  };

  return (
    <OrderFormContext.Provider value={{ order, submission, autocomplete }}>
      {children}
    </OrderFormContext.Provider>
  );
};

export const useOrderFormContext = () => {
  const context = useContext(OrderFormContext);
  if (!context) {
    throw new Error('useOrderFormContext must be used within OrderFormProvider');
  }
  return context;
};

// Convenience hooks
export const useOrder = () => useOrderFormContext().order;
export const useSubmission = () => useOrderFormContext().submission;
export const useAutocompleteSuggestions = () => useOrderFormContext().autocomplete;
```

#### 使用例

```typescript
// Before: NewOrderPage.tsx (17+ hooks)
export const NewOrderPage: React.FC = () => {
  const { user } = useAuthContext();
  const { showSuccess, showError, showLoading, hideLoading } = useNotification();
  const { isOnline, saveOrder: saveOrderWithSync } = useDataSync();
  const supplierAutocomplete = useAutocomplete('supplier');
  const productNameAutocomplete = useAutocomplete('productName');
  const originAutocomplete = useAutocomplete('origin');
  const userSettings = useUserSettings(user);
  // ... 10+ more hooks
};

// After: NewOrderPage.tsx (3 hooks)
export const NewOrderPage: React.FC = () => {
  const { user } = useAuthContext();
  const notification = useNotification();
  const { isOnline } = useDataSync();

  return (
    <OrderFormProvider>
      <OrderFormContent
        user={user}
        notification={notification}
        isOnline={isOnline}
      />
    </OrderFormProvider>
  );
};

// OrderFormContent.tsx
const OrderFormContent: React.FC<Props> = ({ user, notification, isOnline }) => {
  const { order, submission, autocomplete } = useOrderFormContext();

  // すべてのフォーム状態とアクションがcontextから利用可能
};
```

---

### 2.3 Service層統一

#### 移行計画

```
現状:
├── services/firebase/firestoreService.ts    # 静的メソッド
└── services/firestore/FirestoreServiceFacade.ts  # インスタンスメソッド

移行後:
├── services/firestore/FirestoreServiceFacade.ts  # 統一
├── services/firestore/repositories/             # Repository層
└── services/firebase/firestoreService.ts        # @deprecated
```

#### 実装

```typescript
// services/firestore/FirestoreServiceFacade.ts
// 変更なし（既に実装済み）

// services/firebase/firestoreService.ts
/**
 * @deprecated Use FirestoreServiceFacade instead
 * This file is maintained for backward compatibility only.
 */
import { FirestoreServiceFacade } from '@/services/firestore/FirestoreServiceFacade';
import { getFirebaseFirestore } from './config';

// レガシーAPI互換性のためのラッパー
const facade = new FirestoreServiceFacade(getFirebaseFirestore());

export const FirestoreService = {
  saveOrder: facade.saveOrder.bind(facade),
  getUserOrders: facade.getUserOrders.bind(facade),
  // ... other methods
} as const;
```

```typescript
// contexts/ServiceContext.tsx - 更新
export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  children,
  services: overrideServices,
}) => {
  const services = useMemo<Services>(() => {
    const db = getFirebaseFirestore();
    return {
      firestoreService: overrideServices?.firestoreService ?? new FirestoreServiceFacade(db),
      templateService: overrideServices?.templateService ?? new TemplateService(),
      sessionStorageService: overrideServices?.sessionStorageService ?? new SessionStorageService(),
    };
  }, [overrideServices]);

  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
};
```

---

## Phase 3: UI/UX最適化

### 3.1 UIライブラリ統一

#### 推奨: MUI完全採用

```bash
# Ionic削除
npm uninstall @ionic/react @ionic/react-router ionicons

# MUI追加機能（必要に応じて）
npm install @mui/lab
```

#### 移行対象

| Ionicコンポーネント | MUI代替 |
|--------------------|---------|
| `IonApp` | `Box` or CssBaseline |
| `IonPage` | `Box` |
| `IonContent` | `Container` |
| `IonButton` | `Button` |
| `IonIcon` | `@mui/icons-material` |
| `IonRefresher` | カスタム実装 or react-pull-to-refresh |

### 3.2 Error Boundary導入

```typescript
// components/common/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          bgcolor="grey.100"
          p={3}
        >
          <Paper elevation={3} sx={{ p: 4, maxWidth: 400, textAlign: 'center' }}>
            <ErrorOutline sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              エラーが発生しました
            </Typography>
            <Typography color="text.secondary" paragraph>
              申し訳ありませんが、予期しないエラーが発生しました。
              ページを再読み込みしてください。
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{ mr: 1 }}
            >
              ページを再読み込み
            </Button>
            <Button variant="outlined" onClick={this.handleReset}>
              再試行
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

```typescript
// App.tsx での使用
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        {/* ... */}
      </ThemeProvider>
    </ErrorBoundary>
  );
};
```

---

## Phase 4: データ層強化

### 4.1 React Query本格導入

#### クエリ・ミューテーション設計

```typescript
// hooks/queries/useOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirestoreService } from '@/contexts/ServiceContext';

export const orderKeys = {
  all: ['orders'] as const,
  list: (userId: string) => [...orderKeys.all, 'list', userId] as const,
  detail: (orderId: string) => [...orderKeys.all, 'detail', orderId] as const,
  byDate: (userId: string, date: string) =>
    [...orderKeys.all, 'byDate', userId, date] as const,
};

export const useOrders = (userId: string | undefined) => {
  const firestoreService = useFirestoreService();

  return useQuery({
    queryKey: orderKeys.list(userId || ''),
    queryFn: () => firestoreService.getUserOrders(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5分
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const firestoreService = useFirestoreService();

  return useMutation({
    mutationFn: ({ data, userId }: { data: OrderFormData; userId: string }) =>
      firestoreService.saveOrder(data, userId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.list(userId) });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  const firestoreService = useFirestoreService();

  return useMutation({
    mutationFn: (orderId: string) => firestoreService.deleteOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
};
```

#### QueryClient設定

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      gcTime: 30 * 60 * 1000,   // 30分
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

```typescript
// App.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... */}
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
};
```

---

## チェックリスト

### Phase 1 完了条件

- [ ] React Router v6に移行完了
- [ ] 全ルートが正常に動作
- [ ] Splide削除、Swiperに統一
- [ ] FloatingProgressSummaryが5-7ファイルに分割
- [ ] 各分割ファイルが200行以下

### Phase 2 完了条件

- [ ] Hookが29個から12-15個に統合
- [ ] OrderFormContext導入完了
- [ ] NewOrderPage.tsxのhook数が5個以下
- [ ] FirestoreService非推奨化完了

### Phase 3 完了条件

- [ ] Error Boundary導入完了
- [ ] Ionic削除（またはルール策定）
- [ ] バンドルサイズ20%以上削減

### Phase 4 完了条件

- [ ] React Queryで全データフェッチを管理
- [ ] 店舗データ外部化完了
- [ ] テストカバレッジ60%以上

---

## 見積もり工数

| Phase | タスク | 見積もり | リスク |
|-------|--------|----------|--------|
| 1.1 | Router移行 | 2日 | 低 |
| 1.2 | Splide削除 | 0.5日 | 低 |
| 1.3 | コンポーネント分割 | 3日 | 中 |
| 2.1 | Hook統合 | 4日 | 中 |
| 2.2 | Context導入 | 2日 | 低 |
| 2.3 | Service統一 | 1日 | 低 |
| 3.1 | UI統一 | 3日 | 中 |
| 3.2 | Error Boundary | 1日 | 低 |
| 4.1 | React Query | 4日 | 中 |
| 4.2 | 店舗データ外部化 | 2日 | 低 |

**合計見積もり**: 約22.5人日 (4-5週間)

---

> このドキュメントは実装進行に伴い更新されます。
