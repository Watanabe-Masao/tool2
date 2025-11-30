# Week 3: デザインシステム洗練 - モバイルファースト改善提案

## 🎯 目標

Material-UIベースの現在のデザインを洗練させ、特に**ステップ4の店舗配分UI**をモバイル最適化します。

## 📱 デザイン原則

1. **モバイルファースト** - 下へのスワイプを最小限に
2. **狭いエリアでの操作性** - 画面内に収まる情報量
3. **一貫性** - カレンダーモーダル、チップスタイルの良さを継承
4. **洗練されたグリッド** - 単純なグリッドではなく、視覚的に美しい配置

---

## 🔧 改善提案1: 店舗配分チップの統一デザイン

### 現状の問題
```tsx
// ❌ 現在: 文字数で幅が変動
<Chip
  label={`${store.code} (${quantity}) [${ratio}%]`}
  sx={{ minWidth: 58 }}  // 最小値のみ
/>
// 結果: 「A1 (5) [10%]」と「ABCD (100) [25%]」で幅が大きく異なる
```

### 改善案: 固定幅グリッドレイアウト

```tsx
// ✅ 改善: 固定幅 + CSS Grid
<Box sx={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
  gap: 0.75,
  maxHeight: 200,
  overflowY: 'auto',
}}>
  <Chip
    label={
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.25,
        py: 0.25,
      }}>
        {/* 店舗コード - 大きく表示 */}
        <Typography variant="caption" sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          lineHeight: 1,
        }}>
          {store.code}
        </Typography>

        {/* 数量 - 小さく表示 */}
        {quantity > 0 && (
          <Typography variant="caption" sx={{
            fontSize: '0.6rem',
            fontWeight: 700,
            lineHeight: 1,
          }}>
            {quantity}
          </Typography>
        )}
      </Box>
    }
    sx={{
      width: '100%',  // グリッド幅に合わせる
      height: 44,     // 固定高さ
      '& .MuiChip-label': {
        px: 0.5,
        width: '100%',
      },
    }}
  />
</Box>
```

### 視覚効果
- ✅ 全てのチップが同じサイズ
- ✅ 綺麗なグリッド配置（1行4-5個）
- ✅ 情報の階層化（コード > 数量）
- ✅ スクロール範囲が最小化

---

## 🎨 改善提案2: カテゴリチップの最適化

### 現状
```tsx
// カテゴリチップ: 長いラベルで幅が変動
<Chip label={`${category.name} (${storeCount})`} />
```

### 改善案
```tsx
<Chip
  label={
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
        {category.name}
      </Typography>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        borderRadius: '50%',
        bgcolor: 'rgba(255,255,255,0.3)',
      }}>
        <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 700 }}>
          {storeCount}
        </Typography>
      </Box>
    </Box>
  }
  sx={{
    height: 32,
    borderRadius: 16,
  }}
/>
```

---

## 🌈 改善提案3: グローバルテーマの拡張

### theme.tsに追加するモバイル最適化トークン

```typescript
// theme.ts に追加
export const mobileOptimizedTokens = {
  /**
   * モバイル用グリッドレイアウト
   */
  grid: {
    storeChip: {
      columns: 'repeat(auto-fill, minmax(70px, 1fr))',
      gap: 0.75,
      itemHeight: 44,
    },
    categoryChip: {
      columns: 'repeat(auto-fill, minmax(100px, 1fr))',
      gap: 0.5,
      itemHeight: 32,
    },
  },

  /**
   * コンパクトなフォントサイズ（モバイル）
   */
  fontSizeMobile: {
    primary: '0.75rem',    // メインテキスト（店舗コード）
    secondary: '0.6rem',   // サブテキスト（数量）
    tertiary: '0.55rem',   // 補助テキスト（比率）
    badge: '0.65rem',      // バッジ内テキスト
  },

  /**
   * スクロール可能エリアの最大高さ
   */
  maxHeight: {
    storeSelection: 200,
    categorySelection: 120,
    modalContent: 'calc(100vh - 240px)',
  },

  /**
   * タッチターゲットサイズ（Apple/Android準拠）
   */
  touchTarget: {
    minimum: 44,  // 最小タッチエリア
    comfortable: 48,  // 快適なタッチエリア
  },
};
```

---

## 📐 改善提案4: レスポンシブ配分入力カード

### 現状の配分入力
- 横スクロール可能なカード
- スワイプで確認が必要

### 改善案: アコーディオン形式

```tsx
{selectedStores.size > 0 && (
  <Card variant="outlined">
    <CardContent sx={{ p: 1.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, mb: 1 }}>
        配分数量入力 ({filledCount}/{selectedStores.size})
      </Typography>

      {/* グリッド形式で配置（2列） */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 1,
        maxHeight: 300,
        overflowY: 'auto',
      }}>
        {Array.from(selectedStores).map((storeCode) => {
          const storeIndex = STORE_DATA.findIndex((s) => s.code === storeCode);
          const quantity = allocations[storeIndex] || 0;

          return (
            <TextField
              key={storeCode}
              label={storeCode}
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(storeIndex, Number(e.target.value))}
              size="small"
              InputLabelProps={{
                sx: { fontSize: '0.75rem' },
              }}
              inputProps={{
                min: 0,
                sx: { fontSize: '0.85rem', textAlign: 'center' },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 40,
                },
              }}
            />
          );
        })}
      </Box>
    </CardContent>
  </Card>
)}
```

---

## 🎯 実装優先度

### Phase 1: 店舗選択チップの固定幅グリッド化 ⭐⭐⭐
- 最も視覚的なインパクトが大きい
- モバイル操作性が大幅に向上
- 実装: StoreAllocationMobile.tsx の修正

### Phase 2: カテゴリチップの最適化 ⭐⭐
- カテゴリ選択がよりコンパクトに
- バッジスタイルで店舗数を表示

### Phase 3: グローバルテーマへの統合 ⭐⭐⭐
- theme.ts に mobileOptimizedTokens を追加
- 全体で再利用可能に

### Phase 4: 配分入力カードの改善 ⭐
- アコーディオンまたはグリッド形式
- 横スクロールを削減

---

## 📊 期待効果

### ビフォー
- チップの幅がバラバラ
- スクロール範囲が大きい
- 情報が詰め込まれて読みにくい

### アフター
- ✅ 統一された固定幅グリッド
- ✅ スクロール範囲50%削減
- ✅ 情報の階層化で可読性向上
- ✅ タッチ操作の精度向上
- ✅ モバイルで1画面に収まる情報量

---

## 🚀 次のステップ

1. ユーザー確認: この提案で進めて良いか確認
2. Phase 1実装: 店舗選択チップのグリッド化
3. ビルド & テスト
4. Phase 2-4の順次実装
