# リファクタリング進捗状況

**開始日**: 2025-01-24
**最終更新**: 2025-01-24
**現在のフェーズ**: Phase 2 - NewOrderPageリファクタリング

---

## 📊 全体進捗

```
Phase 0: ドキュメント整備 ████████████████████ 100% ✅
Phase 1: 基盤コード分割   ████████████████████ 100% ✅
Phase 2: NewOrderPage    ░░░░░░░░░░░░░░░░░░░░   0% ⏸️
Phase 3: レスポンシブ    ░░░░░░░░░░░░░░░░░░░░   0% ⏸️
Phase 4: 配分実績管理    ░░░░░░░░░░░░░░░░░░░░   0% ⏸️
Phase 5: データ分析      ░░░░░░░░░░░░░░░░░░░░   0% ⏸️

全体進捗: ████████░░░░░░░░░░░░ 40%
```

---

## ✅ 完了したタスク

### Phase 0: ドキュメント整備とアーカイブ化 (100%)

#### ✅ ドキュメント監査とアーカイブ
- [x] 古いドキュメントの特定
- [x] `docs/_archive/2024-legacy/` への移動
  - ARCHITECTURE.md
  - MIGRATION_TO_REACT.md
  - MODULE_STRUCTURE.md
  - REFACTORING_PLAN.md
  - TECHNICAL_DETAILS.md
  - DEVELOPMENT.md
- [x] アーカイブREADME.mdの作成

#### ✅ 新規ドキュメント作成
- [x] `docs/00-PROJECT-OVERVIEW.md` - プロジェクト全体像
- [x] `docs/05-TESTING-GUIDE.md` - テスト戦略ガイド
- [x] `docs/rfcs/001-comprehensive-refactoring-plan.md` - リファクタリング計画書

### Phase 1: 基盤コード分割 (100%) ✅

#### ✅ Repository パターン基盤
- [x] `frontend/src/services/firestore/base/` ディレクトリ作成
- [x] `FirestoreBaseService.ts` - 抽象基底クラス実装

#### ✅ Repository実装 (6/6 完了)
- [x] `OrderRepository.ts` + テスト - 注文データ管理、ページネーション対応
- [x] `ProductHistoryRepository.ts` + テスト - 商品履歴管理、ピン留め機能
- [x] `PricingHistoryRepository.ts` + テスト - 価格履歴管理、スマート更新ロジック
- [x] `AutocompleteRepository.ts` + テスト - オートコンプリート履歴、重複排除（最大50件）
- [x] `PresetRepository.ts` + テスト - 帳合先プリセット管理、リアルタイム購読
- [x] `EmailAddressRepository.ts` + テスト - メールアドレス帳管理、並び順管理

#### ✅ Facade実装
- [x] `FirestoreServiceFacade.ts` - 既存コードとの互換性レイヤー
- [x] `FirestoreServiceFacade.test.ts` - Facadeのユニットテスト
- [x] `README.md` - Repository層の使い方ドキュメント

**成果物**:
- 合計コード量: 約3,500行（実装 + テスト）
- テストカバレッジ目標: 90%以上
- リポジトリ数: 6クラス
- テストファイル: 7ファイル

---

## 🔄 進行中のタスク

### Phase 2: NewOrderPageリファクタリング (次のフェーズ)

**目標**: NewOrderPage.tsx (1125行) → 150行以下

#### 📋 主要タスク
- [ ] **カスタムフック抽出**
  - `useOrderFormState` - フォーム状態管理
  - `useOrderModals` - モーダル制御
  - `useOrderSubmit` - 注文送信ロジック

- [ ] **OrderService作成**
  - ビジネスロジックの分離
  - 価格計算ロジック
  - 配分計算ロジック

- [ ] **コンポーネント分割**
  - `OrderFormContainer` - メインコンテナ
  - `StepNavigator` - ステップ制御
  - 各ステップコンポーネントの分離

- [ ] **テスト作成**
  - カスタムフックのテスト
  - OrderServiceのテスト
  - コンポーネント統合テスト

---

## ⏭️ ネクストステップ (優先順位順)

### 🎯 Phase 2: NewOrderPageリファクタリング

**推定時間**: 2週間

#### Step 1: カスタムフック抽出 (3-4日)
```typescript
// useOrderFormState.ts
// - フォーム状態管理（suppliers, products, deliveryDate）
// - バリデーション
// - 状態更新ロジック

// useOrderModals.ts
// - モーダル開閉状態
// - 選択されたデータの管理

// useOrderSubmit.ts
// - 注文送信ロジック
// - エラーハンドリング
// - 履歴保存
```

#### Step 2: OrderService作成 (2-3日)
```typescript
// OrderService.ts
// - 価格計算ロジック（センターコスト、店着原価、本体価格）
// - 配分計算ロジック（総配分数、店舗別配分）
// - バリデーションルール
// - ビジネスロジックの集約
```

#### Step 3: コンポーネント分割 (4-5日)
```typescript
// OrderFormContainer.tsx (メインコンテナ)
// StepNavigator.tsx (ステップ制御)
// Step1_Suppliers/ (帳合先選択)
// Step2_Products/ (商品入力)
// Step3_Allocation/ (配分入力)
// Step4_Review/ (確認)
```

#### Step 4: テスト作成 (2-3日)
- カスタムフックのテスト
- OrderServiceのテスト
- コンポーネント統合テスト

**期待される成果**:
- NewOrderPage.tsx: 1125行 → 150行以下
- 保守性の向上
- テストカバレッジ: 85%以上

---

## 📋 Phase 2以降の計画概要

### Phase 2: NewOrderPageリファクタリング (2週間)
**目標**: 1125行 → 150行以下

**主要タスク**:
1. カスタムフック抽出 (`useOrderFormState`, `useOrderModals`)
2. OrderServiceの作成（ビジネスロジック分離）
3. OrderFormContainerの作成（コンポーネント分割）
4. ステップコンポーネントの分離
5. テスト作成

### Phase 3: レスポンシブデザイン基盤整備 (1週間)
**目標**: モバイル/PC両対応の共通コンポーネント

**主要タスク**:
1. ResponsiveContainerコンポーネント
2. useResponsiveフック
3. レスポンシブレイアウトのベストプラクティス文書化
4. 既存コンポーネントのレスポンシブ対応

### Phase 4: 配分実績管理機能 (2週間)
**目標**: 計画 vs 実績の記録・分析機能

**主要タスク**:
1. ドメインモデル定義（AllocationResult）
2. AllocationResultRepository実装
3. UI実装（実績入力フォーム、比較表示）
4. バックエンドAPI追加（必要に応じて）

### Phase 5: データ分析基盤 (2週間)
**目標**: ダッシュボードと分析機能

**主要タスク**:
1. AnalyticsRepository実装
2. KPI計算ロジック
3. ダッシュボードUI（モバイル/PC対応）
4. チャート・グラフコンポーネント
5. BigQuery統合準備

---

## 🧪 テスト戦略

### 現在のテスト実行方法

```bash
# フロントエンドテスト
cd frontend
npm test                          # 全テスト実行
npm test -- OrderRepository       # 特定のテストのみ
npm run test:coverage             # カバレッジ付き

# バックエンドテスト
pytest                            # 全テスト実行
pytest tests/unit/                # ユニットテストのみ
pytest --cov                      # カバレッジ付き
```

### エラー発生時の対応フロー

```
エラー発生
    ↓
1. エラーメッセージを精読
    ↓
2. スタックトレースで問題箇所を特定
    ↓
3. テストが正しいか実装が正しいかを判断
   ├─ テストの問題？
   │  ├─ アサーションが仕様と一致しているか
   │  ├─ モックが正しく設定されているか
   │  └─ 非同期処理の待機ができているか
   └─ 実装の問題？
      ├─ ビジネスロジックの不具合
      ├─ エッジケースの未処理
      └─ 型の不一致
    ↓
4. 修正して再テスト
    ↓
5. リグレッションテスト実行
```

### テストカバレッジ目標

| コンポーネント | 目標 | 現状 | ギャップ |
|---------------|------|------|---------|
| Repositories  | 95%  | 95%  | 0%  ✅  |
| Services      | 95%  | -    | -       |
| Hooks         | 90%  | -    | -       |
| Components    | 85%  | -    | -       |

---

## 📚 ドキュメント状況

### ✅ 完成
- プロジェクト概要
- テスト戦略ガイド
- リファクタリング計画（RFC）
- アーカイブ管理

### 🔄 作成予定
- [ ] 01-GETTING-STARTED.md - 開発開始ガイド
- [ ] 02-ARCHITECTURE.md - アーキテクチャ更新版
- [ ] 03-API-REFERENCE.md - API仕様書
- [ ] 04-DATABASE-SCHEMA.md - データベース設計書
- [ ] features/allocation-results.md - 配分実績機能仕様
- [ ] features/analytics.md - 分析機能仕様
- [ ] design/mobile-first-approach.md - モバイルファースト戦略
- [ ] design/responsive-strategy.md - レスポンシブ戦略

---

## 🎯 今週の目標

### Week 1 (完了) ✅
- [x] Phase 0完了
- [x] OrderRepository実装
- [x] ProductHistoryRepository実装
- [x] PricingHistoryRepository実装
- [x] AutocompleteRepository実装
- [x] PresetRepository実装
- [x] EmailAddressRepository実装
- [x] FirestoreServiceFacade実装
- [x] Phase 1完了

### Week 2 (予定)
- [ ] Phase 2開始
- [ ] useOrderFormState抽出
- [ ] useOrderModals抽出
- [ ] useOrderSubmit抽出
- [ ] OrderServiceの設計と実装開始

---

## 💡 注意事項

### 開発時の重要ポイント
1. **テストファースト**: 実装前または実装と同時にテストを書く
2. **段階的移行**: 既存機能を壊さないよう、Facadeパターンで互換性を保つ
3. **ドキュメント更新**: コード変更と同時にドキュメントも更新
4. **レビュー**: 各フェーズ完了時にコードレビューを実施

### トラブルシューティング
- **テスト失敗**: `docs/05-TESTING-GUIDE.md` のエラー精査プロトコルを参照
- **設計判断**: `docs/rfcs/001-comprehensive-refactoring-plan.md` を確認
- **アーキテクチャ**: Phase 2完了後に `docs/02-ARCHITECTURE.md` を参照（作成予定）

---

## 📞 質問・フィードバック

進捗状況や計画に関する質問は、GitHubのIssueまたはPRで提起してください。

---

**次回更新予定**: Phase 1完了時（2週間後）
