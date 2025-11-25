

# メッセージ・テキスト管理ガイド

アプリケーション全体で使用するメッセージとテキストの **Single Source of Truth (SSOT)**

## 📁 ディレクトリ構成

```
messages/
├── validation.ts      # バリデーションメッセージ
├── notification.ts    # 通知メッセージ
├── ui.ts              # UIテキスト
├── index.ts           # 統合エクスポート
└── README.md          # このファイル
```

## 📋 各ファイルの役割

### validation.ts
フォームバリデーションで使用するエラーメッセージ

- **REQUIRED_MESSAGES**: 必須フィールドメッセージ
- **TYPE_ERROR_MESSAGES**: 型エラーメッセージ
- **FIELD_VALIDATION_MESSAGES**: フィールド別バリデーションメッセージ
- **ヘルパー関数**: 動的メッセージ生成

```typescript
import { REQUIRED_MESSAGES, createMaxLengthMessage } from '@/messages/validation';

// 使用例
const schema = z.object({
  name: z.string().min(1, REQUIRED_MESSAGES.productName),
  supplier: z.string().max(100, createMaxLengthMessage('帳合先', 100)),
});
```

### notification.ts
ユーザーへの通知メッセージ（トースト、ダイアログ等）

- **SUCCESS_MESSAGES**: 成功メッセージ
- **ERROR_MESSAGES**: エラーメッセージ
- **WARNING_MESSAGES**: 警告メッセージ
- **INFO_MESSAGES**: 情報メッセージ
- **CONFIRM_MESSAGES**: 確認メッセージ

```typescript
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/messages/notification';

// 使用例
showNotification({ message: SUCCESS_MESSAGES.orderSaved, severity: 'success' });
showNotification({ message: ERROR_MESSAGES.networkError, severity: 'error' });
```

### ui.ts
UIコンポーネントで使用するテキスト

- **BUTTON_LABELS**: ボタンラベル
- **FIELD_LABELS**: フィールドラベル
- **PAGE_TITLES**: ページタイトル
- **SECTION_TITLES**: セクションタイトル
- **PLACEHOLDERS**: プレースホルダー
- **STATUS_LABELS**: ステータス表示
- **HELP_TEXT**: ヘルプテキスト
- **EMPTY_STATE_MESSAGES**: 空状態メッセージ
- **TIME_LABELS**: タイムスタンプ表示

```typescript
import { BUTTON_LABELS, FIELD_LABELS, PLACEHOLDERS } from '@/messages/ui';

// 使用例
<Button>{BUTTON_LABELS.save}</Button>
<TextField label={FIELD_LABELS.productName} placeholder={PLACEHOLDERS.enterProductName} />
```

## 🎯 使用ガイドライン

### ✅ やるべきこと

1. **必ず messages/ からインポート**
   ```typescript
   // ✅ 良い
   import { SUCCESS_MESSAGES } from '@/messages';
   showNotification({ message: SUCCESS_MESSAGES.orderSaved });

   // ❌ 悪い
   showNotification({ message: '注文を保存しました' });
   ```

2. **ヘルパー関数を活用**
   ```typescript
   // ✅ 良い
   import { createMaxLengthMessage } from '@/messages/validation';
   const message = createMaxLengthMessage('品名', 100);

   // ❌ 悪い
   const message = `品名は100文字以内で入力してください`;
   ```

3. **動的なメッセージもヘルパーで**
   ```typescript
   // ✅ 良い
   import { TIME_LABELS } from '@/messages/ui';
   const timeAgo = TIME_LABELS.minutesAgo(5); // "5分前"

   // ❌ 悪い
   const timeAgo = `${minutes}分前`;
   ```

### ❌ やってはいけないこと

1. **コンポーネントやフックにハードコードしない**
   ```typescript
   // ❌ 悪い - コンポーネントにメッセージをハードコード
   function MyComponent() {
     return <Button>保存</Button>;
   }

   // ✅ 良い - messages から取得
   import { BUTTON_LABELS } from '@/messages';
   function MyComponent() {
     return <Button>{BUTTON_LABELS.save}</Button>;
   }
   ```

2. **同じメッセージを複数箇所で定義しない**
   ```typescript
   // ❌ 悪い - 重複定義
   const ERROR_MESSAGE = '保存に失敗しました'; // hookA.ts
   const SAVE_ERROR = '保存に失敗しました';    // hookB.ts

   // ✅ 良い - 単一定義
   import { ERROR_MESSAGES } from '@/messages';
   const error = ERROR_MESSAGES.dataSaveFailed;
   ```

3. **テンプレートリテラルで直接メッセージを作らない**
   ```typescript
   // ❌ 悪い
   const message = `${field}は${max}文字以内で入力してください`;

   // ✅ 良い
   import { createMaxLengthMessage } from '@/messages';
   const message = createMaxLengthMessage(field, max);
   ```

## 🔍 新しいメッセージの追加方法

### 1. 適切なファイルを選択
- バリデーションメッセージ → `validation.ts`
- 通知メッセージ → `notification.ts`
- UI テキスト → `ui.ts`

### 2. 適切なカテゴリに追加
```typescript
// validation.ts の例
export const REQUIRED_MESSAGES = {
  // 既存のメッセージ...
  newField: '新しいフィールドを入力してください', // ← 追加
} as const;
```

### 3. index.ts で re-export（自動的に含まれる）

### 4. 型安全性の確認
```typescript
// TypeScript が自動補完してくれることを確認
import { REQUIRED_MESSAGES } from '@/messages';
REQUIRED_MESSAGES. // ← ここで候補が表示されるか確認
```

## 🌐 将来の多言語化対応

現在の構造は、将来的な i18n 対応を考慮しています：

```typescript
// 将来的には...
messages/
├── ja/           # 日本語
│   ├── validation.ts
│   ├── notification.ts
│   └── ui.ts
├── en/           # 英語
│   ├── validation.ts
│   ├── notification.ts
│   └── ui.ts
└── index.ts      # ロケール切り替えロジック
```

## 📊 メッセージ使用状況の確認

CI/CD で自動チェックされます:
```bash
npm run check-ssot
```

このコマンドは以下を検出します:
- ハードコードされたメッセージ
- messages/ を使用していない箇所
- 重複したメッセージ定義

## 🔗 関連ドキュメント

- [型定義ガイド](../types/README.md)
- [SSOT 完全ガイド](../../docs/SSOT_GUIDE.md) (作成予定)
