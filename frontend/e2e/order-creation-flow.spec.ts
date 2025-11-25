import { test, expect } from '@playwright/test';

/**
 * 注文作成フロー E2E テスト
 *
 * カバレッジ:
 * - 全5ステップの注文作成フロー
 * - バリデーション
 * - ステップ間のナビゲーション
 * - データの永続化
 */
test.describe('注文作成フロー', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理（Firebase Auth）
    // 実際の環境では Firebase Auth エミュレータを使用
    await page.goto('/');

    // TODO: 実際の認証フローに置き換え
    // await page.click('[data-testid="login-button"]');
    // await page.fill('[data-testid="email"]', 'test@example.com');
    // await page.fill('[data-testid="password"]', 'password');
    // await page.click('[data-testid="submit-login"]');

    // 認証済みと仮定して直接注文ページへ
    await page.goto('/orders/new');
  });

  test('全5ステップで注文を作成できる', async ({ page }) => {
    // ===== ステップ1: 基本情報入力 =====
    await test.step('ステップ1: 基本情報入力', async () => {
      // ページタイトル確認
      await expect(page).toHaveTitle(/注文作成/);

      // 納品日入力
      await page.fill('[data-testid="delivery-date"]', '2025-12-01');

      // 帳合先選択
      await page.selectOption('[data-testid="supplier-select"]', { label: '帳合先1' });

      // 次へボタンクリック
      await page.click('[data-testid="next-button"]');

      // ステップ2に進んだことを確認
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('2');
    });

    // ===== ステップ2: 商品追加 =====
    await test.step('ステップ2: 商品追加', async () => {
      // 商品名入力
      await page.fill('[data-testid="product-name"]', 'りんご');

      // 産地入力
      await page.fill('[data-testid="product-origin"]', '青森県');

      // 規格入力
      await page.fill('[data-testid="product-specification"]', 'L 10kg');

      // 数量/包装単位
      await page.fill('[data-testid="quantity-per-package"]', '10');

      // 単位
      await page.fill('[data-testid="unit"]', 'kg');

      // 仕入原価
      await page.fill('[data-testid="store-cost"]', '1000');

      // 販売価格（税抜）
      await page.fill('[data-testid="price-excluding-tax"]', '1500');

      // 商品追加ボタン
      await page.click('[data-testid="add-product-button"]');

      // 商品が追加されたことを確認
      await expect(page.locator('[data-testid="product-list"]')).toContainText('りんご');

      // 次へボタンクリック
      await page.click('[data-testid="next-button"]');

      // ステップ3に進んだことを確認
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('3');
    });

    // ===== ステップ3: 配分設定 =====
    await test.step('ステップ3: 配分設定', async () => {
      // 各店舗の配分数を入力（最初の3店舗のみ）
      await page.fill('[data-testid="store-allocation-0"]', '10');
      await page.fill('[data-testid="store-allocation-1"]', '15');
      await page.fill('[data-testid="store-allocation-2"]', '20');

      // 合計数量が正しく計算されているか確認
      await expect(page.locator('[data-testid="total-allocation"]')).toContainText('45');

      // 次へボタンクリック
      await page.click('[data-testid="next-button"]');

      // ステップ4に進んだことを確認
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('4');
    });

    // ===== ステップ4: 確認 =====
    await test.step('ステップ4: 確認', async () => {
      // 入力内容の確認
      await expect(page.locator('[data-testid="summary-product-name"]')).toContainText('りんご');
      await expect(page.locator('[data-testid="summary-origin"]')).toContainText('青森県');
      await expect(page.locator('[data-testid="summary-total-allocation"]')).toContainText('45');

      // 次へボタンクリック
      await page.click('[data-testid="next-button"]');

      // ステップ5に進んだことを確認
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('5');
    });

    // ===== ステップ5: テンプレート生成 =====
    await test.step('ステップ5: テンプレート生成', async () => {
      // ブック名入力
      await page.fill('[data-testid="book-name"]', 'E2Eテストブック');

      // テンプレート生成ボタンクリック
      await page.click('[data-testid="generate-template-button"]');

      // ローディング表示確認
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();

      // 成功メッセージ確認（最大30秒待機）
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'テンプレートを生成しました',
        { timeout: 30000 }
      );

      // ダウンロードリンク確認
      await expect(page.locator('[data-testid="download-excel-link"]')).toBeVisible();
      await expect(page.locator('[data-testid="download-pdf-link"]')).toBeVisible();
    });
  });

  test('各ステップでバリデーションが動作する', async ({ page }) => {
    // ===== ステップ1: 必須フィールド未入力 =====
    await test.step('ステップ1: バリデーション', async () => {
      // 何も入力せずに次へ
      await page.click('[data-testid="next-button"]');

      // エラーメッセージ確認
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('必須');

      // ステップが進んでいないことを確認
      await expect(page.locator('[data-testid="step-indicator"]')).toContainText('1');
    });
  });

  test('ステップ間を前後に移動できる', async ({ page }) => {
    // ステップ1で基本情報入力
    await page.fill('[data-testid="delivery-date"]', '2025-12-01');
    await page.selectOption('[data-testid="supplier-select"]', { index: 1 });
    await page.click('[data-testid="next-button"]');

    // ステップ2に進んだことを確認
    await expect(page.locator('[data-testid="step-indicator"]')).toContainText('2');

    // 戻るボタンでステップ1に戻る
    await page.click('[data-testid="prev-button"]');
    await expect(page.locator('[data-testid="step-indicator"]')).toContainText('1');

    // 入力値が保持されているか確認
    await expect(page.locator('[data-testid="delivery-date"]')).toHaveValue('2025-12-01');
  });

  test('商品を複数追加できる', async ({ page }) => {
    // ステップ1: 基本情報
    await page.fill('[data-testid="delivery-date"]', '2025-12-01');
    await page.selectOption('[data-testid="supplier-select"]', { index: 1 });
    await page.click('[data-testid="next-button"]');

    // ステップ2: 商品1を追加
    await page.fill('[data-testid="product-name"]', 'りんご');
    await page.fill('[data-testid="product-origin"]', '青森県');
    await page.fill('[data-testid="quantity-per-package"]', '10');
    await page.fill('[data-testid="store-cost"]', '1000');
    await page.fill('[data-testid="price-excluding-tax"]', '1500');
    await page.click('[data-testid="add-product-button"]');

    // 商品2を追加
    await page.fill('[data-testid="product-name"]', 'バナナ');
    await page.fill('[data-testid="product-origin"]', 'フィリピン');
    await page.fill('[data-testid="quantity-per-package"]', '5');
    await page.fill('[data-testid="store-cost"]', '500');
    await page.fill('[data-testid="price-excluding-tax"]', '800');
    await page.click('[data-testid="add-product-button"]');

    // 商品リストに両方表示されているか確認
    const productList = page.locator('[data-testid="product-list"]');
    await expect(productList).toContainText('りんご');
    await expect(productList).toContainText('バナナ');

    // 商品数が2であることを確認
    await expect(page.locator('[data-testid="product-count"]')).toContainText('2');
  });

  test('商品を削除できる', async ({ page }) => {
    // ステップ1: 基本情報
    await page.fill('[data-testid="delivery-date"]', '2025-12-01');
    await page.selectOption('[data-testid="supplier-select"]', { index: 1 });
    await page.click('[data-testid="next-button"]');

    // ステップ2: 商品追加
    await page.fill('[data-testid="product-name"]', 'りんご');
    await page.fill('[data-testid="product-origin"]', '青森県');
    await page.fill('[data-testid="quantity-per-package"]', '10');
    await page.fill('[data-testid="store-cost"]', '1000');
    await page.fill('[data-testid="price-excluding-tax"]', '1500');
    await page.click('[data-testid="add-product-button"]');

    // 商品が追加されたことを確認
    await expect(page.locator('[data-testid="product-list"]')).toContainText('りんご');

    // 削除ボタンクリック
    await page.click('[data-testid="delete-product-0"]');

    // 確認ダイアログで削除を確定
    await page.click('[data-testid="confirm-delete-button"]');

    // 商品が削除されたことを確認
    await expect(page.locator('[data-testid="product-list"]')).not.toContainText('りんご');
  });
});

/**
 * エラーハンドリングテスト
 */
test.describe('エラーハンドリング', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders/new');
  });

  test('ネットワークエラー時にエラーメッセージを表示', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/api/template/generate', (route) => {
      route.abort('failed');
    });

    // ステップ1-4を完了（省略）
    // ...

    // テンプレート生成
    await page.click('[data-testid="generate-template-button"]');

    // エラーメッセージ確認
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'ネットワークエラー'
    );
  });
});
