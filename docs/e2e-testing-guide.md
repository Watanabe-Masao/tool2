# E2E テスト作成ガイド (Playwright)

**Phase 6 で導入された Playwright E2E テストの作成・実行ガイド**

---

## 📚 目次

1. [概要](#概要)
2. [環境セットアップ](#環境セットアップ)
3. [テストの実行](#テストの実行)
4. [テストの書き方](#テストの書き方)
5. [ベストプラクティス](#ベストプラクティス)
6. [CI/CD 統合](#cicd-統合)
7. [トラブルシューティング](#トラブルシューティング)

---

## 概要

### E2E (End-to-End) テストとは？

E2E テストは、実際のブラウザ環境でアプリケーション全体をテストする手法です。ユーザーの操作フローを自動化し、アプリケーションが期待通りに動作することを検証します。

### Phase 6 で実装した E2E テスト

Playwright を使用して、以下の3つの主要フローをテストしています:

1. **注文作成フロー** - 5ステップの注文作成プロセス
2. **下書き管理** - 自動保存・復元機能
3. **テンプレート生成** - Excel/PDF 生成・ダウンロード

---

## 環境セットアップ

### 必要なパッケージ

```json
{
  "devDependencies": {
    "@playwright/test": "^1.49.1"
  }
}
```

### インストール

```bash
# Playwright のインストール
npm install --save-dev @playwright/test

# ブラウザのインストール
npx playwright install chromium --with-deps

# すべてのブラウザをインストール（オプション）
npx playwright install --with-deps
```

### プロジェクト構成

```
frontend/
├── e2e/                                    # E2E テストディレクトリ
│   ├── order-creation-flow.spec.ts        # 注文作成フロー
│   ├── draft-management.spec.ts           # 下書き管理
│   └── template-generation.spec.ts        # テンプレート生成
├── playwright.config.ts                   # Playwright 設定
└── package.json
```

---

## テストの実行

### ローカル環境

```bash
# すべてのE2Eテストを実行
npm run test:e2e

# 特定のテストファイルを実行
npx playwright test e2e/order-creation-flow.spec.ts

# ヘッドレスモードをオフにして実行（ブラウザを表示）
npx playwright test --headed

# デバッグモード
npx playwright test --debug

# 特定のブラウザで実行
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### UI モードで実行（推奨）

```bash
# Playwright UI を起動
npx playwright test --ui

# テストを選択して実行、結果を視覚的に確認可能
```

### レポートの確認

```bash
# HTML レポートを生成して開く
npx playwright show-report
```

---

## テストの書き方

### 基本構造

```typescript
import { test, expect } from '@playwright/test';

test.describe('テストグループ名', () => {
  test.beforeEach(async ({ page }) => {
    // 各テストの前に実行される
    await page.goto('/');
  });

  test('テストケース名', async ({ page }) => {
    // テストコード
    await page.click('[data-testid="button"]');
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### セレクターの使い方

#### data-testid を使用（推奨）

```typescript
// ✅ Good: data-testid を使用
await page.click('[data-testid="next-button"]');
await page.fill('[data-testid="product-name"]', 'りんご');
await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
```

```typescript
// ❌ Bad: CSS クラスや ID を使用
await page.click('.btn-next');  // スタイル変更で壊れる
await page.fill('#productName'); // リファクタリングで壊れる
```

**理由**: `data-testid` は HTML 構造やスタイルの変更に影響されません。

#### HTML 要素を追加する

```tsx
// コンポーネントに data-testid を追加
<button data-testid="next-button" onClick={handleNext}>
  次へ
</button>

<input data-testid="product-name" value={productName} onChange={handleChange} />
```

### test.step() でステップを整理

```typescript
test('全5ステップで注文を作成できる', async ({ page }) => {
  // ===== ステップ1: 基本情報入力 =====
  await test.step('ステップ1: 基本情報入力', async () => {
    await page.fill('[data-testid="delivery-date"]', '2025-12-01');
    await page.selectOption('[data-testid="supplier-select"]', { label: '帳合先1' });
    await page.click('[data-testid="next-button"]');

    // ステップ2に進んだことを確認
    await expect(page.locator('[data-testid="step-indicator"]')).toContainText('2');
  });

  // ===== ステップ2: 商品追加 =====
  await test.step('ステップ2: 商品追加', async () => {
    await page.fill('[data-testid="product-name"]', 'りんご');
    await page.fill('[data-testid="product-origin"]', '青森県');
    await page.click('[data-testid="add-product-button"]');

    // 商品が追加されたことを確認
    await expect(page.locator('[data-testid="product-list"]')).toContainText('りんご');
  });

  // ... 以下続く
});
```

### 非同期操作の待機

```typescript
// ネットワークリクエストを待機
await page.waitForResponse(response =>
  response.url().includes('/api/template/generate') && response.status() === 200
);

// 要素が表示されるまで待機
await expect(page.locator('[data-testid="success-message"]')).toBeVisible({
  timeout: 30000  // 最大30秒待機
});

// ローディング完了を待機
await page.waitForLoadState('networkidle');
```

### ダウンロードのテスト

```typescript
test('Excel ファイルをダウンロードできる', async ({ page }) => {
  // ダウンロードイベントを待機
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="download-excel-link"]'),
  ]);

  // ファイル名を検証
  expect(download.suggestedFilename()).toMatch(/配分表_.*_\d{8}\.xlsx/);

  // ダウンロードしたファイルを保存（オプション）
  await download.saveAs(`./downloads/${download.suggestedFilename()}`);
});
```

### モーダル・ダイアログのテスト

```typescript
test('確認ダイアログでキャンセルできる', async ({ page }) => {
  await page.click('[data-testid="delete-button"]');

  // ダイアログが表示されるまで待機
  await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();

  // キャンセルボタンをクリック
  await page.click('[data-testid="cancel-button"]');

  // ダイアログが閉じたことを確認
  await expect(page.locator('[data-testid="confirm-dialog"]')).not.toBeVisible();
});
```

### フォーム入力のテスト

```typescript
test('フォーム入力と送信', async ({ page }) => {
  // テキスト入力
  await page.fill('[data-testid="product-name"]', 'りんご');

  // セレクトボックス
  await page.selectOption('[data-testid="supplier-select"]', { label: '帳合先1' });
  // または
  await page.selectOption('[data-testid="supplier-select"]', { index: 1 });

  // チェックボックス
  await page.check('[data-testid="agree-checkbox"]');

  // ラジオボタン
  await page.click('[data-testid="option-a"]');

  // 送信
  await page.click('[data-testid="submit-button"]');

  // 成功メッセージを確認
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

---

## ベストプラクティス

### ✅ DO（推奨）

#### 1. data-testid を使用する

```typescript
// ✅ Good
await page.click('[data-testid="submit-button"]');
```

#### 2. test.step() でテストを構造化する

```typescript
// ✅ Good: ステップごとに分割
await test.step('ユーザー情報入力', async () => {
  await page.fill('[data-testid="name"]', '山田太郎');
  await page.fill('[data-testid="email"]', 'yamada@example.com');
});

await test.step('確認画面で内容をチェック', async () => {
  await expect(page.locator('[data-testid="name-display"]')).toContainText('山田太郎');
});
```

#### 3. 適切なタイムアウトを設定する

```typescript
// ✅ Good: 重い処理には長めのタイムアウト
await expect(page.locator('[data-testid="success-message"]')).toContainText(
  'テンプレートを生成しました',
  { timeout: 30000 }  // 30秒
);
```

#### 4. テストを独立させる

```typescript
// ✅ Good: 各テストは独立して実行可能
test.beforeEach(async ({ page }) => {
  // 毎回初期状態から開始
  await page.goto('/');
  await loginIfNeeded(page);
});
```

#### 5. エラーメッセージを明確にする

```typescript
// ✅ Good
await expect(page.locator('[data-testid="product-list"]')).toContainText(
  'りんご',
  { message: '商品リストに「りんご」が表示されていません' }
);
```

### ❌ DON'T（非推奨）

#### 1. 固定の待機時間を使用しない

```typescript
// ❌ Bad
await page.click('[data-testid="submit"]');
await page.waitForTimeout(5000);  // 5秒待機
```

```typescript
// ✅ Good
await page.click('[data-testid="submit"]');
await page.waitForResponse(resp => resp.url().includes('/api/submit'));
```

#### 2. CSS クラスやスタイルに依存しない

```typescript
// ❌ Bad
await page.click('.btn-primary.submit');
```

```typescript
// ✅ Good
await page.click('[data-testid="submit-button"]');
```

#### 3. 複数のアサーションを1つのテストに詰め込まない

```typescript
// ❌ Bad: 1つのテストで多くのことをテストしている
test('すべての機能', async ({ page }) => {
  // ログイン
  // 商品追加
  // 配分設定
  // テンプレート生成
  // ダウンロード
  // ... 100行以上
});
```

```typescript
// ✅ Good: 機能ごとにテストを分割
test('ログインできる', async ({ page }) => { /* ... */ });
test('商品を追加できる', async ({ page }) => { /* ... */ });
test('テンプレートを生成できる', async ({ page }) => { /* ... */ });
```

---

## CI/CD 統合

### GitHub Actions での実行

Phase 6 で追加された E2E テストジョブ:

```yaml
# .github/workflows/test.yml
e2e-test:
  runs-on: ubuntu-latest
  name: E2E Tests (Playwright)

  steps:
  - name: Checkout code
    uses: actions/checkout@v4

  - name: Set up Node.js
    uses: actions/setup-node@v4
    with:
      node-version: '20'
      cache: 'npm'
      cache-dependency-path: frontend/package-lock.json

  - name: Install frontend dependencies
    working-directory: ./frontend
    run: npm ci

  - name: Install Playwright browsers
    working-directory: ./frontend
    run: npx playwright install --with-deps chromium

  - name: Run E2E tests
    working-directory: ./frontend
    run: npm run test:e2e

  - name: Upload Playwright report
    uses: actions/upload-artifact@v4
    if: always()
    with:
      name: playwright-report
      path: frontend/playwright-report/
      retention-days: 30
```

### レポートの確認

CI/CD で失敗した場合:

1. GitHub Actions の Artifacts から `playwright-report` をダウンロード
2. ローカルで展開して `npx playwright show-report` で確認
3. スクリーンショットやトレースを確認

---

## トラブルシューティング

### テストがタイムアウトする

**原因**: 要素が表示されない、ネットワークリクエストが完了しない

**解決方法**:
```typescript
// タイムアウトを延長
await expect(page.locator('[data-testid="result"]')).toBeVisible({
  timeout: 60000  // 60秒
});

// デバッグモードで実行
// npx playwright test --debug
```

### 要素が見つからない

**原因**: セレクターが間違っている、要素がまだレンダリングされていない

**解決方法**:
```typescript
// 要素の存在を確認
const element = page.locator('[data-testid="my-element"]');
console.log('Element count:', await element.count());

// スクリーンショットを撮る
await page.screenshot({ path: 'debug.png' });
```

### ネットワークエラー

**原因**: API エンドポイントが存在しない、CORS エラー

**解決方法**:
```typescript
// ネットワークリクエストをモック
await page.route('**/api/data', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ data: 'mocked' }),
  });
});
```

### 並列実行で失敗する

**原因**: テストが独立していない、共有リソースへのアクセス

**解決方法**:
```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: false,  // 並列実行をオフ
  workers: 1,            // 1つずつ実行
});
```

---

## 実装済み E2E テスト

### 1. 注文作成フロー (`order-creation-flow.spec.ts`)

```typescript
テストケース:
✅ 全5ステップで注文を作成できる
✅ 各ステップでバリデーションが動作する
✅ ステップ間を前後に移動できる
✅ 商品を複数追加できる
✅ 商品を削除できる
✅ ネットワークエラー時にエラーメッセージを表示
```

### 2. 下書き管理 (`draft-management.spec.ts`)

```typescript
テストケース:
✅ 下書きを自動保存して復元できる
✅ ページをリロードしても下書きが保持される
✅ 下書き復元ダイアログが表示される
✅ 下書きを破棄できる
✅ 複数商品の下書きが保存される
✅ 配分データも下書きに含まれる
✅ テンプレート生成後に下書きがクリアされる
```

### 3. テンプレート生成 (`template-generation.spec.ts`)

```typescript
テストケース:
✅ Excel テンプレートを生成してダウンロードできる
✅ PDF テンプレートを生成してダウンロードできる
✅ PDF プレビューを表示できる
✅ カスタムファイル名を指定できる
✅ API エラー時に適切なエラーメッセージを表示
✅ タイムアウト時に適切にハンドリング
✅ ネットワークエラー時にリトライ機能が動作
✅ 大規模データセットでのパフォーマンステスト
```

---

## まとめ

### E2E テストの価値

| メリット | 説明 |
|---------|------|
| **実環境での検証** | 実際のブラウザで動作確認 |
| **ユーザーフローの保証** | エンドツーエンドの動作を検証 |
| **リグレッション防止** | 既存機能が壊れていないことを確認 |
| **ドキュメント効果** | テストコードが仕様書の役割も果たす |

### 次のステップ

1. ✅ E2E テスト環境構築（完了）
2. ✅ 主要3フローのテスト実装（完了）
3. ✅ CI/CD 統合（完了）
4. ⏭️ 今後: 新機能追加時に E2E テストを追加

---

**Phase 6 E2E テスト導入完了！** 🎉

新しい機能を追加する際は、このガイドに従って E2E テストも作成してください。

---

## 参考リンク

- [Playwright 公式ドキュメント](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Phase 6 実装計画書](./phase-6-implementation-plan.md)
- [Phase 6 完了報告書](./phase-6-completion-report.md)
