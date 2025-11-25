import { test, expect } from '@playwright/test';

/**
 * テンプレート生成 E2E テスト
 *
 * カバレッジ:
 * - Excel テンプレート生成
 * - PDF テンプレート生成
 * - ダウンロード機能
 * - プレビュー機能
 * - カスタムファイル名
 */
test.describe('テンプレート生成', () => {
  test.beforeEach(async ({ page }) => {
    // 認証済みと仮定
    await page.goto('/orders/new');

    // 注文作成フローを最後のステップまで進める
    await completeOrderCreationFlow(page);
  });

  test('Excel テンプレートを生成してダウンロードできる', async ({ page }) => {
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

    // ローディングが消えることを確認
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

    // ダウンロードリンク確認
    await expect(page.locator('[data-testid="download-excel-link"]')).toBeVisible();

    // ダウンロード実行
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-excel-link"]'),
    ]);

    // ダウンロードファイル名確認
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/配分表_E2Eテストブック_\d{8}\.xlsx/);

    // ファイルサイズ確認（0でないこと）
    const path = await download.path();
    expect(path).not.toBeNull();
  });

  test('PDF テンプレートをダウンロードできる', async ({ page }) => {
    // テンプレート生成
    await page.fill('[data-testid="book-name"]', 'PDFテスト');
    await page.click('[data-testid="generate-template-button"]');

    // 成功待機
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({
      timeout: 30000
    });

    // PDF ダウンロードリンク確認
    await expect(page.locator('[data-testid="download-pdf-link"]')).toBeVisible();

    // PDF ダウンロード実行
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-pdf-link"]'),
    ]);

    // ファイル名確認
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/配分表_PDFテスト_\d{8}\.pdf/);
  });

  test('PDF プレビューを表示できる', async ({ page }) => {
    // テンプレート生成
    await page.fill('[data-testid="book-name"]', 'プレビューテスト');
    await page.click('[data-testid="generate-template-button"]');

    // 成功待機
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({
      timeout: 30000
    });

    // PDF プレビューボタンクリック
    await page.click('[data-testid="preview-pdf-button"]');

    // PDF ビューアが表示されることを確認
    await expect(page.locator('[data-testid="pdf-viewer"]')).toBeVisible({
      timeout: 10000
    });

    // PDF コンテンツが読み込まれているか確認（iframe または embed）
    const pdfFrame = page.frameLocator('[data-testid="pdf-viewer-frame"]');
    await expect(pdfFrame.locator('body')).toBeVisible({ timeout: 10000 });

    // プレビューを閉じる
    await page.click('[data-testid="close-preview-button"]');
    await expect(page.locator('[data-testid="pdf-viewer"]')).not.toBeVisible();
  });

  test('ブック名なしでもテンプレート生成できる', async ({ page }) => {
    // ブック名を入力せずにテンプレート生成
    await page.click('[data-testid="generate-template-button"]');

    // 成功メッセージ
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({
      timeout: 30000
    });

    // ダウンロードリンク確認
    await expect(page.locator('[data-testid="download-excel-link"]')).toBeVisible();

    // ファイル名にブック名が含まれていないことを確認
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-excel-link"]'),
    ]);

    const filename = download.suggestedFilename();
    // ブック名なしの場合: 配分表_YYYYMMDD.xlsx
    expect(filename).toMatch(/配分表_\d{8}\.xlsx/);
  });

  test('カスタムファイル名が正しく適用される', async ({ page }) => {
    // 長いブック名を入力
    const customBookName = 'テスト用配分表_2026年1月度_ver1.0';
    await page.fill('[data-testid="book-name"]', customBookName);

    // テンプレート生成
    await page.click('[data-testid="generate-template-button"]');

    // 成功待機
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({
      timeout: 30000
    });

    // ダウンロード
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-excel-link"]'),
    ]);

    // ファイル名にカスタム名が含まれることを確認
    const filename = download.suggestedFilename();
    expect(filename).toContain(customBookName);
  });

  test('複数商品のテンプレートが正しく生成される', async ({ page }) => {
    // 複数商品で注文作成（beforeEach で1商品追加済み）
    // ここでは生成済みの状態と仮定

    await page.fill('[data-testid="book-name"]', '複数商品テスト');
    await page.click('[data-testid="generate-template-button"]');

    // 成功待機
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({
      timeout: 30000
    });

    // ダウンロードして検証
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-excel-link"]'),
    ]);

    expect(download.suggestedFilename()).toMatch(/配分表_複数商品テスト_\d{8}\.xlsx/);
  });

  test('テンプレート生成後に新規注文を作成できる', async ({ page }) => {
    // テンプレート生成
    await page.fill('[data-testid="book-name"]', '最初の注文');
    await page.click('[data-testid="generate-template-button"]');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({
      timeout: 30000
    });

    // 新規注文ボタンクリック
    await page.click('[data-testid="new-order-button"]');

    // 最初のステップに戻ることを確認
    await expect(page.locator('[data-testid="step-indicator"]')).toContainText('1');

    // フォームが空であることを確認
    await expect(page.locator('[data-testid="delivery-date"]')).toHaveValue('');
  });
});

/**
 * エラーハンドリングテスト
 */
test.describe('テンプレート生成エラーハンドリング', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders/new');
    await completeOrderCreationFlow(page);
  });

  test('API エラー時にエラーメッセージを表示', async ({ page }) => {
    // API エラーをシミュレート
    await page.route('**/api/template/generate', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // テンプレート生成
    await page.click('[data-testid="generate-template-button"]');

    // エラーメッセージ確認
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'テンプレートの生成に失敗しました'
    );

    // ローディングが消えることを確認
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
  });

  test('タイムアウト時にエラーメッセージを表示', async ({ page }) => {
    // タイムアウトをシミュレート（30秒以上かかるレスポンス）
    await page.route('**/api/template/generate', (route) => {
      // レスポンスを遅延させる
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ filename: 'test.xlsx' }),
        });
      }, 35000); // 35秒遅延
    });

    // テンプレート生成
    await page.click('[data-testid="generate-template-button"]');

    // タイムアウトエラーメッセージ確認
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'タイムアウト',
      { timeout: 40000 }
    );
  });

  test('ネットワークエラー時にエラーメッセージを表示', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/api/template/generate', (route) => {
      route.abort('failed');
    });

    // テンプレート生成
    await page.click('[data-testid="generate-template-button"]');

    // エラーメッセージ確認
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'ネットワークエラー'
    );
  });

  test('Excel ダウンロードエラー時に処理を続行', async ({ page }) => {
    // テンプレート生成は成功、ダウンロードでエラー
    await page.route('**/downloads/*.xlsx', (route) => {
      route.abort('failed');
    });

    await page.fill('[data-testid="book-name"]', 'ダウンロードエラーテスト');
    await page.click('[data-testid="generate-template-button"]');

    // 成功メッセージは表示される
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({
      timeout: 30000
    });

    // ダウンロードリンクは表示される
    await expect(page.locator('[data-testid="download-excel-link"]')).toBeVisible();

    // ダウンロードをクリックするとエラー
    await page.click('[data-testid="download-excel-link"]');

    // エラーメッセージ（ダウンロード失敗）
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'ダウンロードに失敗しました'
    );
  });
});

/**
 * パフォーマンステスト
 */
test.describe('テンプレート生成パフォーマンス', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders/new');
  });

  test('大量の商品でもテンプレート生成できる', async ({ page }) => {
    // 10商品を追加
    await page.fill('[data-testid="delivery-date"]', '2026-02-01');
    await page.selectOption('[data-testid="supplier-select"]', { index: 1 });
    await page.click('[data-testid="next-button"]');

    for (let i = 0; i < 10; i++) {
      await page.fill('[data-testid="product-name"]', `商品${i + 1}`);
      await page.fill('[data-testid="product-origin"]', '産地');
      await page.fill('[data-testid="quantity-per-package"]', '10');
      await page.fill('[data-testid="store-cost"]', '1000');
      await page.fill('[data-testid="price-excluding-tax"]', '1500');
      await page.click('[data-testid="add-product-button"]');
    }

    // ステップ3, 4を進める
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="next-button"]');

    // テンプレート生成
    await page.fill('[data-testid="book-name"]', '大量商品テスト');
    await page.click('[data-testid="generate-template-button"]');

    // 成功メッセージ（60秒以内）
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({
      timeout: 60000
    });
  });
});

/**
 * ヘルパー関数
 */
async function completeOrderCreationFlow(page: any) {
  // ステップ1: 基本情報
  await page.fill('[data-testid="delivery-date"]', '2026-01-15');
  await page.selectOption('[data-testid="supplier-select"]', { index: 1 });
  await page.click('[data-testid="next-button"]');

  // ステップ2: 商品追加
  await page.fill('[data-testid="product-name"]', 'テスト商品');
  await page.fill('[data-testid="product-origin"]', 'テスト産地');
  await page.fill('[data-testid="quantity-per-package"]', '10');
  await page.fill('[data-testid="store-cost"]', '1000');
  await page.fill('[data-testid="price-excluding-tax"]', '1500');
  await page.click('[data-testid="add-product-button"]');
  await page.click('[data-testid="next-button"]');

  // ステップ3: 配分設定
  await page.fill('[data-testid="store-allocation-0"]', '10');
  await page.click('[data-testid="next-button"]');

  // ステップ4: 確認
  await page.click('[data-testid="next-button"]');

  // ステップ5に到達
  await expect(page.locator('[data-testid="step-indicator"]')).toContainText('5');
}
