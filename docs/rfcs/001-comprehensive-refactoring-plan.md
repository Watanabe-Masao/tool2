# RFC 001: 包括的リファクタリング計画

**ステータス**: 🟢 承認済み
**作成日**: 2025-01-24
**更新日**: 2025-01-24
**担当者**: Development Team

---

## 📋 要約

モバイルファーストの現状を維持しながら、PC対応強化と将来の分析機能追加を見据えた段階的リファクタリングを実施する。

### 主要目標
1. **コード品質**: 大規模コンポーネント（1125行）を250行以下に分割
2. **拡張性**: 配分実績管理・データ分析機能の追加準備
3. **レスポンシブ**: モバイル優先を維持しつつPC対応を強化
4. **ドキュメント**: 実装と一致した最新ドキュメントの整備

---

## 🎯 背景と動機

### 現状の課題
1. **保守性**: NewOrderPage.tsx (1125行) が肥大化
2. **拡張性**: 新機能追加時の影響範囲が不明確
3. **ドキュメント**: 実装と乖離した古いドキュメント
4. **スケーラビリティ**: 大量データ対応が未整備

### 将来の要件
1. **配分実績管理**: 計画 vs 実績の記録・比較
2. **データ分析**: KPIダッシュボード、トレンド分析
3. **AI予測**: 需要予測、最適配分提案
4. **PC対応強化**: デスクトップUIの改善

---

## 🏗️ 設計方針

### アーキテクチャ原則

#### 1. モバイルファースト維持
```typescript
// レスポンシブ設計の基本方針
const useResponsive = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  return {
    isMobile,    // < 600px (優先)
    isTablet,    // 600-960px
    isDesktop,   // > 960px
  };
};

// コンポーネントでの使用
export const OrderForm = () => {
  const { isMobile } = useResponsive();

  return isMobile ? <MobileOrderForm /> : <DesktopOrderForm />;
};
```

#### 2. Feature-Sliced Design

```
frontend/src/
├── app/                    # アプリケーション初期化
├── pages/                  # ページ（薄い層）
├── features/               # 機能スライス
│   ├── order/             # 注文管理（既存）
│   │   ├── api/
│   │   ├── model/
│   │   ├── ui/
│   │   └── lib/
│   ├── allocation-result/ # 配分実績（新規）
│   │   ├── api/
│   │   ├── model/
│   │   ├── ui/
│   │   └── lib/
│   └── analytics/         # 分析（新規）
│       ├── api/
│       ├── model/
│       ├── ui/
│       └── lib/
├── entities/              # ビジネスエンティティ
├── shared/                # 共通リソース
└── widgets/               # 複合コンポーネント
```

#### 3. Repository パターン

```typescript
// データアクセスの抽象化
interface IOrderRepository {
  save(order: Order): Promise<string>;
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string, options?: QueryOptions): Promise<Order[]>;
  // ...
}

// Firestore実装
class FirestoreOrderRepository implements IOrderRepository {
  // ...
}

// 将来のBigQuery実装
class BigQueryOrderRepository implements IOrderRepository {
  // ...
}

// キャッシュデコレーター
class CachedOrderRepository implements IOrderRepository {
  constructor(private repo: IOrderRepository) {}
  // ...
}
```

---

## 📅 実施計画

### Phase 0: 準備フェーズ (1週間) 🔄

#### Week 1: ドキュメント整備

**Day 1-2: ドキュメント監査**
```bash
# タスク
1. 全ドキュメントを読み、現状との乖離を確認
2. 古いドキュメントを docs/_archive/ に移動
3. アーカイブREADME.mdを作成

# 成果物
- docs/_archive/README.md
- 移動したドキュメントリスト
```

**Day 3-4: 新規ドキュメント作成**
```bash
# 作成するドキュメント
✅ 00-PROJECT-OVERVIEW.md      # 完了
✅ 05-TESTING-GUIDE.md         # 完了
- 01-GETTING-STARTED.md
- 02-ARCHITECTURE.md（更新）
- 03-API-REFERENCE.md
- 04-DATABASE-SCHEMA.md
- features/allocation-results.md
- features/analytics.md
- design/mobile-first-approach.md
- design/responsive-strategy.md
```

**Day 5: テスト基盤整備**
```bash
# タスク
1. テストヘルパー関数の整備
2. モックデータの準備
3. テスト実行環境の確認

# 成果物
- test-utils/firestore.ts
- test-utils/fixtures.ts
- test-utils/mocks.ts
```

---

### Phase 1: 基盤コード分割 (2週間)

#### Week 2: Firestore サービス分割

**目標**: FirestoreService.ts (1062行) → 6ファイル (各150-250行)

**実装手順**:

1. **ディレクトリ構造作成**
```bash
mkdir -p frontend/src/services/firestore/{base,repositories}

# 作成するファイル
frontend/src/services/firestore/
├── base/
│   ├── FirestoreBaseService.ts
│   └── FirestoreQueryBuilder.ts
├── repositories/
│   ├── OrderRepository.ts
│   ├── AutocompleteRepository.ts
│   ├── PresetRepository.ts
│   ├── EmailAddressRepository.ts
│   ├── ProductHistoryRepository.ts
│   └── PricingHistoryRepository.ts
└── index.ts
```

2. **BaseService実装**
```typescript
// base/FirestoreBaseService.ts

export abstract class FirestoreBaseService<T> {
  constructor(
    protected collectionName: string,
    protected db: Firestore
  ) {}

  abstract toFirestoreFormat(entity: T): any;
  abstract fromFirestoreFormat(data: any, id: string): T;

  async save(entity: T): Promise<string> {
    const ref = collection(this.db, this.collectionName);
    const data = this.toFirestoreFormat(entity);
    const docRef = await addDoc(ref, {
      ...data,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  }

  async findById(id: string): Promise<T | null> {
    const docRef = doc(this.db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return this.fromFirestoreFormat(docSnap.data(), docSnap.id);
  }

  // 共通メソッド...
}
```

3. **OrderRepository実装**
```typescript
// repositories/OrderRepository.ts

export class OrderRepository extends FirestoreBaseService<Order> {
  constructor(db: Firestore) {
    super('orders', db);
  }

  toFirestoreFormat(order: Order): FirestoreOrder {
    return {
      userId: order.userId,
      delivery_date: format(order.deliveryDate, 'yyyy-MM-dd'),
      suppliers: order.suppliers,
      products: order.products.map(this.productToFirestore),
      buyer_name: order.buyerName,
    };
  }

  fromFirestoreFormat(data: any, id: string): Order {
    return {
      id,
      userId: data.userId,
      deliveryDate: new Date(data.delivery_date),
      suppliers: data.suppliers,
      products: data.products.map(this.productFromFirestore),
      buyerName: data.buyer_name,
      timestamp: data.timestamp?.toDate() || new Date(),
    };
  }

  // Order固有のメソッド
  async findByDate(userId: string, date: string): Promise<Order[]> {
    const q = query(
      collection(this.db, this.collectionName),
      where('userId', '==', userId),
      where('delivery_date', '==', date),
      orderBy('timestamp', 'desc')
    );
    return this.executeQuery(q);
  }
}
```

4. **テスト作成** (各Repositoryごと)
```typescript
// repositories/__tests__/OrderRepository.test.ts

describe('OrderRepository', () => {
  let repository: OrderRepository;
  let mockDb: MockFirestore;

  beforeEach(() => {
    mockDb = createMockFirestore();
    repository = new OrderRepository(mockDb);
  });

  describe('save', () => {
    it('should save order and return ID', async () => {
      const order = createMockOrder();
      const id = await repository.save(order);

      expect(id).toBeTruthy();
      expect(mockDb.collection).toHaveBeenCalledWith('orders');
    });
  });

  describe('findById', () => {
    it('should find order by ID', async () => {
      const mockOrder = createMockOrder();
      mockDb.doc.mockReturnValue({
        exists: () => true,
        data: () => mockOrder,
        id: 'test-id',
      });

      const result = await repository.findById('test-id');

      expect(result).toBeTruthy();
      expect(result!.id).toBe('test-id');
    });

    it('should return null for non-existent ID', async () => {
      mockDb.doc.mockReturnValue({
        exists: () => false,
      });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  // 他のテスト...
});
```

5. **段階的移行**
```typescript
// 旧APIとの互換性を保つFacadeを作成
// services/firestore/FirestoreServiceFacade.ts

export class FirestoreService {
  private orderRepo: OrderRepository;
  private autocompleteRepo: AutocompleteRepository;
  // ...

  constructor() {
    const db = getFirebaseFirestore();
    this.orderRepo = new OrderRepository(db);
    this.autocompleteRepo = new AutocompleteRepository(db);
    // ...
  }

  // 既存のメソッドを新Repositoryに委譲
  static async saveOrder(order: Order, userId: string): Promise<string> {
    return new FirestoreService().orderRepo.save({ ...order, userId });
  }

  // ...
}
```

**テスト戦略**:
```bash
# 1. 各Repositoryのユニットテストを作成
npm test -- OrderRepository

# 2. テストが失敗した場合のチェックリスト
# ✓ エラーメッセージを精読
# ✓ スタックトレースから問題箇所を特定
# ✓ 期待される動作（仕様）を確認
# ✓ 実際の動作を確認
# ✓ テストが正しいか実装が正しいか判断
#   - テストのアサーションが仕様と一致しているか
#   - モックが正しく設定されているか
#   - 非同期処理の待機ができているか

# 3. 統合テスト（Firestore Emulatorを使用）
npm run test:integration -- OrderRepository

# 4. 全テスト実行（リグレッション確認）
npm test
```

#### Week 3: カスタムフック抽出

**目標**: NewOrderPageから状態管理ロジックを抽出

```typescript
// hooks/useOrderFormState.ts
export function useOrderFormState() {
  const [activeStep, setActiveStep] = useState(0);
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [lockedStores, setLockedStores] = useState<Map<number, Set<string>>>(new Map());
  const [selectedCategories, setSelectedCategories] = useState<Map<number, Set<string>>>(new Map());

  const nextStep = useCallback(() => {
    if (activeStep < TOTAL_STEPS - 1) {
      setActiveStep((prev) => prev + 1);
    }
  }, [activeStep]);

  const prevStep = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  }, [activeStep]);

  return {
    step: {
      active: activeStep,
      set: setActiveStep,
      next: nextStep,
      prev: prevStep,
    },
    product: {
      active: activeProductIndex,
      set: setActiveProductIndex,
    },
    stores: {
      locked: lockedStores,
      setLocked: setLockedStores,
    },
    categories: {
      selected: selectedCategories,
      setSelected: setSelectedCategories,
    },
  };
}

// テスト
describe('useOrderFormState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useOrderFormState());

    expect(result.current.step.active).toBe(0);
    expect(result.current.product.active).toBe(0);
  });

  it('should move to next step', () => {
    const { result } = renderHook(() => useOrderFormState());

    act(() => {
      result.current.step.next();
    });

    expect(result.current.step.active).toBe(1);
  });

  it('should not go beyond last step', () => {
    const { result } = renderHook(() => useOrderFormState());

    // 最後のステップまで移動
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.step.next();
      }
    });

    expect(result.current.step.active).toBe(TOTAL_STEPS - 1);
  });
});
```

---

### Phase 2: NewOrderPage リファクタリング (2週間)

#### Week 4-5: コンポーネント分割

**目標**: 1125行 → 150行以下

**手順**:

1. **OrderServiceの作成**
```typescript
// features/order/services/OrderService.ts

export class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private historyRepo: ProductHistoryRepository,
    private pricingRepo: PricingHistoryRepository
  ) {}

  /**
   * 注文を生成（バリデーション → 保存 → テンプレート生成 → 履歴更新）
   */
  async generateOrder(
    data: OrderFormData,
    buyerName: string
  ): Promise<GenerateOrderResult> {
    // 1. バリデーション
    this.validateOrder(data);

    // 2. データ保存
    const orderId = await this.orderRepo.save({
      ...data,
      buyerName,
      userId: this.getCurrentUserId(),
    });

    // 3. テンプレート生成
    const template = await this.generateTemplate(data, buyerName);

    // 4. 履歴更新
    await this.updateHistory(data);

    return {
      orderId,
      template,
    };
  }

  private validateOrder(data: OrderFormData): void {
    if (data.suppliers.length === 0) {
      throw new ValidationError('帳合先を選択してください');
    }

    if (data.products.length === 0) {
      throw new ValidationError('商品を追加してください');
    }

    // 全商品の帳合先がsuppliersリストに含まれているか
    const invalidProducts = data.products.filter(
      (p) => !data.suppliers.includes(p.supplier)
    );

    if (invalidProducts.length > 0) {
      throw new ValidationError(
        '一部の商品の帳合先がステップ1で選択されていません'
      );
    }
  }

  private async generateTemplate(
    data: OrderFormData,
    buyerName: string
  ): Promise<Template> {
    const dateStr = format(data.deliveryDate, 'yyyyMMdd');
    const filename = `配分表_${dateStr}`;

    const response = await TemplateService.generateTemplate(
      data,
      buyerName,
      filename
    );

    return {
      filename: response.filename,
      downloadUrl: response.download_url,
      pdfDownloadUrl: response.pdf_download_url,
    };
  }

  private async updateHistory(data: OrderFormData): Promise<void> {
    const userId = this.getCurrentUserId();

    // 各商品の履歴を更新
    await Promise.all(
      data.products.map(async (product) => {
        // 商品履歴
        await this.historyRepo.save({
          userId,
          supplier: product.supplier,
          name: product.name,
          origin: product.origin,
          specification: product.specification || '',
          quantityPerPackage: product.quantityPerPackage,
          unit: product.unit || '',
        });

        // 価格履歴
        if (product.centerCost && product.storeCost && product.priceExcludingTax) {
          await this.pricingRepo.save({
            userId,
            productName: product.name,
            specification: product.specification || '',
            quantityPerPackage: product.quantityPerPackage,
            unit: product.unit || '',
            centerCost: product.centerCost,
            storeCost: product.storeCost,
            priceExcludingTax: product.priceExcludingTax,
            centerFeeRate: product.centerFeeRate,
          });
        }
      })
    );
  }

  private getCurrentUserId(): string {
    // AuthContextから取得
    return 'user-id';
  }
}

// テスト
describe('OrderService', () => {
  let service: OrderService;
  let mockOrderRepo: jest.Mocked<OrderRepository>;
  let mockHistoryRepo: jest.Mocked<ProductHistoryRepository>;
  let mockPricingRepo: jest.Mocked<PricingHistoryRepository>;

  beforeEach(() => {
    mockOrderRepo = createMockRepository();
    mockHistoryRepo = createMockRepository();
    mockPricingRepo = createMockRepository();

    service = new OrderService(
      mockOrderRepo,
      mockHistoryRepo,
      mockPricingRepo
    );
  });

  describe('generateOrder', () => {
    it('should generate order successfully', async () => {
      const mockData = createMockOrderFormData();
      mockOrderRepo.save.mockResolvedValue('order-123');

      const result = await service.generateOrder(mockData, 'テストバイヤー');

      expect(result.orderId).toBe('order-123');
      expect(result.template).toBeDefined();
      expect(mockOrderRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationError for empty suppliers', async () => {
      const mockData = createMockOrderFormData({ suppliers: [] });

      await expect(
        service.generateOrder(mockData, 'テストバイヤー')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid product supplier', async () => {
      const mockData = createMockOrderFormData({
        suppliers: ['帳合先A'],
        products: [
          { supplier: '帳合先B', name: '商品1' }, // 未選択の帳合先
        ],
      });

      await expect(
        service.generateOrder(mockData, 'テストバイヤー')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('validateOrder', () => {
    it('should pass validation for valid order', () => {
      const mockData = createMockOrderFormData();

      expect(() => service['validateOrder'](mockData)).not.toThrow();
    });

    // 他のバリデーションテスト...
  });
});
```

2. **OrderFormContainerの作成**
```typescript
// features/order/ui/OrderFormContainer.tsx (150行以下)

export const OrderFormContainer: React.FC = () => {
  const methods = useForm<OrderFormData>();
  const formState = useOrderFormState();
  const modals = useOrderModals();
  const orderService = useOrderService();
  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (data: OrderFormData) => {
    try {
      const result = await orderService.generateOrder(data);
      modals.preview.open(result);
      showSuccess('注文を生成しました');
    } catch (error) {
      showError(error.message);
    }
  };

  return (
    <FormProvider {...methods}>
      <OrderStepManager
        activeStep={formState.step.active}
        onStepChange={formState.step.set}
      >
        <OrderStepContent
          step={formState.step}
          product={formState.product}
          onSubmit={handleSubmit}
        />
      </OrderStepManager>

      <OrderModals modals={modals} />
    </FormProvider>
  );
};
```

3. **NewOrderPageを薄い層に**
```typescript
// pages/NewOrderPage.tsx (50行以下)

export const NewOrderPage: React.FC = () => {
  return (
    <MainLayout>
      <Container maxWidth="lg">
        <OrderFormContainer />
      </Container>
    </MainLayout>
  );
};
```

---

### Phase 3: レスポンシブデザイン基盤整備 (1週間)

#### Week 6: 共通UIコンポーネント

**目標**: モバイル/PC両対応の共通コンポーネント作成

```typescript
// shared/ui/ResponsiveContainer/ResponsiveContainer.tsx

interface ResponsiveContainerProps {
  children: React.ReactNode;
  mobileLayout?: React.ReactNode;
  desktopLayout?: React.ReactNode;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  mobileLayout,
  desktopLayout,
}) => {
  const { isMobile } = useResponsive();

  if (mobileLayout && desktopLayout) {
    return <>{isMobile ? mobileLayout : desktopLayout}</>;
  }

  return <>{children}</>;
};

// 使用例
<ResponsiveContainer
  mobileLayout={<MobileOrderForm />}
  desktopLayout={<DesktopOrderForm />}
/>
```

**テスト**:
```typescript
describe('ResponsiveContainer', () => {
  it('should render mobile layout on mobile', () => {
    mockUseMediaQuery.mockReturnValue(true); // isMobile = true

    const { getByTestId } = render(
      <ResponsiveContainer
        mobileLayout={<div data-testid="mobile">Mobile</div>}
        desktopLayout={<div data-testid="desktop">Desktop</div>}
      />
    );

    expect(getByTestId('mobile')).toBeInTheDocument();
    expect(queryByTestId('desktop')).not.toBeInTheDocument();
  });

  it('should render desktop layout on desktop', () => {
    mockUseMediaQuery.mockReturnValue(false); // isMobile = false

    const { getByTestId, queryByTestId } = render(
      <ResponsiveContainer
        mobileLayout={<div data-testid="mobile">Mobile</div>}
        desktopLayout={<div data-testid="desktop">Desktop</div>}
      />
    );

    expect(getByTestId('desktop')).toBeInTheDocument();
    expect(queryByTestId('mobile')).not.toBeInTheDocument();
  });
});
```

---

### Phase 4: 配分実績管理機能 (2週間)

#### Week 7-8: 新機能実装

**1. ドメインモデル定義**
```typescript
// features/allocation-result/model/types.ts

export interface AllocationResult {
  id: string;
  orderId: string;
  deliveryDate: Date;
  recordedAt: Date;
  recordedBy: string;
  products: ProductResult[];
  status: 'draft' | 'confirmed' | 'archived';
  notes?: string;
}

export interface ProductResult {
  productId: string;
  name: string;
  planned: PlannedAllocation;
  actual: ActualAllocation;
  quality?: QualityInfo;
  cost?: CostInfo;
}

// ...
```

**2. Repository実装**
```typescript
// features/allocation-result/api/AllocationResultRepository.ts

export class AllocationResultRepository extends FirestoreBaseService<AllocationResult> {
  constructor(db: Firestore) {
    super('allocation_results', db);
  }

  async findByOrderId(orderId: string): Promise<AllocationResult[]> {
    const q = query(
      collection(this.db, this.collectionName),
      where('orderId', '==', orderId),
      orderBy('recordedAt', 'desc')
    );
    return this.executeQuery(q);
  }

  async calculateAccuracyRate(
    userId: string,
    period: DateRange
  ): Promise<number> {
    // 配分精度率の計算
    // (実績 / 計画) の平均
  }

  // ...
}
```

**3. UI実装**
```typescript
// features/allocation-result/ui/AllocationResultForm.tsx

export const AllocationResultForm: React.FC = () => {
  const { orderId } = useParams();
  const order = useOrder(orderId);
  const methods = useForm<AllocationResultFormData>();

  const handleSubmit = async (data: AllocationResultFormData) => {
    await AllocationResultService.saveResult(orderId, data);
  };

  return (
    <FormProvider {...methods}>
      <Box>
        <Typography variant="h5">配分実績入力</Typography>

        {/* 計画 vs 実績の比較表示 */}
        <ComparisonTable
          planned={order.products}
          actual={methods.watch('products')}
        />

        {/* 実績入力フォーム */}
        <ActualAllocationInput />

        {/* 差異入力 */}
        <DiscrepancyInput />

        <Button onClick={methods.handleSubmit(handleSubmit)}>
          保存
        </Button>
      </Box>
    </FormProvider>
  );
};
```

**4. テスト**
```typescript
describe('AllocationResultRepository', () => {
  it('should save allocation result', async () => {
    const result = createMockAllocationResult();
    const id = await repository.save(result);

    expect(id).toBeTruthy();
  });

  it('should calculate accuracy rate correctly', async () => {
    // モックデータ: 計画100, 実績90 → 精度90%
    const rate = await repository.calculateAccuracyRate('user-123', {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31'),
    });

    expect(rate).toBeCloseTo(0.9, 2);
  });
});
```

---

### Phase 5: データ分析基盤 (2週間)

#### Week 9-10: 分析機能実装

**1. BigQuery統合準備**
```typescript
// features/analytics/api/AnalyticsRepository.ts

export class AnalyticsRepository {
  constructor(
    private firestoreRepo: OrderRepository,
    private bigQueryClient?: BigQueryClient // 将来実装
  ) {}

  /**
   * KPIダッシュボードデータ取得
   */
  async getDashboard(
    userId: string,
    period: DateRange
  ): Promise<AnalyticsDashboard> {
    // Firestoreから集計（当面の実装）
    const orders = await this.firestoreRepo.findByDateRange(userId, period);

    return {
      period,
      kpis: this.calculateKPIs(orders),
      trends: this.analyzeTrends(orders),
      productAnalytics: this.analyzeProducts(orders),
      storeAnalytics: this.analyzeStores(orders),
    };
  }

  private calculateKPIs(orders: Order[]): KPIs {
    return {
      totalOrders: orders.length,
      totalProducts: orders.reduce((sum, o) => sum + o.products.length, 0),
      accuracyRate: this.calculateAccuracyRate(orders),
      fillRate: this.calculateFillRate(orders),
      costVariance: this.calculateCostVariance(orders),
    };
  }

  // ...
}
```

**2. ダッシュボードUI**
```typescript
// features/analytics/ui/AnalyticsDashboard.tsx

export const AnalyticsDashboard: React.FC = () => {
  const { data, isLoading } = useAnalytics({
    period: {
      start: subDays(new Date(), 30),
      end: new Date(),
    },
  });

  if (isLoading) return <Skeleton variant="rectangular" height={400} />;

  return (
    <Grid container spacing={3}>
      {/* KPIカード */}
      <Grid item xs={12}>
        <KPICards kpis={data.kpis} />
      </Grid>

      {/* トレンドチャート */}
      <Grid item xs={12} md={8}>
        <TrendChart data={data.trends} />
      </Grid>

      {/* 商品ランキング */}
      <Grid item xs={12} md={4}>
        <ProductRanking products={data.productAnalytics.topProducts} />
      </Grid>

      {/* 店舗パフォーマンス */}
      <Grid item xs={12}>
        <StorePerformanceTable stores={data.storeAnalytics.performance} />
      </Grid>
    </Grid>
  );
};
```

**3. レスポンシブ対応**
```typescript
// モバイルとPCで異なるレイアウト

export const AnalyticsDashboard: React.FC = () => {
  const { isMobile } = useResponsive();

  return isMobile ? (
    <MobileAnalyticsDashboard />
  ) : (
    <DesktopAnalyticsDashboard />
  );
};

// モバイル版: 縦スクロール、カードレイアウト
const MobileAnalyticsDashboard = () => (
  <Stack spacing={2}>
    <KPICards layout="vertical" />
    <TrendChart compact />
    <ProductRanking limit={5} />
  </Stack>
);

// デスクトップ版: グリッドレイアウト、詳細表示
const DesktopAnalyticsDashboard = () => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <KPICards layout="horizontal" />
    </Grid>
    <Grid item xs={8}>
      <TrendChart detailed />
    </Grid>
    <Grid item xs={4}>
      <ProductRanking limit={10} />
    </Grid>
  </Grid>
);
```

---

## 📊 成功指標

### コード品質
- [ ] 最大ファイル行数: 1125行 → 250行以下 (78%削減)
- [ ] テストカバレッジ: 95% → 98%
- [ ] 循環的複雑度: 平均15 → 10以下

### パフォーマンス
- [ ] 初回ロード: 2.5秒 → 1.5秒 (40%改善)
- [ ] ページ遷移: 800ms → 200ms (75%改善)
- [ ] バンドルサイズ: 1.2MB → 600KB (50%削減)

### ドキュメント
- [ ] 実装と一致したドキュメント整備
- [ ] 全機能のドキュメント化
- [ ] APIリファレンス完備

---

## ⚠️ リスクと対策

### リスク1: リファクタリング中のバグ混入
**対策**:
- 段階的移行（Facade パターン使用）
- 各段階でのテスト実施
- リグレッションテスト強化

### リスク2: スケジュール遅延
**対策**:
- 優先度付け（Phase 0-2を最優先）
- 週次レビューでの進捗確認
- Phase 4-5は段階的リリース可能

### リスク3: パフォーマンス劣化
**対策**:
- パフォーマンステストの実施
- バンドルサイズ監視
- 必要に応じてコード分割

---

## 📝 承認

- [ ] 技術リード承認
- [ ] プロダクトオーナー承認
- [ ] セキュリティレビュー完了

---

## 🔗 関連ドキュメント

- [プロジェクト概要](../00-PROJECT-OVERVIEW.md)
- [テスト戦略](../05-TESTING-GUIDE.md)
- [モバイルファーストアプローチ](../design/mobile-first-approach.md)
