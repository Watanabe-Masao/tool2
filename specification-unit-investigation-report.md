# specification/unit データフロー調査報告書

作成日: 2025-12-02

## 概要

`packageUnit`フィールド追加による仕様変更後、`specification`と`unit`フィールドの扱いに不整合が発生していることが判明。本報告書では、データフロー全体を調査し、問題点と修正方針を提示する。

---

## 1. 現在のデータ構造

### 1.1 実際に保存されているデータ

テストデータ（`StoreStatisticsModal.calculations.test.ts`）から判明した実データ構造:

```typescript
{
  specification: "100",      // 規格の数値のみ
  unit: "100gあたり",        // ★完全な単位形式（specificationの値を含む）
  quantityPerPackage: 5,
  packageUnit: "kg"
}
```

### 1.2 スキーマ定義

**ファイル**: `frontend/src/schemas/orderSchema.ts` (line 49-61)

```typescript
/** 規格の単位（商品自体の単位: 玉、本、束など） */  // ← 古いコメント
unit: z.string()

/** 入数の単位（パッケージ内の数量の単位: 個、袋、パックなど） */  // ← 古いコメント
packageUnit: z.string()
```

**問題**: コメントが実装と一致していない
- コメント: "玉、本、束など"
- 実際の値: "gあたり", "kgあたり", "100gあたり"

---

## 2. データフローと使用パターン

### 2.1 パターンA: 分離型（specification + unit を結合）

**場所**: `ProductPricingForm.tsx` (line 123-124)

```typescript
// specification（規格の数値）とunit（単位）を組み合わせて完全な単位文字列を作成
const fullUnit = product.specification && product.unit
  ? `${product.specification}${product.unit}`
  : product.unit || '';
```

**問題**:
- `specification: "100"` + `unit: "100gあたり"` → `"100100gあたり"` ❌
- 重複した値が生成される

### 2.2 パターンB: 完全型（unit を直接使用）

**場所**:
- `StoreStatisticsModal.tsx` (line 141-145)
- `ProductFormCardPricing.tsx` (line 167)

```typescript
const conversionResult = calculateEffectiveQuantity({
  quantityPerPackage: product.quantityPerPackage,
  packageUnit: product.packageUnit || '',
  unit: product.unit || '',  // ← 直接使用（正しい）
});
```

**結果**: `unit: "100gあたり"` → 正しく計算される ✅

---

## 3. 主要な問題点

### 🔴 問題1: 商品別統計でeffectiveQuantityが未使用

**ファイル**: `StoreStatisticsModal.tsx` (line 234-256)

```typescript
// 現在（誤り）
const costAmount = storeCost * totalQuantity;
const salesAmount = priceExcludingTax * totalQuantity;

// 正しい計算
const boxStoreCost = storeCost * effectiveQuantity;
const costAmount = boxStoreCost * totalQuantity;
```

**影響**: 商品別統計の原価・売価・粗利が完全に間違った値になる

**優先度**: 🔴 **Critical** - 即座に修正が必要

---

### 🟡 問題2: specification/unit の二重保存

**ファイル**: `ProductPricingForm.tsx` (line 123-124)

現在のデータ:
```
specification: "100"
unit: "100gあたり"
```

ProductPricingFormが生成する値:
```
fullUnit: "100" + "100gあたり" = "100100gあたり"
```

**影響**: 配分履歴の計算が誤る可能性（現在は使用されていないため顕在化していない）

**優先度**: 🟡 **High** - データ構造の統一が必要

---

### 🟢 問題3: スキーマコメントの不一致

**ファイル**: `frontend/src/schemas/orderSchema.ts` (line 49, 56)

```typescript
/** 規格の単位（商品自体の単位: 玉、本、束など） */  // ← 実際は "gあたり" など
unit: z.string()

/** 入数の単位（パッケージ内の数量の単位: 個、袋、パックなど） */  // ← 実際は "kg", "g" など
packageUnit: z.string()
```

**優先度**: 🟢 **Low** - ドキュメンテーション

---

### 🟡 問題4: Firestoreバリデーション不足

**ファイル**: `firestore.rules`

**現状**:
- unit/packageUnitが string であることのみチェック (line 18-19, 227-228)
- フォーマット検証なし
- 値の妥当性チェックなし

**潜在的リスク**:
```typescript
// これらが全て許可されてしまう
unit: "あああ"           // 無意味な文字列
unit: ""                 // 空文字列
specification: "abc"     // 数値でない
```

**優先度**: 🟡 **Medium** - データ整合性のため

---

## 4. 表示パターンの調査

### 4.1 表示箇所の整合性

| ファイル | 行 | パターン | 状態 |
|---------|-----|---------|------|
| `AllocationHistoryPage.tsx` | 568, 673 | `${specification} ${unit}` | ⚠️ スペース有り |
| `useAllocationTableData.tsx` | 300, 377 | `${specification} ${unit}` | ⚠️ スペース有り |
| `GlassCalendar.tsx` | 826 | `${specification}${unit}` | ⚠️ スペース無し |
| `ProductPresetModal.tsx` | 259, 1158 | `${specification}${unit}` | ✅ 修正済み |
| `ProductFormCardPricing.tsx` | 339 | `{specification}{unit ? ` ${unit}` : ''}` | ⚠️ 条件付きスペース |
| `ProductCard.tsx` | 165 | `{specification}{unit ? ` ${unit}` : ''}` | ⚠️ 条件付きスペース |

**問題**: 表示形式が統一されていない（スペースの有無）

---

## 5. calculateEffectiveQuantity 呼び出し箇所

### 5.1 本番コード（3箇所）

1. **StoreStatisticsModal.tsx** (line 141)
   - ✅ unit を直接渡す（正しい）

2. **ProductFormCardPricing.tsx** (line 167)
   - ✅ unit を直接渡す（正しい）

3. **ProductPricingForm.tsx** (line 126)
   - ❌ `fullUnit = ${specification}${unit}` を渡す（誤り）

### 5.2 テストコード

- `unitConversion.test.ts` - 15箇所（単体テスト）
- `StoreStatisticsModal.calculations.test.ts` - 1箇所

---

## 6. Firestore規則の詳細調査

### 6.1 haibun_orders（配分データ）

**line 11-25**: `isValidProduct` 関数
```javascript
function isValidProduct(product) {
  return product.keys().hasAll(['supplier', 'name', 'origin',
                                'specification', 'unit', 'packageUnit', ...]) &&
         product.unit is string &&
         product.packageUnit is string &&
         // 他のフィールド検証
}
```

✅ unit/packageUnit が必須フィールドとして定義されている

### 6.2 product_history（商品履歴）

**line 190-209**:
```javascript
allow create: if request.resource.data.keys().hasAll([
  'supplier', 'name', 'origin', 'specification', 'unit', 'packageUnit', 'userId'
]) &&
request.resource.data.packageUnit is string;
```

✅ 必須フィールドとして定義

### 6.3 pricing_history（価格履歴）

**line 214-247**:
```javascript
allow create: if request.resource.data.keys().hasAll([
  'productName', 'specification', 'quantityPerPackage',
  'unit', 'packageUnit', ...
]) &&
request.resource.data.unit is string &&
request.resource.data.packageUnit is string &&
```

✅ 必須フィールドとして定義

### 6.4 allocation_details（配分履歴明細）

**line 318-359**:
```javascript
request.resource.data.unit is string &&
request.resource.data.package_unit is string &&
```

✅ 必須フィールドとして定義

---

## 7. データ保存・読み込みフロー

### 7.1 保存フロー

1. **ユーザー入力** (`ProductFormCardBasic.tsx` line 828-940)
   - 規格: TextField (自由入力)
   - 単位: TextField + 履歴チップ + "gあたり"ボタン
   - ボタンクリック時: `setValue('unit', 'gあたり')` (line 916)

2. **プリセット適用** (`ProductFormCardBasic.tsx` line 351-353)
   ```typescript
   setValue(`products.${index}.specification`, preset.specification);
   setValue(`products.${index}.unit`, preset.unit);
   ```

3. **価格履歴の自動読み込み** (`ProductFormCardPricing.tsx` line 144)
   ```typescript
   setValue(`products.${index}.unit`, latestHistory.unit);
   ```

4. **Firestoreへ保存** (`PricingHistoryRepository.ts` line 76)
   ```typescript
   specification: history.specification,
   unit: history.unit,
   packageUnit: history.packageUnit,
   ```

### 7.2 読み込みフロー

1. **Firestoreクエリ** (`PricingHistoryRepository.ts` line 166-168)
   ```typescript
   where('specification', '==', history.specification),
   where('unit', '==', history.unit || ''),
   where('packageUnit', '==', history.packageUnit || '')
   ```
   ✅ unit/packageUnit をクエリ条件に含む

2. **履歴マッチング** (`usePricingHistory.ts` line 125-143)
   ```typescript
   pricingHistory.filter(
     (item) =>
       item.specification === specification &&
       item.unit === unit &&
       item.packageUnit === packageUnit
   );
   ```
   ✅ 正しくフィルタリング

---

## 8. 修正方針

### オプションA: unit に完全形式を保存（推奨）

**メリット**:
- 現在のテストデータと互換性あり
- StoreStatisticsModal等は変更不要
- calculateEffectiveQuantity に直接渡せる

**デメリット**:
- specification と unit が重複情報を持つ
- ユーザー入力時に結合処理が必要

**必要な変更**:
1. ProductPricingForm.tsx の `${specification}${unit}` を削除
2. スキーマコメント更新
3. 表示箇所の統一（スペース有無）

### オプションB: specification と unit を完全に分離

**メリット**:
- データ正規化
- 規格と単位を独立して管理できる

**デメリット**:
- 全ての calculateEffectiveQuantity 呼び出し箇所で結合が必要
- 既存のテストデータとの互換性がない
- 大規模な変更が必要

**必要な変更**:
1. 全ての calculateEffectiveQuantity 呼び出しを修正（3箇所）
2. 表示箇所を全て修正（10箇所以上）
3. テストデータ更新
4. Firestoreデータ移行

---

## 9. 推奨修正計画

### ✅ Phase 1: Critical修正（即座実施）

1. **商品別統計のバグ修正**
   - ファイル: `StoreStatisticsModal.tsx` (line 234-256)
   - effectiveQuantity を計算に含める

### ✅ Phase 2: データ構造統一（短期）

2. **ProductPricingForm.tsx の修正**
   - ファイル: `ProductPricingForm.tsx` (line 123-124)
   - `${specification}${unit}` 結合を削除
   - unit を直接使用

3. **表示箇所の統一**
   - 全ての表示箇所でスペース有無を統一
   - 推奨: `{specification}{unit && ` ${unit}`}` （条件付きスペース）

4. **スキーマコメント更新**
   - `orderSchema.ts` のコメントを実態に合わせる

### 🔄 Phase 3: バリデーション強化（中期）

5. **フロント側バリデーション**
   - unit フォーマット検証（正規表現）
   - specification が数値の場合のチェック

6. **Firestore ルール強化**
   ```javascript
   // unit: "gあたり", "kgあたり", "100gあたり" などのパターン検証
   function isValidUnit(unit) {
     return unit.matches('.*あたり$') ||
            unit in ['個', '玉', '本', '束', 'パック', '袋'];
   }
   ```

---

## 10. 修正対象ファイル一覧

### 🔴 Critical（即座修正）

1. `frontend/src/components/modals/StoreStatisticsModal.tsx` (line 234-256)
   - 商品別統計に effectiveQuantity 追加

### 🟡 High（短期修正）

2. `frontend/src/components/forms/ProductPricingForm.tsx` (line 123-124)
   - `${specification}${unit}` 削除

3. `frontend/src/schemas/orderSchema.ts` (line 49, 56)
   - コメント更新

4. 表示統一（以下のファイル）:
   - `frontend/src/pages/AllocationHistoryPage.tsx` (line 568, 673)
   - `frontend/src/features/allocation-history/hooks/useAllocationTableData.tsx` (line 300, 377)
   - `frontend/src/components/calendar/GlassCalendar.tsx` (line 826)

### 🟢 Medium（中期検討）

5. `firestore.rules`
   - バリデーション関数追加

---

## 11. テスト計画

### 既存テスト確認

✅ `StoreStatisticsModal.calculations.test.ts` - 12 tests
- 重量ベース計算（100gあたり + 5kg）
- 個数ベース計算（1個 + 30入り）
- 実店舗コードでの統計

### 追加テスト必要項目

1. **商品別統計テスト**
   ```typescript
   describe('商品別統計計算', () => {
     it('effectiveQuantityを考慮した原価計算', () => {
       // specification: "100", unit: "100gあたり"
       // 期待値: boxCost = unitCost × 50
     });
   });
   ```

2. **ProductPricingForm 統合テスト**
   ```typescript
   it('specification/unitの重複を起こさない', () => {
     // fullUnit が "100100gあたり" にならないこと
   });
   ```

---

## 12. データベース側の推奨事項

### 12.1 Firestore Index

現在のクエリパターン:
```typescript
where('specification', '==', history.specification),
where('unit', '==', history.unit || ''),
where('packageUnit', '==', history.packageUnit || '')
```

**推奨**:
- `pricing_history`: (userId, productName, specification, unit, packageUnit) の複合インデックス
- `product_history`: (userId, name, origin, specification, unit, packageUnit) の複合インデックス

### 12.2 データクリーンアップクエリ

既存データに不整合がある可能性:
```typescript
// 確認クエリ（管理用）
db.collection('pricing_history')
  .where('unit', '==', '')
  .get()

// unit が空の履歴を特定
```

---

## 13. まとめ

### 重大な問題

1. ✅ **商品別統計のバグ** - effectiveQuantity 未使用
2. ⚠️ **ProductPricingForm の重複** - specification/unit を二重に連結

### データ構造の現状

```typescript
// 実際のデータ
{
  specification: "100",      // 数値のみ
  unit: "100gあたり",        // 完全な形式
  quantityPerPackage: 5,
  packageUnit: "kg"
}
```

### 推奨アクション

1. **即座**: StoreStatisticsModal の商品別統計を修正
2. **短期**: ProductPricingForm の重複を削除
3. **中期**: Firestore バリデーション強化

---

## 付録A: calculateEffectiveQuantity の仕様

**入力**:
```typescript
{
  quantityPerPackage: 5,
  packageUnit: "kg",
  unit: "100gあたり"  // ← 完全な形式が必要
}
```

**処理**:
1. unit から数値と単位を抽出: "100gあたり" → value=100, unit='g'
2. packageUnit を g に変換: "5kg" → 5000g
3. 実効数量を計算: 5000g ÷ 100g = 50

**出力**:
```typescript
{
  effectiveQuantity: 50,
  isConverted: true,
  conversionDescription: "5kg ÷ 100g = 50単位"
}
```

**重要**:
- unit には "100gあたり" のような**完全な形式**が必要
- "100" + "gあたり" を結合して渡してはいけない（既に "100gあたり" なので重複する）

---

**調査完了日**: 2025-12-02
**推奨優先度**: Critical → High → Medium の順に修正を進める
