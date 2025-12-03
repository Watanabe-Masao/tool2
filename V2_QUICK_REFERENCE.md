# V2単位変換 クイックリファレンス

**対象者**: 開発者
**最終更新**: 2025-12-03

---

## 📌 基本的な使い方

### V2関数を使う（推奨）

```typescript
import { calculateEffectiveQuantityV2 } from '@/utils/unitConversion';

// 例: 5kg入り箱、100gあたりの単価
const result = calculateEffectiveQuantityV2({
  specification: '100',     // 規格（数値部分）
  unit: 'gあたり',          // 単位（基本形式）
  quantityPerPackage: 5,    // 入数
  packageUnit: 'kg',        // 入数単位
});

console.log(result.effectiveQuantity);  // 50単位
console.log(result.isConverted);        // true
console.log(result.conversionDescription);
// "5kg ÷ 100g = 50単位"
```

### データ構造

```typescript
// V2形式（推奨）
interface Product {
  specification: '100';   // 規格（数値のみ）
  unit: 'gあたり';        // 単位（基本形式）
  quantityPerPackage: 5;  // 入数
  packageUnit: 'kg';      // 入数単位
}
```

---

## 🔢 変換パターン

### 重量ベース（変換あり）

| 規格 | 単位 | 入数 | 入数単位 | 結果 | 説明 |
|------|------|------|---------|------|------|
| "100" | "gあたり" | 5 | "kg" | 50単位 | 5kg = 5000g, 5000g ÷ 100g = 50 |
| "5" | "kgあたり" | 10 | "kg" | 2単位 | 10kg ÷ 5kg = 2 |
| "" | "gあたり" | 1 | "kg" | 1000単位 | 規格空文字 → 1gとして計算 |
| "200" | "gあたり" | 2 | "kg" | 10単位 | 2kg = 2000g, 2000g ÷ 200g = 10 |

### 個数ベース（変換なし）

| 規格 | 単位 | 入数 | 入数単位 | 結果 | 説明 |
|------|------|------|---------|------|------|
| "1" | "個" | 20 | "個" | 20単位 | そのまま |
| "1" | "本" | 10 | "本" | 10単位 | そのまま |
| "1" | "玉" | 5 | "玉" | 5単位 | そのまま |

---

## ⚠️ やってはいけないこと

### ❌ V1形式を使わない

```typescript
// ❌ 古い形式（使わない）
const result = calculateEffectiveQuantity({
  unit: '100gあたり',  // 数値と単位が混在
  quantityPerPackage: 5,
  packageUnit: 'kg',
});
```

### ❌ unitに数値を含めない

```typescript
// ❌ 間違い
const product = {
  specification: '',
  unit: '100gあたり',  // 数値が含まれている
};

// ✅ 正しい
const product = {
  specification: '100',  // 数値は specification へ
  unit: 'gあたり',       // 単位のみ
};
```

---

## 🧪 テストの書き方

```typescript
import { calculateEffectiveQuantityV2 } from '@/utils/unitConversion';

describe('単位変換テスト', () => {
  it('5kg箱、100gあたり → 50単位', () => {
    const result = calculateEffectiveQuantityV2({
      specification: '100',
      unit: 'gあたり',
      quantityPerPackage: 5,
      packageUnit: 'kg',
    });

    expect(result.effectiveQuantity).toBe(50);
    expect(result.isConverted).toBe(true);
  });

  it('20個入り、1個あたり → 20単位', () => {
    const result = calculateEffectiveQuantityV2({
      specification: '1',
      unit: '個',
      quantityPerPackage: 20,
      packageUnit: '個',
    });

    expect(result.effectiveQuantity).toBe(20);
    expect(result.isConverted).toBe(false);  // 変換なし
  });
});
```

---

## 🔍 エッジケース

### 空の規格（デフォルト値: 1）

```typescript
const result = calculateEffectiveQuantityV2({
  specification: '',  // 空文字
  unit: 'gあたり',
  quantityPerPackage: 1,
  packageUnit: 'kg',
});

// specification: '' → 1g として計算
// 1kg = 1000g, 1000g ÷ 1g = 1000単位
expect(result.effectiveQuantity).toBe(1000);
```

### 数値型の規格

```typescript
const result = calculateEffectiveQuantityV2({
  specification: 100,  // 数値型も可
  unit: 'gあたり',
  quantityPerPackage: 5,
  packageUnit: 'kg',
});

expect(result.effectiveQuantity).toBe(50);
```

### 入数がゼロまたはnull

```typescript
const result = calculateEffectiveQuantityV2({
  specification: '100',
  unit: 'gあたり',
  quantityPerPackage: null,  // null
  packageUnit: 'kg',
});

expect(result.effectiveQuantity).toBe(0);
expect(result.isConverted).toBe(false);
```

---

## 📋 コンポーネントでの使用例

### StoreStatisticsModal.tsx

```typescript
const conversionResult = calculateEffectiveQuantityV2({
  specification: product.specification || '',
  unit: product.unit || '',
  quantityPerPackage: product.quantityPerPackage,
  packageUnit: product.packageUnit || '',
});

const effectiveQuantity = conversionResult.effectiveQuantity;
const boxStoreCost = storeCost * effectiveQuantity;
const boxPriceExcludingTax = priceExcludingTax * effectiveQuantity;
```

### ProductFormCardPricing.tsx

```typescript
const unitConversionResult = calculateEffectiveQuantityV2({
  specification: specification || '',
  unit: unit || '',
  quantityPerPackage,
  packageUnit: packageUnit || '',
});

const effectiveQuantity = unitConversionResult.effectiveQuantity;
const profitAmount = storeCost && centerCostWithFee && totalDelivery
  ? Math.round((storeCost - centerCostWithFee) * (totalDelivery * effectiveQuantity))
  : 0;
```

---

## 🆕 新しい単位の追加方法

### 1. パターンに追加

```typescript
// unitConversion.ts

// 例: mg（ミリグラム）を追加
const BASE_WEIGHT_UNIT_PATTERN = /^(g|kg|mg)あたり$/;
```

### 2. 変換関数に追加

```typescript
function convertToGrams(quantity: number, unit: string): number | null {
  switch (unit) {
    case 'g': return quantity;
    case 'kg': return quantity * 1000;
    case 'mg': return quantity / 1000;  // 追加
    default: return null;
  }
}
```

### 3. parseUnitValueV2に追加

```typescript
export function parseUnitValueV2(
  specification: string | number,
  unit: string
): ParsedUnit | null {
  // ...
  const unitType = match[1] as 'g' | 'kg' | 'mg';  // 型に追加
  // ...
}
```

### 4. テスト追加

```typescript
it('規格"100" + "mgあたり" + 5g → 50単位', () => {
  const result = calculateEffectiveQuantityV2({
    specification: '100',
    unit: 'mgあたり',
    quantityPerPackage: 5,
    packageUnit: 'g',
  });
  expect(result.effectiveQuantity).toBe(50);
});
```

---

## 🐛 トラブルシューティング

### 変換されない（isConverted: false）

**原因1**: 単位が個数ベース
```typescript
// 個数ベースは変換されない（正常動作）
unit: '個'  → isConverted: false
```

**原因2**: 単位が無効
```typescript
// 認識されない単位
unit: 'リットル'  → isConverted: false
```

**原因3**: 入数がゼロまたはnull
```typescript
quantityPerPackage: null  → effectiveQuantity: 0, isConverted: false
```

### 予期しない数値

**確認1**: 規格と単位の分離
```typescript
// ❌ 間違い
specification: '',
unit: '100gあたり'  // 数値が含まれている

// ✅ 正しい
specification: '100',
unit: 'gあたり'
```

**確認2**: 単位の一致
```typescript
// packageUnitとunitが異なる単位系の場合は変換されない
quantityPerPackage: 20,
packageUnit: '個',
unit: 'gあたり'  // 重量と個数が混在 → isConverted: false
```

---

## 📚 関連ドキュメント

- **詳細実装**: `OPTION_X_IMPLEMENTATION_COMPLETE.md`
- **技術分析**: `unit-conversion-logic-analysis.md`
- **移行ガイド**: `frontend/scripts/HOW_TO_CHECK_MIGRATION.md`
- **テスト**: `frontend/src/__tests__/utils/unitConversion.test.ts`

---

## ✅ チェックリスト

新規コードを書く際のチェックポイント:

- [ ] `specification`と`unit`を分離しているか
- [ ] `calculateEffectiveQuantityV2`を使用しているか
- [ ] `unit`に数値を含めていないか
- [ ] 空文字やnullを適切にハンドリングしているか
- [ ] テストを書いたか
- [ ] `effectiveQuantity`を使って計算しているか

---

**V2形式で開発を進めてください！** ✨
