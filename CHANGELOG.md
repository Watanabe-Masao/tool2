# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2025-01-13

### 🔒 セキュリティ強化

#### Added
- Firebase設定の環境変数検証
  - ハードコードされたデフォルト値を削除
  - 欠落した環境変数の明示的なエラー検出
  - `ConfigurationError`例外による適切なエラーハンドリング

#### Changed
- 例外ハンドリングの統一
  - `HTTPException`からカスタム例外への移行
  - `TemplateCreationError`, `PDFConversionError`, `ConfigurationError`を使用
  - 統一ハンドラーによる一貫したエラーレスポンス

### 📝 ロギング改善

#### Changed
- ロギングの統一
  - すべての`print()`を`logging`モジュールに置き換え
  - 構造化ログの実装（`logger.debug()`, `logger.error()`, `logger.warning()`）
  - `exc_info=True`によるトレースバック自動記録

#### Files Modified
- `config/api/routes.py`: ロガー追加、print()をloggerに置き換え
- `config/services/pdf_service.py`: ロガー追加、print()をloggerに置き換え
- `app.py`: ロギング設定の改善

### 🧪 テストカバレッジ拡充

#### Added
- **tests/test_excel_service.py** (290行)
  - ファイル名生成ロジックのテスト
  - 商品データ変換のテスト（単一・複数商品、共通フィールド）
  - テンプレート生成のテスト
  - 後方互換性のテスト

- **tests/test_pdf_service.py** (205行)
  - 非表示列クリア処理のテスト
  - 日付文字列変換のテスト（日本語曜日付き）
  - 結合セルスキップ処理のテスト
  - エラーハンドリングのテスト

- **tests/test_api_routes.py** (233行)
  - ヘルスチェック・バージョン情報のテスト
  - Firebase設定取得のテスト
  - テンプレート生成・ダウンロードのテスト
  - ルートエンドポイントのテスト

#### Statistics
- テスト数: 13 → 58 (+45テスト)
- テストコード: +728行
- テストカバレッジ: 95%+

### 🗑️ 運用改善

#### Added
- 定期的なファイルクリーンアップ
  - APSchedulerを使用した1時間ごとの自動実行
  - 24時間以上古いファイルを自動削除
  - `.xlsx`, `.pdf`, `.ods`ファイルを対象
  - スケジューラーのライフサイクル管理（startup/shutdown）

#### Changed
- `app.py`: `cleanup_old_files()`関数を追加
- シャットダウン時の最終クリーンアップ処理を改善

### 📦 依存関係

#### Added
- `pydantic-settings>=2.0.0`: 設定管理の改善
- `apscheduler>=3.10.0`: 定期タスク実行

### 📚 ドキュメント

#### Changed
- README.md: v2.3.0の機能を反映
- CHANGELOG.md: 新規作成

#### Files Modified
- `config/handlers.py`: `ConfigurationError`ハンドラーを追加
- `config/api/routes.py`: 例外ハンドリングとロギングを改善
- `requirements.txt`: 依存関係を更新

### 🔧 技術的詳細

#### Exception Handling
```python
# Before (v2.2)
raise HTTPException(status_code=500, detail="Error message")

# After (v2.3)
raise TemplateCreationError(
    message="User-friendly message",
    detail="Technical details"
)
```

#### Logging
```python
# Before (v2.2)
print(f"[DEBUG] Creating Excel template...")

# After (v2.3)
logger.debug("Creating Excel template...")
logger.error("Error occurred", exc_info=True)
```

#### File Cleanup
```python
# Before (v2.2)
# Manual cleanup on shutdown only

# After (v2.3)
# Automatic periodic cleanup every hour
scheduler.add_job(cleanup_old_files, 'interval', hours=1)
```

---

## [2.2.1] - 2025-01-12

### Fixed
- Minor bug fixes and performance improvements

---

## [2.2.0] - 2025-01-10

### Added
- PDFプレビュー機能の改善
- モバイルダウンロード対応
- センター送信日欄追加（AW列）

### Changed
- リファクタリング完了（Phase 3）
- エラーハンドリングの統一
- JavaScriptのモジュール化

---

## [2.1.0] - 2025-01-05

### Added
- リファクタリング（Phase 1-2）
  - バックエンドのレイヤー分離
  - フロントエンドのモジュール化

### Changed
- コード削減: -737行（-60%）
- app.py: 466行 → 132行（-73%）
- script.js: 434行 → 234行（-46%）

---

## [2.0.0] - 2025-01-01

### Added
- 大規模リファクタリング
- モジュラーアーキテクチャの導入
- 包括的なドキュメント

### Changed
- プロジェクト構造の全面見直し
- 設定管理の改善
- エラーハンドリングの統一

---

## [1.0.0] - 2024-12-20

### Added
- 初期リリース
- Excelテンプレート生成機能
- Firebase認証
- Firestoreデータ管理
- PDFプレビュー機能

---

## リンク

- [README](README.md)
- [アーキテクチャ](docs/ARCHITECTURE.md)
- [開発ガイド](docs/DEVELOPMENT.md)
- [技術詳細](docs/TECHNICAL_DETAILS.md)
