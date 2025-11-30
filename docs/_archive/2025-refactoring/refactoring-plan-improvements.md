# Custom Hooks リファクタリング計画 - 改善提案

## 概要
初期計画レビューで特定した5つの懸念事項について、コード調査を実施し具体的な改善案を策定しました。

---

## 1. useStepNavigation vs useStepActions の関係性

### 調査結果
**useStepNavigation** (既存・123行):
- **責務**: NavigationContext への状態同期
- ステップ変更ロジックは**持たない**（外部から `handlePrevStep`/`handleNextStep` を受け取り、Context に渡すだけ）
- `setStepNavigation()` を呼び出して UI 状態を更新

**useStepActions** (提案):
- **責務**: 実際のステップ変更ロジックの実装
- `handlePrevStep`, `handleNextStep`, `handleTabChange` を**提供**
- `setActiveStep()` を呼び出して状態を変更

### 結論: ✅ 両方を保持すべき（異なるレイヤーの責務）

```typescript
// アーキテクチャ図
Component
    ↓ 使用
useStepActions (新規)
    ↓ 提供: handlePrevStep/handleNextStep
useStepNavigation (既存)
    ↓ Context 同期
NavigationContext
```

### 実装例

```typescript
// hooks/useStepActions.ts
export const useStepActions = ({
  activeStep,
  setActiveStep,
  TOTAL_STEPS,
}: UseStepActionsParams) => {
  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      setActiveStep(newValue);
    },
    [setActiveStep]
  );

  const handlePrevStep = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  }, [activeStep, setActiveStep]);

  const handleNextStep = useCallback(() => {
    if (activeStep < TOTAL_STEPS - 1) {
      setActiveStep(activeStep + 1);
    }
  }, [activeStep, TOTAL_STEPS, setActiveStep]);

  return {
    handleTabChange,
    handlePrevStep,
    handleNextStep,
  };
};

// Component での使用例
const MyComponent = () => {
  const [activeStep, setActiveStep] = useState(0);

  // ステップ変更ロジック
  const { handlePrevStep, handleNextStep, handleTabChange } = useStepActions({
    activeStep,
    setActiveStep,
    TOTAL_STEPS: 5,
  });

  // Context 同期
  useStepNavigation({
    activeStep,
    // ... その他のパラメータ
    handlePrevStep, // useStepActions から受け取る
    handleNextStep, // useStepActions から受け取る
  });
};
```

---

## 2. エラーハンドリング戦略

### 現在のパターン分析

既存の `useOrderSubmit` は一貫したエラーハンドリングパターンを持つ：

```typescript
try {
  showLoading();
  // ビジネスロジック
  hideLoading();
  showSuccess('成功メッセージ');
  return true;
} catch (error) {
  hideLoading();
  showError(error instanceof Error ? error.message : 'デフォルトエラーメッセージ');
  return false;
}
```

### 推奨戦略: 個別エラーハンドリング

**理由**:
- ✅ テストが容易（各hookを独立してテスト可能）
- ✅ エラーメッセージが明確（どの処理で失敗したか特定しやすい）
- ✅ 既存のパターンを踏襲（学習コスト低）

### 実装例

```typescript
// hooks/useOrderDataSubmit.ts
export const useOrderDataSubmit = (params: UseOrderDataSubmitParams) => {
  const submitOrderData = async (
    data: OrderFormData,
    onBookNameDialogOpen: () => void
  ): Promise<boolean> => {
    try {
      showLoading();

      // バリデーション
      const invalidProducts = data.products.filter(
        (product) => !data.suppliers.includes(product.supplier)
      );

      if (invalidProducts.length > 0) {
        hideLoading();
        showError('一部の商品の帳合先がステップ1で選択されていません。');
        return false;
      }

      // データ保存
      await saveOrderWithSync(data, buyerName);

      hideLoading();

      // オンライン時はダイアログ表示
      if (isOnline) {
        onBookNameDialogOpen();
        return false; // ダイアログ確認待ち
      }

      showSuccess('オフラインのため配分表を保存しました');
      return true;
    } catch (error) {
      hideLoading();
      showError(error instanceof Error ? error.message : 'データ保存に失敗しました');
      return false;
    }
  };

  return { submitOrderData };
};

// 統合hookでの使用
export const useOrderSubmit = (params: UseOrderSubmitParams) => {
  const dataSubmit = useOrderDataSubmit({...});
  const historyTracking = useHistoryTracking({...});
  const templateGeneration = useTemplateGeneration({...});

  const handleSubmit = async (data: OrderFormData, onBookNameDialogOpen: () => void) => {
    // エラーハンドリングは各hookが担当
    const result = await dataSubmit.submitOrderData(data, onBookNameDialogOpen);

    // 成功時のみ履歴保存
    if (result && user) {
      await historyTracking.saveAllHistories(data);
    }

    return result;
  };

  return {
    // ...
    handleSubmit,
  };
};
```

**メリット**:
- 各hookのテストで個別のエラーケースを検証できる
- 統合hookのテストはシンプルになる（エラーハンドリングのテストは小hookで完了）
- エラーメッセージが具体的

---

## 3. useHistoryTracking API の簡略化

### 問題点
初期計画では4つのメソッドを公開：
```typescript
return {
  saveSupplierHistory,
  saveProductHistory,
  savePriceHistory,
  saveAllHistories,
};
```

実際には `saveAllHistories()` **のみが使用される**

### 改善案: 単一メソッド公開

```typescript
// hooks/useHistoryTracking.ts
export const useHistoryTracking = ({
  user,
  supplierAutocomplete,
  productNameAutocomplete,
  originAutocomplete,
}: UseHistoryTrackingParams) => {
  /**
   * すべての履歴を保存
   * - オートコンプリート履歴（帳合先、商品名、産地）
   * - 商品履歴（帳合先ごと）
   * - 価格履歴（商品名・規格・入数ごと）
   */
  const saveAllHistories = async (data: OrderFormData) => {
    if (!user) return;

    try {
      // 帳合先履歴
      for (const supplier of data.suppliers) {
        await supplierAutocomplete.addToHistory(supplier);
      }

      // 商品関連履歴
      for (const product of data.products) {
        // オートコンプリート履歴
        await productNameAutocomplete.addToHistory(product.name);
        await originAutocomplete.addToHistory(product.origin);

        // 商品履歴（各商品の帳合先ごとに）
        await FirestoreService.saveProductHistory(
          user.uid,
          product.supplier,
          product.name,
          product.origin,
          product.specification || '',
          product.quantityPerPackage ?? null,
          product.unit || '',
          product.categoryCode
        );

        // 価格履歴
        if (
          product.centerCost &&
          product.storeCost &&
          product.priceExcludingTax &&
          product.quantityPerPackage
        ) {
          await FirestoreService.savePricingHistory(
            user.uid,
            product.name,
            product.specification || '',
            product.quantityPerPackage,
            product.unit || '',
            product.centerCost,
            product.storeCost,
            product.priceExcludingTax,
            product.centerFeeRate
          );
        }
      }
    } catch (error) {
      console.error('履歴保存エラー:', error);
      // 履歴保存の失敗は致命的ではないのでエラーログのみ
    }
  };

  return { saveAllHistories };
};
```

**メリット**:
- ✅ APIがシンプル（1メソッド）
- ✅ 内部実装の変更が外部に影響しない
- ✅ テストが1つの関数に集中できる

**デメリットとその対策**:
- ❌ テストで個別の履歴保存をモックしにくい？
- ✅ → 内部で小さなヘルパー関数を作成し、それをテストでモックする

---

## 4. useFileDownloads のコード重複削減

### 問題点
`handleDownloadExcel` (57行) と `handleDownloadPdf` (59行) は **96% 同一**

**違いは4箇所のみ**:
1. `generatedFiles.downloadUrl` vs `generatedFiles.pdfDownloadUrl`
2. `generatedFiles.filename` vs `generatedFiles.filename.replace('.xlsx', '.pdf')`
3. ログメッセージの 'Excel' vs 'PDF'
4. エラーメッセージの文言

**116行の重複コード** → **~60行に削減可能**

### 改善案: DRY化

```typescript
// hooks/useFileDownloads.ts
export const useFileDownloads = ({
  generatedFiles,
  showError,
  showLoading,
  hideLoading,
}: UseFileDownloadsParams) => {
  /**
   * ファイルダウンロードの共通処理
   */
  const downloadFile = async (config: {
    url: string;
    filename: string;
    fileType: 'Excel' | 'PDF';
  }) => {
    try {
      showLoading();

      // 相対URLを絶対URLに変換
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const baseUrl = apiBaseUrl
        ? apiBaseUrl.replace(/\/api$/, '')
        : window.location.origin;
      const absoluteUrl = new URL(config.url, baseUrl).href;

      console.log(`📥 ${config.fileType} download URL:`, config.url);
      console.log('📥 Base URL:', baseUrl);
      console.log('📥 Absolute URL:', absoluteUrl);

      // ファイルを取得
      const response = await fetch(absoluteUrl);
      console.log('Response status:', response.status);
      console.log('Response Content-Type:', response.headers.get('Content-Type'));

      if (!response.ok) {
        throw new Error(`ダウンロード失敗: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('Content-Type') || '';

      // HTMLが返された場合はエラー
      if (contentType.includes('text/html')) {
        const htmlText = await response.text();
        console.error('❌ HTMLファイルが返されました:', htmlText.substring(0, 500));
        throw new Error(
          `サーバーからHTMLが返されました。${config.fileType}ファイルが生成されていない可能性があります。`
        );
      }

      const blob = await response.blob();
      console.log('Downloaded blob size:', blob.size, 'bytes');

      // Blobからダウンロードリンクを作成
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = config.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Blob URLをクリーンアップ
      window.URL.revokeObjectURL(blobUrl);

      hideLoading();
    } catch (error) {
      hideLoading();
      console.error(`${config.fileType} download error:`, error);
      showError(
        error instanceof Error
          ? error.message
          : `${config.fileType}ファイルのダウンロードに失敗しました`
      );
    }
  };

  /**
   * Excelファイルをダウンロード
   */
  const downloadExcel = async () => {
    if (!generatedFiles) return;

    await downloadFile({
      url: generatedFiles.downloadUrl,
      filename: generatedFiles.filename,
      fileType: 'Excel',
    });
  };

  /**
   * PDFファイルをダウンロード
   */
  const downloadPdf = async () => {
    if (!generatedFiles || !generatedFiles.pdfDownloadUrl) return;

    await downloadFile({
      url: generatedFiles.pdfDownloadUrl,
      filename: generatedFiles.filename.replace('.xlsx', '.pdf'),
      fileType: 'PDF',
    });
  };

  return {
    downloadExcel,
    downloadPdf,
  };
};
```

**削減効果**:
- **Before**: 116行（handleDownloadExcel: 57行 + handleDownloadPdf: 59行）
- **After**: ~70行（downloadFile: 60行 + downloadExcel: 5行 + downloadPdf: 5行）
- **削減**: 約 40% のコード削減

**メリット**:
- ✅ コード重複の完全排除
- ✅ バグ修正が1箇所で完結
- ✅ テストケースも共通化できる

---

## 5. 実装フェーズの詳細計画

### Phase 0: 事前調査 (0.5日)

**目的**: リスク軽減と設計の最終確認

**タスク**:
1. [x] useStepNavigation と useStepActions の関係性確認
2. [x] エラーハンドリングパターンの確認
3. [x] コード重複箇所の特定
4. [ ] useOrderHandlers/useOrderSubmit の使用箇所を Grep で確認
5. [ ] 既存テストの実行確認

### Phase 1: useOrderHandlers 分割 (2.5日)

#### Day 1 (0.5日): 小hooks作成

**午前**:
- [ ] `useProductActions` 作成 (~40行)
- [ ] `useStepActions` 作成 (~30行)

**午後**:
- [ ] `useAllocationActions` 作成 (~40行)
- [ ] `useDraftActions` 作成 (~60行)
- [ ] `useFormSubmitHandler` 作成 (~50行)

#### Day 2 (1日): テスト作成

- [ ] `useProductActions.test.ts` 作成 (~10 tests)
- [ ] `useStepActions.test.ts` 作成 (~8 tests)
- [ ] `useAllocationActions.test.ts` 作成 (~8 tests)
- [ ] `useDraftActions.test.ts` 作成 (~10 tests)
- [ ] `useFormSubmitHandler.test.ts` 作成 (~8 tests)

**期待結果**: 44 tests passing

#### Day 3 (1日): 統合と移行

**午前**:
- [ ] `useOrderHandlers` 統合版作成（既存hookを組み合わせ）
- [ ] 既存コンポーネントでの動作確認

**午後**:
- [ ] エッジケースのテスト追加
- [ ] ドキュメント更新
- [ ] コミット & プッシュ

### Phase 2: useOrderSubmit 分割 (3.5日)

#### Day 4-5 (1.5日): 小hooks作成

**Day 4 午前**:
- [ ] `useOrderDataSubmit` 作成 (~100行)
- [ ] `useHistoryTracking` 作成 (~80行)

**Day 4 午後**:
- [ ] `useTemplateGeneration` 作成 (~100行)

**Day 5 午前**:
- [ ] `useFileDownloads` 作成（DRY版、~70行）

**Day 5 午後**:
- [ ] 全hookの動作確認
- [ ] リファクタリング

#### Day 6-7 (1.5日): テスト作成

**Day 6**:
- [ ] `useOrderDataSubmit.test.ts` 作成 (~12 tests)
- [ ] `useHistoryTracking.test.ts` 作成 (~8 tests)

**Day 7**:
- [ ] `useTemplateGeneration.test.ts` 作成 (~10 tests)
- [ ] `useFileDownloads.test.ts` 作成 (~12 tests)

**期待結果**: 42 tests passing

#### Day 8 (0.5日): 統合と移行

- [ ] `useOrderSubmit` 統合版作成
- [ ] 既存コンポーネントでの動作確認
- [ ] エッジケースのテスト追加
- [ ] ドキュメント更新
- [ ] コミット & プッシュ

### Phase 3: 最終確認 (0.5日)

- [ ] 全テストの実行確認（58 + 44 + 42 = **144 tests**）
- [ ] E2Eテストでの動作確認
- [ ] パフォーマンス計測（リファクタリング前後の比較）
- [ ] コードレビュー
- [ ] 最終コミット & プッシュ

---

## 6. リスクと対策

### リスク1: 統合hookでの型エラー

**対策**: 小hooks作成時に型定義を明確にする

```typescript
// 各hookの戻り値の型を明示的に定義
export interface UseProductActionsReturn {
  handleRemoveProduct: (index: number) => void;
  handleClearProduct: (index: number) => void;
}

export const useProductActions = (...): UseProductActionsReturn => {
  // ...
};
```

### リスク2: 既存コンポーネントでの互換性問題

**対策**: 統合hookで既存のインターフェースを完全に維持

```typescript
// useOrderHandlers の統合版は既存と同じインターフェースを提供
export const useOrderHandlers = (params: UseOrderHandlersParams) => {
  const productActions = useProductActions({...});
  const stepActions = useStepActions({...});
  // ...

  return {
    handleRemoveProduct: productActions.handleRemoveProduct,
    handleClearProduct: productActions.handleClearProduct,
    handleTabChange: stepActions.handleTabChange,
    // ... 既存と同じキー名
  };
};
```

### リスク3: テストカバレッジの低下

**対策**: 既存テストを残しつつ、小hooks用の新しいテストを追加

- 既存の統合テストは保持（後方互換性の確認）
- 小hooks用の単体テストを追加（詳細な動作確認）

---

## 7. 成功指標

### 定量指標
- [x] コード行数削減: 695行 → ~550行（約21%削減）
- [ ] テストカバレッジ: 58 tests → 144 tests（+86 tests）
- [ ] 最大hook行数: 427行 → 100行以下
- [ ] コード重複: 116行 → 0行

### 定性指標
- [ ] 各hookが単一責任の原則に準拠
- [ ] テストが理解しやすく保守しやすい
- [ ] 新規開発者がコードを理解しやすい
- [ ] バグ修正時の影響範囲が限定的

---

## 8. 次のステップ

**選択肢A: 今すぐ実装開始**
- Phase 0 の残りタスク（使用箇所確認）を完了
- Phase 1 Day 1 の午前タスクから開始

**選択肢B: さらに詳細を詰める**
- 特定のhookの実装例をもっと詳しく作成
- テストケースのリストを事前に作成
- コンポーネント側の変更箇所を特定

**選択肢C: 別のアプローチを検討**
- より小さい単位で段階的にリファクタリング
- 新規機能追加時に並行してリファクタリング

---

## まとめ

本改善提案により、以下が明確になりました：

✅ **懸念1（useStepNavigation重複）**: 解決 - 異なる責務なので両方保持
✅ **懸念2（エラーハンドリング）**: 解決 - 個別エラーハンドリングパターンを採用
✅ **懸念3（useHistoryTracking API）**: 解決 - 単一メソッド `saveAllHistories()` に簡略化
✅ **懸念4（useFileDownloads重複）**: 解決 - DRY化により40%削減
✅ **懸念5（実装フェーズ）**: 解決 - 7日間の詳細な実装計画を策定

**推奨**: 選択肢A（今すぐ実装開始）
- 設計が十分に詳細化された
- リスクと対策が明確
- 成功指標が定量化された
