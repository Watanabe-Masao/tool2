# アーキテクチャ改善提案

## 1. Compound Component Pattern

### 現在の問題
```typescript
<OrderFormWithTabs
  activeStep={activeStep}
  handleTabChange={handleTabChange}
  // ... 34個のprops
/>
```

### 改善後
```typescript
// Compound Component Pattern
<OrderForm>
  <OrderForm.Tabs activeStep={activeStep} onChange={handleTabChange}>
    <OrderForm.Tab>店着日・帳合先</OrderForm.Tab>
    <OrderForm.Tab>商品情報</OrderForm.Tab>
    <OrderForm.Tab>価格・数量</OrderForm.Tab>
    <OrderForm.Tab>店舗配分</OrderForm.Tab>
    <OrderForm.Tab>プレビュー</OrderForm.Tab>
  </OrderForm.Tabs>

  <OrderForm.Content>
    <OrderForm.Panel value={0}>
      <DeliveryDateStep />
    </OrderForm.Panel>
    <OrderForm.Panel value={1}>
      <ProductInfoStep />
    </OrderForm.Panel>
    {/* ... */}
  </OrderForm.Content>
</OrderForm>
```

**実装例:**
```typescript
// components/order/OrderForm/index.tsx
import React, { createContext, useContext } from 'react';

interface OrderFormContextValue {
  activeStep: number;
  setActiveStep: (step: number) => void;
  formData: OrderFormData;
}

const OrderFormContext = createContext<OrderFormContextValue | null>(null);

export const useOrderFormContext = () => {
  const context = useContext(OrderFormContext);
  if (!context) throw new Error('useOrderFormContext must be used within OrderForm');
  return context;
};

// メインコンポーネント
export const OrderForm: React.FC<{ children: React.ReactNode }> & {
  Tabs: typeof OrderFormTabs;
  Tab: typeof OrderFormTab;
  Content: typeof OrderFormContent;
  Panel: typeof OrderFormPanel;
} = ({ children }) => {
  const [activeStep, setActiveStep] = useState(0);
  const methods = useForm<OrderFormData>();

  return (
    <OrderFormContext.Provider value={{ activeStep, setActiveStep, formData: methods.getValues() }}>
      <FormProvider {...methods}>
        {children}
      </FormProvider>
    </OrderFormContext.Provider>
  );
};

// サブコンポーネント
const OrderFormTabs: React.FC<{
  activeStep: number;
  onChange: (step: number) => void;
  children: React.ReactNode;
}> = ({ activeStep, onChange, children }) => {
  return (
    <Tabs value={activeStep} onChange={(_, v) => onChange(v)}>
      {children}
    </Tabs>
  );
};

OrderForm.Tabs = OrderFormTabs;
OrderForm.Tab = OrderFormTab;
OrderForm.Content = OrderFormContent;
OrderForm.Panel = OrderFormPanel;
```

**メリット:**
- propsの受け渡しが不要
- コンポーネント構造が視覚的に明確
- 柔軟なカスタマイズが可能

---

## 2. Feature-based Architecture

### 現在のディレクトリ構造
```
src/
├── components/
│   ├── order/
│   └── forms/
├── hooks/
├── context/
└── pages/
```

### 推奨構造（Feature-based）
```
src/
├── features/
│   ├── order/
│   │   ├── components/
│   │   │   ├── OrderFormWithTabs.tsx
│   │   │   ├── OrderDialogs.tsx
│   │   │   └── OrderModals.tsx
│   │   ├── hooks/
│   │   │   ├── useOrderSubmit.ts
│   │   │   ├── useOrderHandlers.ts
│   │   │   └── useOrderModals.ts
│   │   ├── stores/
│   │   │   └── orderFormStore.ts
│   │   ├── types/
│   │   │   └── order.types.ts
│   │   └── index.ts  // Public API
│   ├── supplier/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
│   └── product/
│       └── ...
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── types/
└── pages/
    └── NewOrderPage.tsx
```

**メリット:**
- 機能ごとに独立したモジュール
- 依存関係が明確
- コード分割がしやすい
- チーム開発で役割分担しやすい

---

## 3. Form Wizard Pattern

### 現在の問題
- ステップ管理が NewOrderPage に集中
- ステップ間の遷移ロジックが複雑

### 改善案: Dedicated Form Wizard

```typescript
// features/order/components/OrderFormWizard.tsx
interface Step {
  id: string;
  label: string;
  component: React.ComponentType;
  validate?: (data: OrderFormData) => boolean;
  onNext?: (data: OrderFormData) => void;
}

const steps: Step[] = [
  {
    id: 'delivery-supplier',
    label: '店着日・帳合先',
    component: DeliverySupplierStep,
    validate: (data) => data.deliveryDate !== null && data.suppliers.length > 0,
  },
  {
    id: 'product-info',
    label: '商品情報',
    component: ProductInfoStep,
    validate: (data) => data.products.every(p => p.name && p.origin),
  },
  // ...
];

export const OrderFormWizard: React.FC = () => {
  const { currentStep, goToStep, nextStep, prevStep, canGoNext } = useWizard(steps);

  return (
    <Wizard steps={steps} currentStep={currentStep}>
      <Wizard.Navigation>
        <Button onClick={prevStep} disabled={currentStep === 0}>
          前へ
        </Button>
        <Button onClick={nextStep} disabled={!canGoNext()}>
          次へ
        </Button>
      </Wizard.Navigation>

      <Wizard.Content>
        {React.createElement(steps[currentStep].component)}
      </Wizard.Content>
    </Wizard>
  );
};
```

**メリット:**
- ステップ定義が宣言的
- バリデーションが各ステップに閉じる
- テストがしやすい

---

## 4. React Server Components（Next.js 14+）

### 移行を検討すべき理由

**現在の構成:**
- Create React App (CRA) / Vite
- Client-side rendering only

**Next.js 14 App Routerの利点:**

```typescript
// app/orders/new/page.tsx (Server Component)
import { getSupplierOptions } from '@/features/order/api/suppliers';
import { OrderFormClient } from '@/features/order/components/OrderFormClient';

export default async function NewOrderPage() {
  // サーバー側でデータ取得
  const supplierOptions = await getSupplierOptions();
  const productOptions = await getProductOptions();

  return (
    <OrderFormClient
      supplierOptions={supplierOptions}
      productOptions={productOptions}
    />
  );
}

// features/order/components/OrderFormClient.tsx (Client Component)
'use client';

export const OrderFormClient: React.FC<Props> = ({ supplierOptions, productOptions }) => {
  // インタラクティブなロジックのみクライアントで
  const methods = useForm<OrderFormData>();

  return <OrderForm {...props} />;
};
```

**メリット:**
- 初期ロード時間の短縮（SSR）
- SEOの改善
- サーバー側でのデータフェッチ（並列実行）
- バンドルサイズの削減（サーバーコンポーネントはバンドルに含まれない）

**移行コスト:**
- 中程度（1-2週間）
- ディレクトリ構造の再編成が必要
- 段階的な移行が可能

---

## 5. React Query (TanStack Query) の活用

### 現在のデータフェッチング
```typescript
// useOrderSubmit.ts
const handleSubmit = async (data: OrderFormData) => {
  try {
    showLoading();
    const result = await FirestoreServiceFacade.saveOrder(data);
    showSuccess();
  } catch (error) {
    showError();
  } finally {
    hideLoading();
  }
};
```

### React Query活用後
```typescript
// features/order/api/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useSaveOrderMutation = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (data: OrderFormData) => FirestoreServiceFacade.saveOrder(data),
    onSuccess: (result) => {
      showSuccess('注文を保存しました');
      // キャッシュの無効化
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      showError('保存に失敗しました');
    },
  });
};

// 使用例
const { mutate: saveOrder, isPending, isError } = useSaveOrderMutation();

const handleSubmit = (data: OrderFormData) => {
  saveOrder(data);
};
```

**メリット:**
- 自動的なローディング/エラー状態管理
- リトライロジックの組み込み
- キャッシュ管理の自動化
- Optimistic Updatesの実装が容易

---

## 6. Error Boundary Pattern

### 現在の問題
- エラーハンドリングが各コンポーネントに分散
- 予期しないエラーでアプリ全体がクラッシュ

### 改善案
```typescript
// shared/components/ErrorBoundary.tsx
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => (
  <Box p={4}>
    <Alert severity="error">
      <AlertTitle>エラーが発生しました</AlertTitle>
      {error.message}
    </Alert>
    <Button onClick={resetErrorBoundary} sx={{ mt: 2 }}>
      再試行
    </Button>
  </Box>
);

export const OrderFormErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactErrorBoundary
    FallbackComponent={ErrorFallback}
    onError={(error, errorInfo) => {
      // エラーログを送信
      console.error('Order form error:', error, errorInfo);
      // Sentryなどに送信
    }}
    onReset={() => {
      // 状態をリセット
      window.location.href = '/orders/new';
    }}
  >
    {children}
  </ReactErrorBoundary>
);

// 使用例
// pages/NewOrderPage.tsx
export const NewOrderPage = () => (
  <OrderFormErrorBoundary>
    <OrderForm />
  </OrderFormErrorBoundary>
);
```

---

## 7. Custom Hook Composition Pattern

### 現在の問題
```typescript
// useOrderHandlers.ts (268行)
export const useOrderHandlers = ({
  methods,
  productFields,
  // ... 14個のパラメータ
}) => {
  // 11個のハンドラー
  const handleRemoveProduct = ...;
  const handleClearProduct = ...;
  // ...
};
```

### 改善案: 小さなフックの組み合わせ
```typescript
// hooks/useProductHandlers.ts (50行)
export const useProductHandlers = (productFields, removeProduct) => {
  const handleRemoveProduct = useCallback(...);
  const handleClearProduct = useCallback(...);

  return { handleRemoveProduct, handleClearProduct };
};

// hooks/useStepHandlers.ts (40行)
export const useStepHandlers = (activeStep, setActiveStep, TOTAL_STEPS) => {
  const handlePrevStep = useCallback(...);
  const handleNextStep = useCallback(...);
  const handleTabChange = useCallback(...);

  return { handlePrevStep, handleNextStep, handleTabChange };
};

// hooks/useAllocationHandlers.ts (60行)
export const useAllocationHandlers = (setValue, setLockedStores) => {
  const handleAllocationChange = useCallback(...);
  const handleToggleLock = useCallback(...);

  return { handleAllocationChange, handleToggleLock };
};

// NewOrderPage.tsx
const productHandlers = useProductHandlers(productFields, removeProduct);
const stepHandlers = useStepHandlers(activeStep, setActiveStep, TOTAL_STEPS);
const allocationHandlers = useAllocationHandlers(setValue, setLockedStores);
```

**メリット:**
- 各フックが単一責任
- テストが容易
- 再利用性が高い
- 理解しやすい

---

## 推奨実装順序（Phase 3-5）

### Phase 3: 状態管理の改善（1週間）
1. Zustandの導入
2. UI状態の移行
3. Prop drillingの解消

### Phase 4: アーキテクチャの改善（1-2週間）
1. Feature-based構造への移行
2. Compound Component Patternの適用
3. カスタムフックの分解

### Phase 5: パフォーマンス最適化（1週間）
1. React Queryの導入
2. Error Boundaryの実装
3. Code Splittingの最適化

**総削減効果予測:**
- 351行 → 200-250行（約30-40%削減）
- Props数: 36個 → 10個未満（約70%削減）
- 再レンダリング: 約30-50%削減
