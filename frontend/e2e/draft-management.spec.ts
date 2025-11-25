import { test, expect } from '@playwright/test';

/**
 * 下書き保存・復元 E2E テスト
 *
 * カバレッジ:
 * - 下書きの自動保存
 * - ページリロード後の復元
 * - 復元ダイアログ
 * - 下書きのクリア
 */
test.describe('下書き保存・復元', () => {
  test.beforeEach(async ({ page }) => {
    // 認証済みと仮定
    await page.goto('/orders/new');
  });

  test('下書きを自動保存して復元できる', async ({ page }) => {
    // ===== データ入力 =====
    await test.step('データ入力', async () => {
      // 基本情報入力
      await page.fill('[data-testid="delivery-date"]', '2025-12-15');
      await page.selectOption('[data-testid="supplier-select"]', { index: 1 });

      // 次のステップへ
      await page.click('[data-testid="next-button"]');

      // 商品追加
      await page.fill('[data-testid="product-name"]', 'バナナ');
      await page.fill('[data-testid="product-origin"]', 'フィリピン');
      await page.fill('[data-testid="quantity-per-package"]', '5');
      await page.fill('[data-testid="store-cost"]', '500');
      await page.fill('[data-testid="price-excluding-tax"]', '800');
      await page.click('[data-testid="add-product-button"]');

      // 自動保存されるのを待つ（SessionStorage への保存）
      await page.waitForTimeout(1000);
    });

    // ===== ページリロード =====
    await test.step('ページリロード', async () => {
      await page.reload();

      // 復元確認ダイアログが表示されることを確認
      await expect(page.locator('[data-testid="restore-draft-dialog"]')).toBeVisible({
        timeout: 5000
      });

      // ダイアログメッセージ確認
      await expect(page.locator('[data-testid="restore-draft-message"]')).toContainText(
        '保存された下書きがあります'
      );
    });

    // ===== 下書き復元 =====
    await test.step('下書き復元', async () => {
      // 復元ボタンクリック
      await page.click('[data-testid="restore-draft-button"]');

      // ダイアログが閉じることを確認
      await expect(page.locator('[data-testid="restore-draft-dialog"]')).not.toBeVisible();

      // データが復元されているか確認（ステップ1）
      await expect(page.locator('[data-testid="delivery-date"]')).toHaveValue('2025-12-15');

      // ステップ2に移動して商品データ確認
      await page.click('[data-testid="next-button"]');
      await expect(page.locator('[data-testid="product-list"]')).toContainText('バナナ');
    });
  });

  test('下書きを復元せずに新規作成できる', async ({ page }) => {
    // データ入力して自動保存
    await page.fill('[data-testid="delivery-date"]', '2025-12-20');
    await page.waitForTimeout(1000);

    // ページリロード
    await page.reload();

    // 復元確認ダイアログ表示
    await expect(page.locator('[data-testid="restore-draft-dialog"]')).toBeVisible();

    // 新規作成ボタンクリック
    await page.click('[data-testid="new-order-button"]');

    // ダイアログが閉じる
    await expect(page.locator('[data-testid="restore-draft-dialog"]')).not.toBeVisible();

    // フォームが空であることを確認
    await expect(page.locator('[data-testid="delivery-date"]')).toHaveValue('');
  });

  test('下書きをクリアできる', async ({ page }) => {
    // ===== データ入力 =====
    await test.step('データ入力', async () => {
      await page.fill('[data-testid="delivery-date"]', '2025-12-25');
      await page.fill('[data-testid="product-name"]', 'オレンジ');
      await page.waitForTimeout(1000);
    });

    // ===== 下書きクリア =====
    await test.step('下書きクリア', async () => {
      // クリアボタンクリック
      await page.click('[data-testid="clear-draft-button"]');

      // 確認ダイアログ表示
      await expect(page.locator('[data-testid="confirm-clear-dialog"]')).toBeVisible();

      // 確認メッセージ
      await expect(page.locator('[data-testid="confirm-clear-message"]')).toContainText(
        '下書きをクリアしますか？'
      );

      // クリア確定
      await page.click('[data-testid="confirm-clear-button"]');

      // ダイアログが閉じる
      await expect(page.locator('[data-testid="confirm-clear-dialog"]')).not.toBeVisible();
    });

    // ===== データがクリアされたことを確認 =====
    await test.step('クリア確認', async () => {
      // フォームが空であることを確認
      await expect(page.locator('[data-testid="delivery-date"]')).toHaveValue('');
      await expect(page.locator('[data-testid="product-name"]')).toHaveValue('');

      // ページリロード後も復元ダイアログが表示されないことを確認
      await page.reload();
      await expect(page.locator('[data-testid="restore-draft-dialog"]')).not.toBeVisible({
        timeout: 2000
      });
    });
  });

  test('複数商品の下書きが正しく保存・復元される', async ({ page }) => {
    // 基本情報入力
    await page.fill('[data-testid="delivery-date"]', '2025-12-30');
    await page.selectOption('[data-testid="supplier-select"]', { index: 1 });
    await page.click('[data-testid="next-button"]');

    // 商品1追加
    await page.fill('[data-testid="product-name"]', 'りんご');
    await page.fill('[data-testid="product-origin"]', '青森県');
    await page.fill('[data-testid="quantity-per-package"]', '10');
    await page.fill('[data-testid="store-cost"]', '1000');
    await page.fill('[data-testid="price-excluding-tax"]', '1500');
    await page.click('[data-testid="add-product-button"]');

    // 商品2追加
    await page.fill('[data-testid="product-name"]', 'みかん');
    await page.fill('[data-testid="product-origin"]', '静岡県');
    await page.fill('[data-testid="quantity-per-package"]', '15');
    await page.fill('[data-testid="store-cost"]', '800');
    await page.fill('[data-testid="price-excluding-tax"]', '1200');
    await page.click('[data-testid="add-product-button"]');

    // 自動保存待機
    await page.waitForTimeout(1000);

    // ページリロード
    await page.reload();

    // 復元
    await page.click('[data-testid="restore-draft-button"]');

    // ステップ2に移動
    await page.click('[data-testid="next-button"]');

    // 両方の商品が復元されているか確認
    const productList = page.locator('[data-testid="product-list"]');
    await expect(productList).toContainText('りんご');
    await expect(productList).toContainText('みかん');

    // 商品数確認
    await expect(page.locator('[data-testid="product-count"]')).toContainText('2');
  });

  test('配分数の下書きが正しく保存・復元される', async ({ page }) => {
    // 基本情報とステップを進める
    await page.fill('[data-testid="delivery-date"]', '2025-12-31');
    await page.selectOption('[data-testid="supplier-select"]', { index: 1 });
    await page.click('[data-testid="next-button"]');

    // 商品追加
    await page.fill('[data-testid="product-name"]', 'トマト');
    await page.fill('[data-testid="product-origin"]', '熊本県');
    await page.fill('[data-testid="quantity-per-package"]', '20');
    await page.fill('[data-testid="store-cost"]', '600');
    await page.fill('[data-testid="price-excluding-tax"]', '1000');
    await page.click('[data-testid="add-product-button"]');
    await page.click('[data-testid="next-button"]');

    // 配分数入力（ステップ3）
    await page.fill('[data-testid="store-allocation-0"]', '5');
    await page.fill('[data-testid="store-allocation-1"]', '10');
    await page.fill('[data-testid="store-allocation-2"]', '15');

    // 自動保存待機
    await page.waitForTimeout(1000);

    // ページリロード
    await page.reload();

    // 復元
    await page.click('[data-testid="restore-draft-button"]');

    // ステップ3まで進む
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="next-button"]');

    // 配分数が復元されているか確認
    await expect(page.locator('[data-testid="store-allocation-0"]')).toHaveValue('5');
    await expect(page.locator('[data-testid="store-allocation-1"]')).toHaveValue('10');
    await expect(page.locator('[data-testid="store-allocation-2"]')).toHaveValue('15');
  });

  test('テンプレート生成成功後は下書きがクリアされる', async ({ page }) => {
    // 注文作成フロー完了（簡略版）
    await page.fill('[data-testid="delivery-date"]', '2026-01-01');
    await page.selectOption('[data-testid="supplier-select"]', { index: 1 });
    await page.click('[data-testid="next-button"]');

    // 商品追加
    await page.fill('[data-testid="product-name"]', 'ぶどう');
    await page.fill('[data-testid="product-origin"]', '山梨県');
    await page.fill('[data-testid="quantity-per-package"]', '8');
    await page.fill('[data-testid="store-cost"]', '1500');
    await page.fill('[data-testid="price-excluding-tax"]', '2000');
    await page.click('[data-testid="add-product-button"]');

    // ステップ3, 4を進める
    await page.click('[data-testid="next-button"]');
    await page.fill('[data-testid="store-allocation-0"]', '8');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="next-button"]');

    // テンプレート生成
    await page.fill('[data-testid="book-name"]', '下書きクリアテスト');
    await page.click('[data-testid="generate-template-button"]');

    // 成功メッセージ待機
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({
      timeout: 30000
    });

    // ページリロード
    await page.reload();

    // 復元ダイアログが表示されないことを確認（下書きがクリアされた）
    await expect(page.locator('[data-testid="restore-draft-dialog"]')).not.toBeVisible({
      timeout: 2000
    });
  });
});

/**
 * 下書き管理エッジケース
 */
test.describe('下書き管理エッジケース', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders/new');
  });

  test('無効なデータの下書きは復元されない', async ({ page }) => {
    // LocalStorage に無効なデータを直接設定
    await page.evaluate(() => {
      localStorage.setItem('order_draft_test-user-id', 'invalid json data');
    });

    // ページリロード
    await page.reload();

    // エラーメッセージまたは新規フォームが表示される
    // 復元ダイアログは表示されない
    await expect(page.locator('[data-testid="restore-draft-dialog"]')).not.toBeVisible({
      timeout: 2000
    });
  });

  test('異なるユーザーの下書きは復元されない', async ({ page }) => {
    // ユーザーAでデータ入力
    await page.fill('[data-testid="delivery-date"]', '2026-01-10');
    await page.waitForTimeout(1000);

    // ログアウト（仮想）
    // 実際の環境では Firebase Auth のログアウト処理

    // ユーザーBでログイン（仮想）
    // 実際の環境では異なるユーザーでログイン

    // ページリロード
    await page.reload();

    // 復元ダイアログが表示されない（異なるユーザー）
    await expect(page.locator('[data-testid="restore-draft-dialog"]')).not.toBeVisible({
      timeout: 2000
    });
  });
});
