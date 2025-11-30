# AllocationHistoryPage 分析レポート

**作成日**: 2025-11-30
**対象ファイル**: `/frontend/src/pages/AllocationHistoryPage.tsx`
**総行数**: 2,486行

---

## 📊 構造分析

### ファイル構成

```
AllocationHistoryPage.tsx (2,486行)
├── Import文 (1-70行) - 70行
├── 型定義 (72-88行) - 17行
├── コンポーネント本体 (96-2486行) - 2,390行
│   ├── State定義 (100-157行) - 58行
│   ├── useMemo/useCallback (163-1130行) - 968行
│   │   ├── calendarEvents (163-178行)
│   │   ├── calendarSupplierPresets (181-186行)
│   │   ├── fetchHistory (191-220行)
│   │   ├── fetchBatchDetails (225-243行)
│   │   ├── fetchStoreCategories (249-258行)
│   │   ├── handleCloseDetails (271-275行)
│   │   ├── handleEventClick (280-285行)
│   │   ├── handleSelectedDatesChange (290-340行)
│   │   ├── handleDateRangeSelect (342-391行)
│   │   ├── handleOpenDeleteDialog (393-399行)
│   │   ├── handleCloseDeleteDialog (401-407行)
│   │   ├── handleDelete (409-437行)
│   │   ├── columnVisibility (442-466行)
│   │   ├── getStoreAllocations (468-524行)
│   │   ├── gridRows (526-1055行) - 530行！
│   │   └── columns (1057-1129行) - 73行
│   ├── useEffect (263-266行)
│   └── JSX return (1131-2486行) - 1,356行！
│       ├── ヘッダー (1134-1190行)
│       ├── エラー表示 (1193-1197行)
│       ├── ローディング (1200-1203行)
│       ├── 空の状態 (1204-1237行)
│       ├── カレンダー表示 (1239-1252行)
│       ├── テーブル表示 (1254-1450行)
│       ├── 詳細モーダル (1454-2300行) - 847行！
│       ├── 削除確認ダイアログ (2305-2360行)
│       ├── 設定ドロワー (2365-2430行)
│       └── 日付範囲ピッカー (2435-2484行)
```

---

## 🔴 問題点の特定

### 1. 単一責任原則の大幅な違反

このコンポーネントは**最低でも7つの異なる責務**を持っています：

1. **データフェッチング** (fetchHistory, fetchBatchDetails, fetchStoreCategories)
2. **状態管理** (20個以上のstate)
3. **フィルタリング・ソート** (filters, groupMode, sortOrder)
4. **UI表示切り替え** (viewMode, isFullScreen)
5. **モーダル管理** (詳細、削除確認、設定、日付範囲)
6. **テーブルロジック** (gridRows生成 - 530行!)
7. **イベント処理** (10個以上のハンドラー)

### 2. 巨大なロジック

**gridRows の生成ロジック (526-1055行, 530行)**
- グループ化ロジック（日付別、商品別、複合）
- ソート処理
- 小計・合計の計算
- フィルタリング
- 行の表示/非表示制御

これだけで**単独の関数またはフックに分割すべき**です。

### 3. 巨大なJSX

**詳細モーダルのJSX (1454-2300行, 847行)**
- DataGrid の設定
- カラム定義
- フィルタリングUI
- グループ化設定UI
- エクスポートボタン

これも**独立したコンポーネントに分割すべき**です。

### 4. 状態管理の複雑さ

**20個以上のstate:**
```typescript
const [batches, setBatches] = useState<AllocationBatch[]>([]);
const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);
const [previewLoading, setPreviewLoading] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
const [selectedBatch, setSelectedBatch] = useState<AllocationBatch | null>(null);
const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string } | null>(null);
const [details, setDetails] = useState<AllocationDetail[]>([]);
const [detailsLoading, setDetailsLoading] = useState(false);
const [groupMode, setGroupMode] = useState<GroupMode>('product');
const [sortOrder, setSortOrder] = useState<'totalDesc' | 'totalAsc'>('totalDesc');
const [hiddenRowIds, setHiddenRowIds] = useState<Set<string>>(new Set());
const [isFullScreen, setIsFullScreen] = useState(false);
const [settingsOpen, setSettingsOpen] = useState(false);
const [datePickerOpen, setDatePickerOpen] = useState(false);
const [tempDateRange, setTempDateRange] = useState<{ start: string; end: string } | null>(null);
const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
const [filters, setFilters] = useState<{ ... }>({ ... });
const [compositeKeyFields, setCompositeKeyFields] = useState<CompositeKeyField[]>([...]);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [batchToDelete, setBatchToDelete] = useState<AllocationBatch | null>(null);
const [deleting, setDeleting] = useState(false);
```

これらは**カテゴリごとにカスタムフックに分割すべき**です。

---

## 🎯 リファクタリング戦略

### 分割計画

#### フェーズ1: カスタムフックの抽出

1. **`useAllocationBatches.ts`** (データフェッチング)
   ```typescript
   export const useAllocationBatches = (userId: string | undefined) => {
     const [batches, setBatches] = useState<AllocationBatch[]>([]);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);

     const fetchHistory = useCallback(async () => { /* ... */ }, [userId]);
     const fetchBatchDetails = useCallback(async (batch: AllocationBatch) => { /* ... */ }, [userId]);

     return { batches, loading, error, fetchHistory, fetchBatchDetails };
   };
   ```

2. **`useAllocationFilters.ts`** (フィルタリング)
   ```typescript
   export const useAllocationFilters = () => {
     const [filters, setFilters] = useState<FilterState>({ ... });
     const [groupMode, setGroupMode] = useState<GroupMode>('product');
     const [sortOrder, setSortOrder] = useState<SortOrder>('totalDesc');

     const applyFilters = useCallback((data: AllocationDetail[]) => { /* ... */ }, [filters]);
     const resetFilters = useCallback(() => { /* ... */ }, []);

     return { filters, setFilters, groupMode, setGroupMode, sortOrder, setSortOrder, applyFilters, resetFilters };
   };
   ```

3. **`useAllocationModals.ts`** (モーダル管理)
   ```typescript
   export const useAllocationModals = () => {
     const [selectedBatch, setSelectedBatch] = useState<AllocationBatch | null>(null);
     const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
     const [settingsOpen, setSettingsOpen] = useState(false);
     const [datePickerOpen, setDatePickerOpen] = useState(false);

     const openDetail = useCallback((batch: AllocationBatch) => { /* ... */ }, []);
     const closeDetail = useCallback(() => { /* ... */ }, []);
     const openDelete = useCallback((batch: AllocationBatch) => { /* ... */ }, []);
     const closeDelete = useCallback(() => { /* ... */ }, []);

     return { selectedBatch, deleteDialogOpen, settingsOpen, datePickerOpen, openDetail, closeDetail, openDelete, closeDelete };
   };
   ```

4. **`useAllocationTableData.ts`** (テーブルデータ生成)
   ```typescript
   export const useAllocationTableData = (
     details: AllocationDetail[],
     groupMode: GroupMode,
     sortOrder: SortOrder,
     filters: FilterState
   ) => {
     const gridRows = useMemo(() => {
       // 530行のロジックをここに移動
       // グループ化、ソート、フィルタリング、小計計算
     }, [details, groupMode, sortOrder, filters]);

     const columns = useMemo(() => {
       // カラム定義
     }, []);

     return { gridRows, columns };
   };
   ```

5. **`useAllocationView.ts`** (表示モード管理)
   ```typescript
   export const useAllocationView = () => {
     const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
     const [isFullScreen, setIsFullScreen] = useState(false);
     const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
     const [hiddenRowIds, setHiddenRowIds] = useState<Set<string>>(new Set());

     return { viewMode, setViewMode, isFullScreen, setIsFullScreen, hiddenColumns, setHiddenColumns, hiddenRowIds, setHiddenRowIds };
   };
   ```

#### フェーズ2: プレゼンテーショナルコンポーネントの作成

1. **`AllocationHistoryToolbar.tsx`** (ヘッダー部分)
   ```typescript
   interface AllocationHistoryToolbarProps {
     batchCount: number;
     loading: boolean;
     viewMode: 'table' | 'calendar';
     onRefresh: () => void;
     onViewModeChange: (mode: 'table' | 'calendar') => void;
   }
   ```

2. **`AllocationHistoryTable.tsx`** (テーブル表示)
   ```typescript
   interface AllocationHistoryTableProps {
     batches: AllocationBatch[];
     onBatchClick: (batch: AllocationBatch) => void;
     onDeleteClick: (batch: AllocationBatch) => void;
   }
   ```

3. **`AllocationDetailModal.tsx`** (詳細モーダル - 847行)
   ```typescript
   interface AllocationDetailModalProps {
     open: boolean;
     batch: AllocationBatch | null;
     details: AllocationDetail[];
     loading: boolean;
     groupMode: GroupMode;
     sortOrder: SortOrder;
     filters: FilterState;
     hiddenColumns: Set<string>;
     onClose: () => void;
     onGroupModeChange: (mode: GroupMode) => void;
     onSortOrderChange: (order: SortOrder) => void;
     onFiltersChange: (filters: FilterState) => void;
   }
   ```

4. **`AllocationDeleteDialog.tsx`** (削除確認)
5. **`AllocationSettingsDrawer.tsx`** (設定ドロワー)
6. **`AllocationDateRangePicker.tsx`** (日付範囲ピッカー)
7. **`AllocationEmptyState.tsx`** (空の状態)

#### フェーズ3: コンテナコンポーネントの作成

**`AllocationHistoryContainer.tsx`** (200-250行)
```typescript
export const AllocationHistoryContainer: React.FC = () => {
  const { user } = useAuthContext();

  // カスタムフックで状態とロジックを管理
  const batches = useAllocationBatches(user?.uid);
  const filters = useAllocationFilters();
  const modals = useAllocationModals();
  const view = useAllocationView();
  const tableData = useAllocationTableData(
    modals.selectedBatch?.details || [],
    filters.groupMode,
    filters.sortOrder,
    filters.filters
  );

  return (
    <>
      <AllocationHistoryToolbar
        batchCount={batches.batches.length}
        loading={batches.loading}
        viewMode={view.viewMode}
        onRefresh={batches.fetchHistory}
        onViewModeChange={view.setViewMode}
      />

      {view.viewMode === 'calendar' ? (
        <GlassCalendar
          events={batches.calendarEvents}
          onEventClick={modals.openDetail}
          // ...
        />
      ) : (
        <AllocationHistoryTable
          batches={batches.batches}
          onBatchClick={modals.openDetail}
          onDeleteClick={modals.openDelete}
        />
      )}

      <AllocationDetailModal
        open={!!modals.selectedBatch}
        batch={modals.selectedBatch}
        details={tableData.gridRows}
        loading={batches.loading}
        groupMode={filters.groupMode}
        sortOrder={filters.sortOrder}
        filters={filters.filters}
        onClose={modals.closeDetail}
        onGroupModeChange={filters.setGroupMode}
        onSortOrderChange={filters.setSortOrder}
        onFiltersChange={filters.setFilters}
      />

      <AllocationDeleteDialog
        open={modals.deleteDialogOpen}
        batch={modals.batchToDelete}
        onClose={modals.closeDelete}
        onConfirm={batches.deleteBatch}
      />

      <AllocationSettingsDrawer
        open={modals.settingsOpen}
        onClose={() => modals.setSettingsOpen(false)}
        // ...
      />
    </>
  );
};
```

#### フェーズ4: 最終的なページコンポーネント

**`AllocationHistoryPage.tsx`** (50行以下)
```typescript
export const AllocationHistoryPage: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <AllocationHistoryContainer />
    </Box>
  );
};
```

---

## 📏 期待される改善効果

### コード行数の削減

```
Before:
AllocationHistoryPage.tsx: 2,486行

After:
AllocationHistoryPage.tsx: 50行 (-98%)
AllocationHistoryContainer.tsx: 200行
Hooks (5ファイル): 400行
Components (7ファイル): 800行
───────────────────────────
合計: 1,450行 (-42%)
```

### 保守性の向上

- ✅ 各ファイルが250行以下（理解しやすい）
- ✅ 責務が明確（変更時の影響範囲が限定）
- ✅ 再利用可能（他のページでも使用可能）
- ✅ テストが容易（単体テストが簡単）

### テストカバレッジ

```
Before: 0% (テストなし)
After: 60%以上
  - Hooks: 80%
  - Components: 50%
  - Container: 40%
```

---

## 📅 実装スケジュール

### Week 1: フック抽出
- Day 1-2: `useAllocationBatches.ts`
- Day 3: `useAllocationFilters.ts`
- Day 4: `useAllocationModals.ts`
- Day 5: `useAllocationTableData.ts`, `useAllocationView.ts`

### Week 2: コンポーネント作成
- Day 1-2: `AllocationDetailModal.tsx` (最大)
- Day 3: `AllocationHistoryTable.tsx`, `AllocationHistoryToolbar.tsx`
- Day 4: `AllocationDeleteDialog.tsx`, `AllocationSettingsDrawer.tsx`
- Day 5: その他のコンポーネント

### Week 3: 統合とテスト
- Day 1-2: `AllocationHistoryContainer.tsx`
- Day 3: ページコンポーネント更新
- Day 4-5: テスト作成、E2Eテスト

---

## 🧪 テスト戦略

### ユニットテスト

```typescript
// useAllocationBatches.test.ts
describe('useAllocationBatches', () => {
  it('should fetch batches on mount', async () => {
    const { result } = renderHook(() => useAllocationBatches('user-123'));

    await waitFor(() => {
      expect(result.current.batches).toHaveLength(10);
    });
  });

  it('should handle fetch errors', async () => {
    mockFirestore.error = new Error('Network error');

    const { result } = renderHook(() => useAllocationBatches('user-123'));

    await waitFor(() => {
      expect(result.current.error).toBe('履歴の取得に失敗しました');
    });
  });
});

// AllocationDetailModal.test.tsx
describe('AllocationDetailModal', () => {
  it('should render detail grid', () => {
    const { getByRole } = render(
      <AllocationDetailModal
        open={true}
        batch={mockBatch}
        details={mockDetails}
        loading={false}
        onClose={jest.fn()}
      />
    );

    expect(getByRole('dialog')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    const onClose = jest.fn();

    const { getByRole } = render(
      <AllocationDetailModal
        open={true}
        batch={mockBatch}
        details={mockDetails}
        loading={false}
        onClose={onClose}
      />
    );

    fireEvent.click(getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

### E2Eテスト

```typescript
// allocation-history.spec.ts
test('should display batches and open detail modal', async ({ page }) => {
  await page.goto('/allocation-history');

  // バッチ一覧が表示される
  await expect(page.getByText('配分履歴')).toBeVisible();

  // カレンダーのイベントをクリック
  await page.getByText('2025-01-15').click();

  // 詳細モーダルが開く
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('配分詳細')).toBeVisible();
});
```

---

## ✅ 成功基準

- [ ] AllocationHistoryPage.tsx が 50行以下
- [ ] 全ファイルが 250行以下
- [ ] テストカバレッジ 60%以上
- [ ] E2Eテスト 5シナリオ以上
- [ ] 既存の機能がすべて動作
- [ ] パフォーマンス劣化なし
- [ ] ビルドエラーなし
- [ ] 型エラーなし

---

**次のステップ**: この分析を基に、Phase 1のフック抽出から実装を開始します。
