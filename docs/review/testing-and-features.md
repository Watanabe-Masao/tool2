# テスト戦略と追加機能の提案

## 1. テスト戦略の確立

### 現在の課題
- テストコードが不足（推測）
- カスタムフックのテストが困難
- E2Eテストがない

### 推奨テスト戦略

#### A. Unit Tests（カスタムフック）

```typescript
// __tests__/hooks/useFormUIState.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFormUIState } from '@/hooks/useFormUIState';

describe('useFormUIState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFormUIState());

    expect(result.current.activeProductIndex).toBe(0);
    expect(result.current.lockedStores.size).toBe(0);
    expect(result.current.progressSummaryHeight).toBe(0);
  });

  it('should update activeProductIndex', () => {
    const { result } = renderHook(() => useFormUIState());

    act(() => {
      result.current.setActiveProductIndex(2);
    });

    expect(result.current.activeProductIndex).toBe(2);
  });

  it('should toggle store lock', () => {
    const { result } = renderHook(() => useFormUIState());

    act(() => {
      const newMap = new Map();
      newMap.set(0, new Set(['STORE_001']));
      result.current.setLockedStores(newMap);
    });

    expect(result.current.lockedStores.get(0)?.has('STORE_001')).toBe(true);
  });
});
```

#### B. Integration Tests（コンポーネント）

```typescript
// __tests__/components/OrderFormWithTabs.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { OrderFormWithTabs } from '@/components/order/OrderFormWithTabs';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const methods = useForm();
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('OrderFormWithTabs', () => {
  it('should render all tabs', () => {
    render(
      <OrderFormWithTabs
        activeStep={0}
        handleTabChange={jest.fn()}
        // ... その他のprops
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('店着日・帳合先')).toBeInTheDocument();
    expect(screen.getByText('商品情報')).toBeInTheDocument();
    expect(screen.getByText('価格・数量')).toBeInTheDocument();
  });

  it('should call handleTabChange when tab is clicked', () => {
    const handleTabChange = jest.fn();

    render(
      <OrderFormWithTabs
        activeStep={0}
        handleTabChange={handleTabChange}
        // ...
      />,
      { wrapper: Wrapper }
    );

    fireEvent.click(screen.getByText('商品情報'));

    expect(handleTabChange).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it('should display validation errors', async () => {
    render(
      <OrderFormWithTabs
        activeStep={0}
        errors={{
          deliveryDate: { type: 'required', message: '店着日は必須です' },
        }}
        // ...
      />,
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('店着日は必須です')).toBeInTheDocument();
    });
  });
});
```

#### C. E2E Tests（Playwright）

```typescript
// e2e/order-form.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Order Form', () => {
  test('should complete full order flow', async ({ page }) => {
    await page.goto('/orders/new');

    // Step 1: 店着日・帳合先
    await page.fill('[name="deliveryDate"]', '2025-12-01');
    await page.fill('[name="suppliers.0"]', 'サプライヤーA');
    await page.click('button:has-text("次へ")');

    // Step 2: 商品情報
    await page.fill('[name="products.0.name"]', 'テスト商品');
    await page.fill('[name="products.0.origin"]', '日本');
    await page.click('button:has-text("次へ")');

    // Step 3: 価格・数量
    await page.fill('[name="products.0.costPrice"]', '100');
    await page.fill('[name="products.0.sellingPrice"]', '150');
    await page.click('button:has-text("次へ")');

    // Step 4: 店舗配分
    await page.fill('[name="products.0.storeAllocations.0"]', '10');
    await page.click('button:has-text("次へ")');

    // Step 5: プレビュー
    await expect(page.locator('text=テスト商品')).toBeVisible();
    await page.click('button:has-text("注文を確定")');

    // 成功メッセージの確認
    await expect(page.locator('text=注文を保存しました')).toBeVisible();
  });

  test('should save draft automatically', async ({ page }) => {
    await page.goto('/orders/new');

    // データ入力
    await page.fill('[name="deliveryDate"]', '2025-12-01');
    await page.fill('[name="suppliers.0"]', 'サプライヤーB');

    // 2秒待機（auto-saveのdebounce）
    await page.waitForTimeout(2500);

    // ページリロード
    await page.reload();

    // 下書き復元ダイアログの確認
    await expect(page.locator('text=下書きを復元しますか？')).toBeVisible();
    await page.click('button:has-text("復元")');

    // データが復元されているか確認
    await expect(page.locator('[name="suppliers.0"]')).toHaveValue('サプライヤーB');
  });

  test('should handle offline mode', async ({ page, context }) => {
    await page.goto('/orders/new');

    // オフラインモードに設定
    await context.setOffline(true);

    // データ入力
    await page.fill('[name="deliveryDate"]', '2025-12-01');
    await page.click('button:has-text("注文を確定")');

    // オフライン警告の確認
    await expect(page.locator('text=現在オフラインモードです')).toBeVisible();

    // オンラインに戻す
    await context.setOffline(false);

    // 同期完了の確認
    await expect(page.locator('text=データを同期しました')).toBeVisible();
  });
});
```

### テストカバレッジ目標

```bash
# package.json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

**目標カバレッジ:**
- Statements: 80%以上
- Branches: 75%以上
- Functions: 80%以上
- Lines: 80%以上

---

## 2. パフォーマンス監視の実装

### A. Web Vitals の測定

```typescript
// utils/performance.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

export const reportWebVitals = () => {
  onCLS(console.log);
  onFID(console.log);
  onFCP(console.log);
  onLCP(console.log);
  onTTFB(console.log);
};

// main.tsx
import { reportWebVitals } from '@/utils/performance';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
```

### B. React DevTools Profiler

```typescript
// components/PerformanceProfiler.tsx
import { Profiler, ProfilerOnRenderCallback } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);

  // 本番環境では分析サービスに送信
  if (import.meta.env.PROD) {
    // analytics.track('render-performance', { id, actualDuration });
  }
};

export const PerformanceProfiler: React.FC<{ id: string; children: React.ReactNode }> = ({
  id,
  children,
}) => (
  <Profiler id={id} onRender={onRenderCallback}>
    {children}
  </Profiler>
);

// 使用例
<PerformanceProfiler id="OrderForm">
  <OrderFormWithTabs />
</PerformanceProfiler>
```

---

## 3. 追加すべき機能

### A. バッチ操作機能

**ユースケース:** 複数商品の一括編集

```typescript
// features/order/components/BatchOperations.tsx
export const BatchOperations: React.FC = () => {
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const { products } = useFormContext<OrderFormData>();

  const handleBatchPriceUpdate = (percentage: number) => {
    selectedProducts.forEach((index) => {
      const currentPrice = products[index].costPrice;
      const newPrice = currentPrice * (1 + percentage / 100);
      setValue(`products.${index}.costPrice`, newPrice);
    });
  };

  return (
    <Box>
      <Checkbox
        checked={selectedProducts.length === products.length}
        onChange={(e) => {
          if (e.target.checked) {
            setSelectedProducts(products.map((_, i) => i));
          } else {
            setSelectedProducts([]);
          }
        }}
      />
      全選択

      <Button onClick={() => handleBatchPriceUpdate(10)}>
        選択商品の価格を10%増加
      </Button>

      <Button onClick={() => handleBatchDelete()}>
        選択商品を削除
      </Button>
    </Box>
  );
};
```

### B. テンプレート機能

**ユースケース:** よく使う注文パターンの保存

```typescript
// features/order/api/templates.ts
export interface OrderTemplate {
  id: string;
  name: string;
  description?: string;
  data: Partial<OrderFormData>;
  createdAt: Date;
  updatedAt: Date;
}

export const useOrderTemplates = () => {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['order-templates'],
    queryFn: () => FirestoreServiceFacade.getTemplates(user.uid),
  });

  const saveTemplate = useMutation({
    mutationFn: (template: Omit<OrderTemplate, 'id' | 'createdAt' | 'updatedAt'>) =>
      FirestoreServiceFacade.saveTemplate(user.uid, template),
  });

  const applyTemplate = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      reset(template.data);
    }
  };

  return { templates, isLoading, saveTemplate, applyTemplate };
};

// UI
export const TemplateSelector: React.FC = () => {
  const { templates, applyTemplate } = useOrderTemplates();

  return (
    <Select>
      {templates?.map((template) => (
        <MenuItem key={template.id} onClick={() => applyTemplate(template.id)}>
          {template.name}
        </MenuItem>
      ))}
    </Select>
  );
};
```

### C. 履歴・差分表示機能

**ユースケース:** 過去の注文との比較

```typescript
// features/order/components/OrderHistory.tsx
export const OrderHistory: React.FC = () => {
  const { data: history } = useQuery({
    queryKey: ['order-history'],
    queryFn: () => FirestoreServiceFacade.getOrderHistory(user.uid),
  });

  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const currentData = useWatch();

  const diff = useMemo(() => {
    if (!selectedOrder) return null;
    const prevOrder = history?.find((h) => h.id === selectedOrder);
    return calculateDiff(prevOrder?.data, currentData);
  }, [selectedOrder, currentData, history]);

  return (
    <Box>
      <List>
        {history?.map((order) => (
          <ListItem key={order.id} onClick={() => setSelectedOrder(order.id)}>
            <ListItemText
              primary={order.name}
              secondary={format(order.createdAt, 'yyyy/MM/dd HH:mm')}
            />
          </ListItem>
        ))}
      </List>

      {diff && (
        <Box>
          <Typography variant="h6">差分</Typography>
          <DiffViewer oldValue={diff.old} newValue={diff.new} />
        </Box>
      )}
    </Box>
  );
};
```

### D. CSVインポート/エクスポート

```typescript
// features/order/utils/csv.ts
import Papa from 'papaparse';

export const exportToCSV = (data: OrderFormData) => {
  const csv = Papa.unparse({
    fields: ['商品名', '産地', '原価', '売価', '数量'],
    data: data.products.map((p) => [
      p.name,
      p.origin,
      p.costPrice,
      p.sellingPrice,
      p.totalDelivery,
    ]),
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `order_${format(new Date(), 'yyyyMMdd')}.csv`;
  link.click();
};

export const importFromCSV = async (file: File): Promise<Partial<OrderFormData>> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const products = results.data.map((row: any) => ({
          name: row['商品名'],
          origin: row['産地'],
          costPrice: parseFloat(row['原価']),
          sellingPrice: parseFloat(row['売価']),
          totalDelivery: parseInt(row['数量']),
        }));
        resolve({ products });
      },
      error: reject,
    });
  });
};
```

### E. リアルタイムコラボレーション（将来的）

**技術スタック:**
- Firestore Real-time listeners
- WebSocket (Socket.io)
- Yjs (CRDT library)

```typescript
// features/order/hooks/useCollaboration.ts
export const useCollaboration = (orderId: string) => {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [cursorPositions, setCursorPositions] = useState<Map<string, Position>>(new Map());

  useEffect(() => {
    const unsubscribe = FirestoreServiceFacade.subscribeToOrder(orderId, (snapshot) => {
      // リアルタイムでデータを同期
      const data = snapshot.data();
      // Conflict resolution logic
    });

    return unsubscribe;
  }, [orderId]);

  return { activeUsers, cursorPositions };
};
```

---

## 4. アクセシビリティの改善

### A. キーボードナビゲーション

```typescript
// hooks/useKeyboardNavigation.ts
export const useKeyboardNavigation = () => {
  const { activeStep, setActiveStep, TOTAL_STEPS } = useOrderFormStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            if (activeStep > 0) setActiveStep(activeStep - 1);
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (activeStep < TOTAL_STEPS - 1) setActiveStep(activeStep + 1);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStep, setActiveStep, TOTAL_STEPS]);
};
```

### B. ARIA属性の追加

```typescript
<Tabs
  value={activeStep}
  onChange={handleTabChange}
  aria-label="注文フォームステップ"
  role="tablist"
>
  <Tab
    label="店着日・帳合先"
    aria-controls="tabpanel-0"
    aria-selected={activeStep === 0}
  />
</Tabs>

<Box
  role="tabpanel"
  aria-labelledby="tab-0"
  hidden={activeStep !== 0}
>
  {/* Content */}
</Box>
```

---

## 5. セキュリティの強化

### A. XSS対策の徹底

```typescript
// utils/sanitize.ts
import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

// フォームバリデーション
const orderFormSchema = z.object({
  products: z.array(
    z.object({
      name: z.string()
        .min(1, '商品名は必須です')
        .transform((val) => sanitizeInput(val)),
      // ...
    })
  ),
});
```

### B. Firestore Security Rulesの強化

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 注文データへのアクセス制御
    match /orders/{orderId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;

      // バリデーション
      allow write: if request.resource.data.products.size() <= 100 &&
                      request.resource.data.suppliers.size() <= 10;
    }
  }
}
```

---

## 実装優先順位

### Phase 3（即時実装推奨）
1. ✅ Unit Tests（カスタムフック）
2. ✅ E2E Tests（主要フロー）
3. ✅ パフォーマンス監視

### Phase 4（中期実装）
1. テンプレート機能
2. バッチ操作機能
3. CSV インポート/エクスポート

### Phase 5（長期実装）
1. リアルタイムコラボレーション
2. 履歴・差分表示
3. 高度なアクセシビリティ対応

**必要なnpmパッケージ:**
```bash
# テスト
npm install -D vitest @testing-library/react @testing-library/user-event
npm install -D @playwright/test

# パフォーマンス
npm install web-vitals

# CSV
npm install papaparse
npm install -D @types/papaparse

# セキュリティ
npm install dompurify
npm install -D @types/dompurify

# その他
npm install date-fns  # 日付フォーマット
npm install react-diff-viewer  # 差分表示
```
