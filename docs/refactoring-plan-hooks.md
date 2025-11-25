# Custom Hooks リファクタリング計画

## 概要
大規模な `useOrderHandlers` (268行) と `useOrderSubmit` (427行) を単一責任の原則に従って小さなhooksに分割する。

---

## 1. useOrderHandlers の分割 (268行 → 4つのhook)

### 現在の責務（問題点）
- ❌ 商品管理 (add/remove/clear)
- ❌ ステップナビゲーション (tab/prev/next)
- ❌ 配分数量変更・店舗ロック管理
- ❌ フォーム送信・ブック名確認
- ❌ 下書き復元・破棄

**問題**: 1つのhookに5つの異なる責務 → テスト困難、保守性低下

### リファクタリング後

#### 1.1 useProductActions (新規)
**責務**: 商品の追加・削除・クリア
```typescript
export const useProductActions = ({
  productFields,
  removeProduct,
  activeProductIndex,
  setActiveProductIndex,
  suppliers,
  setValue,
}) => {
  const handleRemoveProduct = useCallback(...);
  const handleClearProduct = useCallback(...);

  return {
    handleRemoveProduct,
    handleClearProduct,
  };
};
```
- **行数**: ~40行
- **テスト**: 商品削除・クリアのロジックのみ

#### 1.2 useStepActions (新規)
**責務**: ステップナビゲーション（タブ・前へ・次へ）
```typescript
export const useStepActions = ({
  activeStep,
  setActiveStep,
  TOTAL_STEPS,
}) => {
  const handleTabChange = useCallback(...);
  const handlePrevStep = useCallback(...);
  const handleNextStep = useCallback(...);

  return {
    handleTabChange,
    handlePrevStep,
    handleNextStep,
  };
};
```
- **行数**: ~30行
- **テスト**: ステップ移動ロジックのみ

#### 1.3 useAllocationActions (新規)
**責務**: 配分数量変更・店舗ロック管理
```typescript
export const useAllocationActions = ({
  setValue,
  setLockedStores,
}) => {
  const handleAllocationChange = useCallback(...);
  const handleToggleLock = useCallback(...);

  return {
    handleAllocationChange,
    handleToggleLock,
  };
};
```
- **行数**: ~40行
- **テスト**: 配分・ロックロジックのみ

#### 1.4 useDraftActions (新規)
**責務**: 下書きの復元・破棄
```typescript
export const useDraftActions = ({
  user,
  reset,
  setRestoreDialogOpen,
  showSuccess,
  setActiveStep,
  isInitialLoad,
}) => {
  const handleRestoreDraft = useCallback(...);
  const handleDiscardDraft = useCallback(...);

  return {
    handleRestoreDraft,
    handleDiscardDraft,
  };
};
```
- **行数**: ~60行
- **テスト**: 下書き管理ロジックのみ

#### 1.5 useFormSubmitHandler (新規)
**責務**: フォーム送信・ブック名確認
```typescript
export const useFormSubmitHandler = ({
  methods,
  submitOrder,
  setBookNameDialog,
  bookNameDialog,
  handleGenerateTemplate,
  setHasUnsavedChanges,
  setShowGeneratedPreview,
}) => {
  const onSubmit = useCallback(...);
  const handleBookNameDialogConfirm = useCallback(...);

  return {
    onSubmit,
    handleBookNameDialogConfirm,
  };
};
```
- **行数**: ~50行
- **テスト**: 送信・確認ロジックのみ

---

## 2. useOrderSubmit の分割 (427行 → 4つのhook)

### 現在の責務（問題点）
- ❌ フォーム送信・バリデーション
- ❌ データ保存 (Firestore + sync)
- ❌ オートコンプリート履歴更新
- ❌ 商品履歴・価格履歴保存
- ❌ テンプレート生成 (Excel/PDF)
- ❌ ファイルダウンロード (Excel/PDF)

**問題**: 1つのhookに6つの異なる責務 → 超大規模、テスト極めて困難

### リファクタリング後

#### 2.1 useOrderDataSubmit (新規)
**責務**: フォーム送信・バリデーション・データ保存
```typescript
export const useOrderDataSubmit = ({
  user,
  userSettings,
  isOnline,
  saveOrderWithSync,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
}) => {
  const submitOrderData = async (
    data: OrderFormData,
    onBookNameDialogOpen: () => void
  ): Promise<boolean> => {
    // バリデーション
    // データ保存
    // オンライン/オフライン処理分岐
  };

  return { submitOrderData };
};
```
- **行数**: ~100行
- **テスト**: 送信・バリデーションロジックのみ

#### 2.2 useHistoryTracking (新規)
**責務**: オートコンプリート・商品・価格履歴の保存
```typescript
export const useHistoryTracking = ({
  user,
  supplierAutocomplete,
  productNameAutocomplete,
  originAutocomplete,
}) => {
  const saveSupplierHistory = async (suppliers: string[]) => {...};
  const saveProductHistory = async (product: Product) => {...};
  const savePriceHistory = async (product: Product) => {...};
  const saveAllHistories = async (data: OrderFormData) => {...};

  return {
    saveSupplierHistory,
    saveProductHistory,
    savePriceHistory,
    saveAllHistories,
  };
};
```
- **行数**: ~80行
- **テスト**: 履歴保存ロジックのみ

#### 2.3 useTemplateGeneration (新規)
**責務**: Excel/PDFテンプレート生成
```typescript
export const useTemplateGeneration = ({
  user,
  userSettings,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
}) => {
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFiles | null>(null);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);

  const generateTemplate = async (
    data: OrderFormData,
    bookName: string,
    setHasUnsavedChanges: (value: boolean) => void
  ): Promise<boolean> => {
    // テンプレート生成
    // ファイル情報保存
    // 下書きクリア
  };

  return {
    generatedFiles,
    excelBlob,
    generateTemplate,
  };
};
```
- **行数**: ~100行
- **テスト**: テンプレート生成ロジックのみ

#### 2.4 useFileDownloads (新規)
**責務**: Excel/PDFファイルのダウンロード処理
```typescript
export const useFileDownloads = ({
  generatedFiles,
  showError,
  showLoading,
  hideLoading,
}) => {
  const downloadExcel = async () => {...};
  const downloadPdf = async () => {...};

  return {
    downloadExcel,
    downloadPdf,
  };
};
```
- **行数**: ~140行
- **テスト**: ダウンロードロジックのみ

---

## 3. 統合hookの作成

分割後、既存コンポーネントとの互換性のため統合hookを提供:

### useOrderHandlers (統合版)
```typescript
export const useOrderHandlers = (params: UseOrderHandlersParams) => {
  const productActions = useProductActions({...});
  const stepActions = useStepActions({...});
  const allocationActions = useAllocationActions({...});
  const draftActions = useDraftActions({...});
  const submitHandler = useFormSubmitHandler({...});

  return {
    ...productActions,
    ...stepActions,
    ...allocationActions,
    ...draftActions,
    ...submitHandler,
  };
};
```

### useOrderSubmit (統合版)
```typescript
export const useOrderSubmit = (params: UseOrderSubmitParams) => {
  const dataSubmit = useOrderDataSubmit({...});
  const historyTracking = useHistoryTracking({...});
  const templateGeneration = useTemplateGeneration({...});
  const fileDownloads = useFileDownloads({...});

  // handleSubmit内でhistoryTrackingを呼び出す統合処理
  const handleSubmit = async (data: OrderFormData, onBookNameDialogOpen: () => void) => {
    const result = await dataSubmit.submitOrderData(data, onBookNameDialogOpen);
    if (result) {
      await historyTracking.saveAllHistories(data);
    }
    return result;
  };

  const handleGenerateTemplate = async (data: OrderFormData, bookName: string, setHasUnsavedChanges: (value: boolean) => void) => {
    return await templateGeneration.generateTemplate(data, bookName, setHasUnsavedChanges);
  };

  return {
    generatedFiles: templateGeneration.generatedFiles,
    excelBlob: templateGeneration.excelBlob,
    setGeneratedFiles: templateGeneration.setGeneratedFiles,
    setExcelBlob: templateGeneration.setExcelBlob,
    handleSubmit,
    handleGenerateTemplate,
    handleDownloadExcel: fileDownloads.downloadExcel,
    handleDownloadPdf: fileDownloads.downloadPdf,
  };
};
```

---

## 4. 実装順序

### Phase 1: useOrderHandlers 分割
1. ✅ `useProductActions` 作成 + テスト
2. ✅ `useStepActions` 作成 + テスト
3. ✅ `useAllocationActions` 作成 + テスト
4. ✅ `useDraftActions` 作成 + テスト
5. ✅ `useFormSubmitHandler` 作成 + テスト
6. ✅ `useOrderHandlers` 統合版作成
7. ✅ 既存コンポーネントでの動作確認

### Phase 2: useOrderSubmit 分割
1. ✅ `useOrderDataSubmit` 作成 + テスト
2. ✅ `useHistoryTracking` 作成 + テスト
3. ✅ `useTemplateGeneration` 作成 + テスト
4. ✅ `useFileDownloads` 作成 + テスト
5. ✅ `useOrderSubmit` 統合版作成
6. ✅ 既存コンポーネントでの動作確認

---

## 5. メリット

### コード品質
- ✅ 単一責任の原則に準拠
- ✅ 各hookが50-140行の適切なサイズ
- ✅ テストが書きやすく、理解しやすい

### 保守性
- ✅ バグの発見・修正が容易
- ✅ 機能追加時の影響範囲が限定的
- ✅ コードレビューがしやすい

### 再利用性
- ✅ 小さなhooksは他のコンポーネントでも再利用可能
- ✅ 統合hookで後方互換性を保持

---

## 6. 推定工数

- **Phase 1 (useOrderHandlers)**: 2-3日
  - 分割実装: 1日
  - テスト作成: 1日
  - 動作確認: 0.5日

- **Phase 2 (useOrderSubmit)**: 3-4日
  - 分割実装: 1.5日
  - テスト作成: 1.5日
  - 動作確認: 0.5日

**合計**: 5-7日
