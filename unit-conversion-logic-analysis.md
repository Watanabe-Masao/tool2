# 単位変換ロジック詳細分析

作成日: 2025-12-02

## ご質問：重量ベースと個数ベースの区別

### 質問内容
- 「100g」と「1個」「1本」をどう分けているか？
- 「5kg」と「10入り」をどう分けているか？

---

## 回答：正規表現による自動判定

### 判定ロジック（line 50）

```typescript
const WEIGHT_UNIT_PATTERN = /^(\d+)?(g|kg)あたり$/;
```

**この正規表現がすべてを決定します。**

---

## パターン1: 重量ベース（変換あり）

### 条件
```typescript
unit: "100gあたり", "gあたり", "kgあたり"  // ← パターンマッチ ✅
packageUnit: "kg", "g"                      // ← 重量単位 ✅
```

### 処理フロー（calculateEffectiveQuantity）

**Step 1**: unitをパース（line 188）
```typescript
parseUnitValue("100gあたり")
// → { value: 100, unit: 'g' }
```

**Step 2**: packageUnitを重量単位チェック（line 199）
```typescript
isWeightBasedPackageUnit("kg")  // → true
```

**Step 3**: グラム換算（line 207）
```typescript
convertToGrams(5, "kg")  // → 5000g
```

**Step 4**: 実効数量計算（line 224）
```typescript
effectiveQuantity = Math.floor(5000 / 100)  // → 50単位
```

### 具体例
```typescript
// 入力
unit: "100gあたり"
packageUnit: "kg"
quantityPerPackage: 5

// 出力
effectiveQuantity: 50
isConverted: true
conversionDescription: "5kg ÷ 100g = 50単位"
```

---

## パターン2: 個数ベース（変換なし）

### 条件
```typescript
unit: "個", "本", "玉", "束"  // ← パターンマッチせず ❌
packageUnit: "入り", "個"     // ← 重量単位でない
```

### 処理フロー

**Step 1**: unitをパース（line 188）
```typescript
parseUnitValue("個")
// → null  （重量単位パターンにマッチしない）
```

**Step 2**: パース失敗なので変換スキップ（line 191-196）
```typescript
if (!parsedUnit) {
  return {
    effectiveQuantity: quantityPerPackage,  // そのまま返す
    isConverted: false,
  };
}
```

### 具体例
```typescript
// 入力
unit: "個"
packageUnit: "入り"
quantityPerPackage: 10

// 出力
effectiveQuantity: 10  // ← quantityPerPackage をそのまま返す
isConverted: false
```

---

## 判定表

| unit | packageUnit | マッチ | 変換 | effectiveQuantity |
|------|-------------|--------|------|-------------------|
| "100gあたり" | "kg" | ✅ | あり | 5kg → 5000g ÷ 100g = **50** |
| "gあたり" | "kg" | ✅ | あり | 3kg → 3000g ÷ 1g = **3000** |
| "kgあたり" | "g" | ✅ | あり | 500g → 0.5kg ÷ 1kg = **0** (切り捨て) |
| "個" | "入り" | ❌ | なし | **10** (そのまま) |
| "本" | "本" | ❌ | なし | **20** (そのまま) |
| "玉" | "個" | ❌ | なし | **15** (そのまま) |
| "100gあたり" | "個" | ⚠️ | 失敗 | **5** (そのまま・警告なし) |

---

## 現在のデータ構造の不整合

### 問題：重量ベースと個数ベースで扱いが異なる

**重量ベース**:
```typescript
specification: "100"        // 数値のみ
unit: "100gあたり"          // ★specificationを含む完全形式
```

**個数ベース**:
```typescript
specification: "1"          // 数値のみ
unit: "個"                  // ★specificationを含まない基本形式
```

**なぜこうなったか？**

1. **重量ベース**は計算に必要なため完全形式を保存
   - `parseUnitValue("100gあたり")` → `{value: 100, unit: 'g'}`

2. **個数ベース**は計算不要なため基本形式のみ
   - `parseUnitValue("個")` → `null` (パースしない)

---

## オプションX: 完全分離への移行

### 目標：データ構造の統一

**重量ベース**（変更後）:
```typescript
specification: "100"        // 数値のみ
unit: "gあたり"             // ★基本単位のみ（数値を含まない）
quantityPerPackage: 5
packageUnit: "kg"
```

**個数ベース**（変更なし）:
```typescript
specification: "1"          // 数値のみ（または空）
unit: "個"                  // 基本単位のみ
quantityPerPackage: 10
packageUnit: "入り"
```

### メリット

✅ **データ正規化**
- specification と unit が独立
- 重複情報なし

✅ **表示の柔軟性**
- 規格：`${specification}${unit}` → "100gあたり"
- 入数：`${quantityPerPackage}${packageUnit}` → "5kg"

✅ **計算の明確化**
- 規格値：`specification` (数値)
- 単位：`unit` (文字列)
- 計算時に結合

✅ **整合性**
- 重量ベースと個数ベースで同じデータ構造

✅ **バックエンド連携**
- FirestoreのフィールドがRDBライクに正規化
- クエリ最適化が可能

---

## 必要な変更（オプションX実装）

### Phase 1: unitConversion.ts の拡張

#### 1.1 新しいインターフェース

```typescript
export interface UnitConversionInputV2 {
  /** 規格の数値（例: 100） */
  specification: string | number;
  /** 単位の基本形式（例: "gあたり"） */
  unit: string;
  /** 入数（例: 5） */
  quantityPerPackage: number | null;
  /** 入数の単位（例: "kg"） */
  packageUnit: string;
}
```

#### 1.2 parseUnitValue の拡張

```typescript
/**
 * 規格と単位を組み合わせてパース
 *
 * @example
 * parseUnitValueV2("100", "gあたり")  // → {value: 100, unit: 'g'}
 * parseUnitValueV2("", "kgあたり")    // → {value: 1, unit: 'kg'}
 */
export function parseUnitValueV2(
  specification: string | number,
  unit: string
): ParsedUnit | null {
  if (!unit) {
    return null;
  }

  // 基本単位パターン（数値なし）
  const basePattern = /^(g|kg)あたり$/;
  const match = unit.match(basePattern);

  if (!match) {
    return null;  // 個数ベース
  }

  // specification から数値を取得
  const value = specification
    ? (typeof specification === 'number' ? specification : parseInt(specification, 10))
    : 1;

  if (isNaN(value) || value <= 0) {
    return null;
  }

  const unitType = match[1] as 'g' | 'kg';

  return { value, unit: unitType };
}
```

#### 1.3 calculateEffectiveQuantityV2

```typescript
export function calculateEffectiveQuantityV2(
  input: UnitConversionInputV2
): UnitConversionResult {
  const { specification, unit, quantityPerPackage, packageUnit } = input;

  // 入数が無効な場合
  if (quantityPerPackage === null || quantityPerPackage === 0) {
    return {
      effectiveQuantity: 0,
      isConverted: false,
    };
  }

  // 規格と単位を組み合わせてパース
  const parsedUnit = parseUnitValueV2(specification, unit);

  // 重量ベースでない場合（個数ベース）
  if (!parsedUnit) {
    return {
      effectiveQuantity: quantityPerPackage,
      isConverted: false,
    };
  }

  // パッケージ単位が重量単位でない場合
  if (!isWeightBasedPackageUnit(packageUnit)) {
    return {
      effectiveQuantity: quantityPerPackage,
      isConverted: false,
    };
  }

  // 以下、現在と同じ計算ロジック
  const totalGrams = convertToGrams(quantityPerPackage, packageUnit);
  if (totalGrams === null) {
    return {
      effectiveQuantity: quantityPerPackage,
      isConverted: false,
    };
  }

  const unitInGrams = parsedUnit.unit === 'kg'
    ? parsedUnit.value * 1000
    : parsedUnit.value;

  const effectiveQuantity = Math.floor(totalGrams / unitInGrams);

  const conversionDescription =
    `${quantityPerPackage}${packageUnit} ÷ ${parsedUnit.value}${parsedUnit.unit} = ${effectiveQuantity}単位`;

  return {
    effectiveQuantity,
    isConverted: true,
    conversionDescription,
  };
}
```

### Phase 2: 呼び出し箇所の更新

#### 2.1 StoreStatisticsModal.tsx（2箇所）

**変更前**:
```typescript
const conversionResult = calculateEffectiveQuantity({
  quantityPerPackage: product.quantityPerPackage,
  packageUnit: product.packageUnit || '',
  unit: product.unit || '',
});
```

**変更後**:
```typescript
const conversionResult = calculateEffectiveQuantityV2({
  specification: product.specification || '',
  unit: product.unit || '',
  quantityPerPackage: product.quantityPerPackage,
  packageUnit: product.packageUnit || '',
});
```

#### 2.2 ProductPricingForm.tsx

**変更前**:
```typescript
const conversionResult = calculateEffectiveQuantity({
  quantityPerPackage: product.quantityPerPackage,
  packageUnit: product.packageUnit || '',
  unit: product.unit || '',
});
```

**変更後**:
```typescript
const conversionResult = calculateEffectiveQuantityV2({
  specification: product.specification || '',
  unit: product.unit || '',
  quantityPerPackage: product.quantityPerPackage,
  packageUnit: product.packageUnit || '',
});
```

#### 2.3 ProductFormCardPricing.tsx

**変更前**:
```typescript
const unitConversionResult = calculateEffectiveQuantity({
  quantityPerPackage,
  packageUnit: packageUnit || '',
  unit: unit || '',
});
```

**変更後**:
```typescript
const unitConversionResult = calculateEffectiveQuantityV2({
  specification: specification || '',
  unit: unit || '',
  quantityPerPackage,
  packageUnit: packageUnit || '',
});
```

### Phase 3: データ移行

#### 3.1 Firestore既存データの変換

**重量ベースデータ**:
```typescript
// 変換前
{
  specification: "100",
  unit: "100gあたり",
}

// 変換後
{
  specification: "100",
  unit: "gあたり",
}
```

**変換スクリプト**（例）:
```typescript
// frontend/scripts/migrate-unit-format.ts
const WEIGHT_PATTERN = /^(\d+)(g|kg)あたり$/;

function migrateUnitFormat(unit: string): string {
  const match = unit.match(WEIGHT_PATTERN);
  if (match) {
    // "100gあたり" → "gあたり"
    return `${match[2]}あたり`;
  }
  // "個" などはそのまま
  return unit;
}

// 各コレクションに対して実行
// - pricing_history
// - product_history
// - allocation_details
// - haibun_orders (products配列内)
```

#### 3.2 移行手順

1. **バックアップ**
   ```bash
   gcloud firestore export gs://[BUCKET_NAME]/backup-2025-12-02
   ```

2. **移行スクリプト実行**
   ```typescript
   // pricing_history
   const snapshot = await db.collection('pricing_history')
     .where('unit', '>=', '0')
     .where('unit', '<=', '9zzz')  // 数字で始まるもの
     .get();

   const batch = db.batch();
   snapshot.docs.forEach(doc => {
     const oldUnit = doc.data().unit;
     const newUnit = migrateUnitFormat(oldUnit);
     if (oldUnit !== newUnit) {
       batch.update(doc.ref, { unit: newUnit });
     }
   });
   await batch.commit();
   ```

3. **検証**
   - 変換前後のレコード数確認
   - サンプルデータの目視確認
   - テスト実行

### Phase 4: UIの更新

#### 4.1 表示箇所の統一

**全ての表示箇所**:
```typescript
// 規格表示
{specification}{unit && ` ${unit}`}

// 例
specification: "100", unit: "gあたり"  → "100 gあたり"
specification: "1", unit: "個"         → "1 個"
specification: "", unit: "個"          → "個"
```

#### 4.2 入力補完の更新

**ProductFormCardBasic.tsx**:

現在の「gあたり」ボタン（line 916）:
```typescript
onClick={() => {
  field.onChange('gあたり');
  if (!currentSpecification) {
    setValue(`products.${index}.specification`, '100');
  }
}}
```

**変更不要**（既に分離している）✅

### Phase 5: スキーマとバリデーション

#### 5.1 orderSchema.ts

```typescript
/** 規格の数値（例: 100, 2L, M） */
specification: z
  .string()
  .max(MAX_LENGTH.SPECIFICATION, `規格は${MAX_LENGTH.SPECIFICATION}文字以内で入力してください`)
  .optional()
  .default(''),

/** 規格の単位（基本形式: gあたり、kgあたり、個、本など） */
unit: z
  .string()
  .max(MAX_LENGTH.SPECIFICATION, `単位は${MAX_LENGTH.SPECIFICATION}文字以内で入力してください`)
  .optional()
  .default(''),
```

#### 5.2 Firestore Rules強化

```javascript
// 単位フォーマット検証関数
function isValidUnit(unit) {
  // 重量ベース
  if (unit.matches('.*あたり$')) {
    return unit in ['gあたり', 'kgあたり'];
  }
  // 個数ベース
  return unit in ['個', '本', '玉', '束', 'パック', '袋', '枚', '缶'];
}

// 規格と単位の整合性チェック
function isSpecificationCompatible(spec, unit) {
  // 重量ベースは数値が必要
  if (unit in ['gあたり', 'kgあたり']) {
    return spec.matches('^[0-9]+$');  // 数値のみ
  }
  // 個数ベースは任意（"", "1", "L" など）
  return true;
}
```

---

## テスト計画

### 既存テストの更新

**StoreStatisticsModal.calculations.test.ts**:
```typescript
// 変更前
unit: "100gあたり"

// 変更後
specification: "100",
unit: "gあたり"
```

**unitConversion.test.ts**:
- `parseUnitValueV2` のテスト追加
- `calculateEffectiveQuantityV2` のテスト追加
- 互換性テスト（V1とV2で同じ結果）

### 新規テスト

```typescript
describe('parseUnitValueV2', () => {
  it('規格と単位を分離してパース', () => {
    const result = parseUnitValueV2("100", "gあたり");
    expect(result).toEqual({ value: 100, unit: 'g' });
  });

  it('規格が空の場合は1として扱う', () => {
    const result = parseUnitValueV2("", "kgあたり");
    expect(result).toEqual({ value: 1, unit: 'kg' });
  });

  it('個数ベースはnullを返す', () => {
    const result = parseUnitValueV2("1", "個");
    expect(result).toBeNull();
  });
});

describe('calculateEffectiveQuantityV2', () => {
  it('重量ベース: 100gあたり + 5kg', () => {
    const result = calculateEffectiveQuantityV2({
      specification: "100",
      unit: "gあたり",
      quantityPerPackage: 5,
      packageUnit: "kg",
    });
    expect(result.effectiveQuantity).toBe(50);
    expect(result.isConverted).toBe(true);
  });

  it('個数ベース: 1個 + 10入り', () => {
    const result = calculateEffectiveQuantityV2({
      specification: "1",
      unit: "個",
      quantityPerPackage: 10,
      packageUnit: "入り",
    });
    expect(result.effectiveQuantity).toBe(10);
    expect(result.isConverted).toBe(false);
  });
});
```

---

## 移行スケジュール（推奨）

### Week 1: 準備
- [ ] データ移行スクリプト作成
- [ ] テスト計画策定
- [ ] ステージング環境でテスト

### Week 2: コード変更
- [ ] unitConversion.ts にV2実装
- [ ] 全呼び出し箇所を更新（15+ファイル）
- [ ] テストコード更新

### Week 3: データ移行
- [ ] Firestoreバックアップ
- [ ] 移行スクリプト実行
  - pricing_history
  - product_history
  - allocation_details
  - haibun_orders
- [ ] データ検証

### Week 4: 検証とデプロイ
- [ ] 全テスト実行
- [ ] ステージング環境で統合テスト
- [ ] 本番デプロイ
- [ ] モニタリング

---

## リスクと対策

### リスク1: データ移行の失敗

**対策**:
- ✅ 事前に完全バックアップ
- ✅ ロールバック手順を準備
- ✅ ステージング環境で予行演習

### リスク2: 既存データとの互換性

**対策**:
- ✅ V1とV2を並行稼働（Deprecated警告）
- ✅ 移行期間中は両方をサポート
- ✅ 段階的に切り替え

### リスク3: ユーザー影響

**対策**:
- ✅ メンテナンス時間帯に実施
- ✅ ユーザー通知
- ✅ 迅速なロールバック体制

---

## まとめ

### 現状の問題

1. ✅ **不整合**: 重量ベースと個数ベースで異なるデータ構造
2. ✅ **重複**: specification と unit に同じ数値が含まれる
3. ✅ **保守性**: データの意味が不明確

### オプションX（完全分離）のメリット

1. ✅ **データ正規化**: 重複情報の排除
2. ✅ **整合性**: 全パターンで統一されたデータ構造
3. ✅ **保守性**: 規格と単位が独立して管理可能
4. ✅ **拡張性**: 新しい単位タイプの追加が容易
5. ✅ **バックエンド連携**: Firestoreクエリの最適化

### 推奨アクション

**今すぐ実施**: オプションX（完全分離）への移行

**理由**:
- 根本的な解決が可能
- 今後の開発継続性が向上
- より合理的な計算ロジック
- データの整合性が保証される
- 効率的なアルゴリズム

---

**作成日**: 2025-12-02
**推奨**: オプションX（完全分離）の実装を推奨
