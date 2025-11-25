# テスト戦略ガイド

## 🎯 テスト方針

### テストピラミッド

```
        /\
       /  \    E2E Tests (5%)
      /────\   - 主要ユーザーフロー
     /      \  - クリティカルパス
    /────────\
   / Integration\ Integration Tests (25%)
  /──────────────\ - API統合
 /    Unit Tests  \ - コンポーネント統合
/──────────────────\
   Unit Tests (70%)
   - ビジネスロジック
   - ユーティリティ
   - 個別コンポーネント
```

---

## 🧪 テスト種別

### 1. ユニットテスト

**対象**:
- ビジネスロジック関数
- カスタムフック
- ユーティリティ関数
- Pureコンポーネント

**ツール**:
- Backend: `pytest`
- Frontend: `vitest` + `@testing-library/react`

**カバレッジ目標**: 95%以上

#### Backend例

```python
# tests/unit/services/test_order_service.py

import pytest
from datetime import date
from services.order_service import OrderService
from domain.models import Order, Product

class TestOrderService:
    """OrderServiceのユニットテスト"""

    def test_validate_order_success(self):
        """有効な注文データのバリデーション成功"""
        # Arrange
        order = Order(
            delivery_date=date(2025, 1, 25),
            suppliers=["帳合先A"],
            products=[
                Product(
                    supplier="帳合先A",
                    name="商品1",
                    origin="産地A",
                    total_delivery=360
                )
            ]
        )

        # Act & Assert
        OrderService.validate_order(order)  # 例外が発生しないことを確認

    def test_validate_order_empty_suppliers(self):
        """帳合先が空の場合はValidationError"""
        # Arrange
        order = Order(
            delivery_date=date(2025, 1, 25),
            suppliers=[],
            products=[]
        )

        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            OrderService.validate_order(order)

        assert "帳合先" in str(exc_info.value)

    def test_calculate_total_cost(self):
        """総コスト計算の正確性"""
        # Arrange
        products = [
            Product(name="商品1", store_cost=100, total_delivery=10),
            Product(name="商品2", store_cost=200, total_delivery=5),
        ]

        # Act
        total = OrderService.calculate_total_cost(products)

        # Assert
        assert total == 2000  # (100*10) + (200*5)
```

#### Frontend例

```typescript
// frontend/src/hooks/__tests__/useOrderForm.test.ts

import { renderHook, act } from '@testing-library/react';
import { useOrderForm } from '../useOrderForm';

describe('useOrderForm', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useOrderForm());

    expect(result.current.activeStep).toBe(0);
    expect(result.current.products).toHaveLength(1);
  });

  it('should add product correctly', () => {
    const { result } = renderHook(() => useOrderForm());

    act(() => {
      result.current.addProduct();
    });

    expect(result.current.products).toHaveLength(2);
  });

  it('should not remove last product', () => {
    const { result } = renderHook(() => useOrderForm());

    act(() => {
      result.current.removeProduct(0);
    });

    // 最後の1つは削除できない
    expect(result.current.products).toHaveLength(1);
  });
});
```

---

### 2. 統合テスト

**対象**:
- APIエンドポイント
- データベース操作
- 外部サービス連携

#### API統合テスト

```python
# tests/integration/test_api_generate.py

import pytest
from fastapi.testclient import TestClient
from app import app

@pytest.fixture
def client():
    return TestClient(app)

class TestGenerateAPI:
    """テンプレート生成APIの統合テスト"""

    def test_generate_template_success(self, client):
        """正常なテンプレート生成フロー"""
        # Arrange
        payload = {
            "delivery_date": "2025-01-25",
            "suppliers": ["帳合先A"],
            "buyer_name": "テストバイヤー",
            "products": [
                {
                    "supplier": "帳合先A",
                    "name": "商品1",
                    "origin": "産地A",
                    "specification": "規格A",
                    "quantity_per_package": 10,
                    "unit": "個",
                    "store_cost": 100,
                    "price_excluding_tax": 150,
                    "total_delivery": 360,
                    "store_allocations": [10] * 36
                }
            ]
        }

        # Act
        response = client.post("/api/generate", json=payload)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "download_url" in data
        assert "filename" in data

        # ファイルが実際に生成されているか確認
        download_response = client.get(data["download_url"])
        assert download_response.status_code == 200
        assert download_response.headers["content-type"].startswith("application/")

    def test_generate_template_invalid_data(self, client):
        """無効なデータでのエラーハンドリング"""
        # Arrange
        payload = {
            "delivery_date": "invalid-date",
            "suppliers": [],
            "products": []
        }

        # Act
        response = client.post("/api/generate", json=payload)

        # Assert
        assert response.status_code == 422  # Validation Error
```

#### Firestore統合テスト

```typescript
// frontend/src/services/__tests__/OrderFirestoreService.integration.test.ts

import { OrderFirestoreService } from '../firestore/OrderFirestoreService';
import { initializeTestFirestore, cleanupTestData } from '@/test-utils/firestore';

describe('OrderFirestoreService Integration', () => {
  let service: OrderFirestoreService;
  const testUserId = 'test-user-123';

  beforeAll(async () => {
    await initializeTestFirestore();
    service = new OrderFirestoreService();
  });

  afterEach(async () => {
    await cleanupTestData(testUserId);
  });

  it('should save and retrieve order', async () => {
    // Arrange
    const order = {
      deliveryDate: new Date('2025-01-25'),
      suppliers: ['帳合先A'],
      products: [
        {
          supplier: '帳合先A',
          name: '商品1',
          origin: '産地A',
          totalDelivery: 360,
          storeAllocations: new Array(36).fill(10),
        },
      ],
      buyerName: 'テストバイヤー',
    };

    // Act
    const orderId = await service.saveOrder(order, testUserId);
    const retrieved = await service.getOrderById(orderId);

    // Assert
    expect(retrieved).not.toBeNull();
    expect(retrieved!.deliveryDate).toEqual(order.deliveryDate);
    expect(retrieved!.suppliers).toEqual(order.suppliers);
    expect(retrieved!.products[0].name).toBe('商品1');
  });

  it('should handle pagination correctly', async () => {
    // Arrange - 25件の注文を作成
    const orders = Array.from({ length: 25 }, (_, i) => ({
      deliveryDate: new Date('2025-01-25'),
      suppliers: ['帳合先A'],
      products: [],
      buyerName: `バイヤー${i}`,
    }));

    for (const order of orders) {
      await service.saveOrder(order, testUserId);
    }

    // Act - 1ページ目（20件）
    const page1 = await service.getUserOrdersPaginated(testUserId, { limit: 20 });

    // Assert
    expect(page1.items).toHaveLength(20);
    expect(page1.hasMore).toBe(true);

    // Act - 2ページ目（残り5件）
    const page2 = await service.getUserOrdersPaginated(testUserId, {
      limit: 20,
      startAfter: page1.lastDoc,
    });

    // Assert
    expect(page2.items).toHaveLength(5);
    expect(page2.hasMore).toBe(false);
  });
});
```

---

### 3. E2Eテスト

**対象**:
- 主要ユーザーフロー
- クリティカルパス

**ツール**: Playwright

```typescript
// e2e/order-creation-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('注文作成フロー', () => {
  test('モバイル: 新規注文の作成から生成まで', async ({ page }) => {
    // モバイルビューポート
    await page.setViewportSize({ width: 375, height: 667 });

    // 1. ログイン
    await page.goto('/login');
    await page.click('button:has-text("Googleでログイン")');
    // ... 認証フロー ...

    // 2. 新規注文ページへ
    await page.goto('/new-order');

    // 3. Step 1: 店着日・帳合先入力
    await page.fill('input[name="deliveryDate"]', '2025-01-25');
    await page.fill('input[name="suppliers.0"]', '帳合先A');
    await page.click('button:has-text("次へ")');

    // 4. Step 2: 商品情報入力
    await page.fill('input[name="products.0.name"]', '商品1');
    await page.fill('input[name="products.0.origin"]', '産地A');
    await page.click('button:has-text("次へ")');

    // 5. Step 3: 価格・数量
    await page.fill('input[name="products.0.storeCost"]', '100');
    await page.fill('input[name="products.0.priceExcludingTax"]', '150');
    await page.click('button:has-text("次へ")');

    // 6. Step 4: 配分入力
    // 店舗1-36に10ずつ配分
    for (let i = 0; i < 36; i++) {
      await page.fill(`input[name="products.0.storeAllocations.${i}"]`, '10');
    }
    await page.click('button:has-text("次へ")');

    // 7. Step 5: プレビュー・生成
    await expect(page.locator('text=総納品数: 360')).toBeVisible();
    await page.click('button:has-text("テンプレート生成")');

    // 8. ブック名入力
    await page.fill('input[label="ブック名"]', 'テスト');
    await page.click('button:has-text("生成")');

    // 9. 成功メッセージ確認
    await expect(page.locator('text=テンプレートを生成しました')).toBeVisible({
      timeout: 10000,
    });

    // 10. ダウンロードボタンが表示されることを確認
    await expect(page.locator('button:has-text("Excelダウンロード")')).toBeVisible();
  });

  test('PC: キーボードショートカットでの操作', async ({ page }) => {
    // デスクトップビューポート
    await page.setViewportSize({ width: 1920, height: 1080 });

    // ... 同様のフロー + キーボード操作 ...

    // 次のステップへ（Ctrl+Enter）
    await page.keyboard.press('Control+Enter');

    // 商品追加（Ctrl+N）
    await page.keyboard.press('Control+N');

    // 保存（Ctrl+S）
    await page.keyboard.press('Control+S');
  });
});
```

---

## 🔍 テスト実行時のエラー精査プロトコル

### エラー発生時の判断フロー

```
エラー発生
    ↓
┌─────────────────────┐
│ 1. エラーメッセージ │
│    を精読           │
└─────────────────────┘
    ↓
┌─────────────────────┐
│ 2. スタックトレース │
│    を確認           │
└─────────────────────┘
    ↓
┌──────────────────────────────┐
│ 3. 問題箇所を特定            │
│  ・テストコード？            │
│  ・実装コード？              │
│  ・テストセットアップ？      │
└──────────────────────────────┘
    ↓
┌──────────────────────────────┐
│ 4. 最小再現ケースを作成      │
└──────────────────────────────┘
    ↓
┌──────────────────────────────┐
│ 5. ドキュメント・仕様と照合  │
└──────────────────────────────┘
    ↓
    判断
```

### 判断チェックリスト

#### テストが間違っている可能性が高いケース

- [ ] **テストのアサーションが仕様と異なる**
  ```typescript
  // ❌ 間違ったテスト
  expect(result.totalDelivery).toBe(100); // 仕様は360

  // ✅ 正しいテスト
  expect(result.totalDelivery).toBe(360);
  ```

- [ ] **モックの設定が不適切**
  ```typescript
  // ❌ 間違ったモック
  vi.mocked(firestoreService.saveOrder).mockResolvedValue(undefined);

  // ✅ 正しいモック
  vi.mocked(firestoreService.saveOrder).mockResolvedValue('order-123');
  ```

- [ ] **非同期処理の待機漏れ**
  ```typescript
  // ❌ awaitなし
  const result = service.fetchData();
  expect(result.data).toBeDefined();

  // ✅ await付き
  const result = await service.fetchData();
  expect(result.data).toBeDefined();
  ```

#### 実装が間違っている可能性が高いケース

- [ ] **ビジネスロジックの不具合**
  ```python
  # ❌ 間違った実装
  def calculate_total(products):
      return sum(p.quantity for p in products)  # 価格を考慮していない

  # ✅ 正しい実装
  def calculate_total(products):
      return sum(p.quantity * p.price for p in products)
  ```

- [ ] **エッジケースの未処理**
  ```typescript
  // ❌ nullチェックなし
  function getFirstProduct(order: Order) {
    return order.products[0]; // productsが空の場合エラー
  }

  // ✅ nullチェック付き
  function getFirstProduct(order: Order) {
    if (order.products.length === 0) {
      throw new Error('No products in order');
    }
    return order.products[0];
  }
  ```

- [ ] **型の不一致**
  ```typescript
  // ❌ 型の不一致
  function formatDate(date: string): string {
    return date.toISOString(); // stringにtoISOString()はない
  }

  // ✅ 型を修正
  function formatDate(date: Date): string {
    return date.toISOString();
  }
  ```

### エラー精査テンプレート

```markdown
## エラー報告書

### 1. 基本情報
- **日時**: 2025-01-24 14:30
- **テストファイル**: `tests/unit/services/test_order_service.py`
- **テスト名**: `test_calculate_total_cost`
- **エラータイプ**: AssertionError

### 2. エラーメッセージ
```
AssertionError: assert 1000 == 2000
  Expected: 2000
  Actual: 1000
```

### 3. スタックトレース
```
tests/unit/services/test_order_service.py:45: AssertionError
    assert total == 2000
services/order_service.py:78: calculate_total_cost
    return sum(p.store_cost for p in products)
```

### 4. 分析

#### 期待される動作（仕様）
- 総コスト = Σ(店着原価 × 総納品数)
- 商品1: 100円 × 10個 = 1,000円
- 商品2: 200円 × 5個 = 1,000円
- 合計: 2,000円

#### 実際の動作
- 実装が店着原価のみを合計している
- 総納品数を考慮していない

#### 判断
🔴 **実装が間違っている**

理由:
- テストは仕様通り（価格×数量の合計）
- 実装が数量を考慮していない

### 5. 修正方針

#### 実装コードを修正
```python
# Before
def calculate_total_cost(products):
    return sum(p.store_cost for p in products)

# After
def calculate_total_cost(products):
    return sum(p.store_cost * p.total_delivery for p in products)
```

### 6. 再テスト結果
✅ テスト成功

### 7. 追加対応
- [ ] 同様の問題がないか他のメソッドをレビュー
- [ ] エッジケース（空配列等）のテスト追加
- [ ] ドキュメントに計算式を明記
```

---

## 🎯 テストカバレッジ目標

### 全体
- **ユニットテスト**: 95%以上
- **統合テスト**: 主要フロー100%
- **E2Eテスト**: クリティカルパス100%

### コンポーネント別
| コンポーネント | 目標カバレッジ | 現状 | ギャップ |
|---------------|---------------|------|---------|
| Backend API   | 95%           | 95%  | 0%      |
| Services      | 98%           | 96%  | -2%     |
| Frontend Hooks| 90%           | 70%  | -20% 🔴 |
| UI Components | 85%           | 60%  | -25% 🔴 |
| Utils         | 100%          | 100% | 0%      |

---

## 🚀 テスト実行コマンド

### Backend

```bash
# 全テスト実行
pytest

# カバレッジ付き
pytest --cov=config --cov=services --cov-report=html

# 特定のテストのみ
pytest tests/unit/services/test_order_service.py

# 並列実行（高速化）
pytest -n auto

# 失敗したテストのみ再実行
pytest --lf
```

### Frontend

```bash
# 全テスト実行
npm test

# カバレッジ付き
npm run test:coverage

# watch モード（開発中）
npm run test:watch

# 特定のテストのみ
npm test -- useOrderForm

# UI モード（対話的）
npm run test:ui
```

### E2E

```bash
# 全E2Eテスト実行
npm run e2e

# ヘッドレスモード
npm run e2e:headless

# 特定のブラウザ
npm run e2e -- --project=chromium

# デバッグモード
npm run e2e:debug
```

---

## 📋 テストチェックリスト

### PR作成前
- [ ] 全ユニットテストが成功
- [ ] カバレッジが目標以上
- [ ] 新機能にテストを追加
- [ ] E2Eテストが成功（該当する場合）
- [ ] エラーケースのテストを追加

### リファクタリング時
- [ ] 既存テストが全て成功
- [ ] テストの意図を保持
- [ ] 不要なテストを削除
- [ ] テストコードもリファクタリング

### バグ修正時
- [ ] バグを再現するテストを追加
- [ ] 修正後にテストが成功
- [ ] 同様のバグがないか確認
- [ ] リグレッションテストを強化
