# ドキュメントアーカイブ

このディレクトリには、古くなったり実装と乖離したドキュメントを保管しています。

## 重要な注意事項

**このディレクトリ内のドキュメントは参照用のみです。**
現在の実装を反映していない可能性があるため、開発時には必ず最新のドキュメント（親ディレクトリ）を参照してください。

---

## アーカイブ構造

### 2024-legacy/
**アーカイブ日**: 2025-01-24
**理由**: React移行前のドキュメント

| ドキュメント | アーカイブ理由 |
|-------------|---------------|
| `ARCHITECTURE.md` | React移行前のアーキテクチャを記載 |
| `MIGRATION_TO_REACT.md` | 移行が完了したため参照不要 |
| `MODULE_STRUCTURE.md` | モジュール構造が大きく変更 |
| `REFACTORING_PLAN.md` | 旧リファクタリング計画 |
| `TECHNICAL_DETAILS.md` | 一部情報が古い |
| `DEVELOPMENT.md` | 開発手順が変更 |

### 2025-phase-reports/
**アーカイブ日**: 2025-11-30
**理由**: 開発フェーズの履歴として保管

| ドキュメント | 内容 |
|-------------|------|
| `phase-0-3-comprehensive-review.md` | フェーズ0-3の包括的レビュー |
| `phase-0-v2-extended-analysis.md` | フェーズ0の拡張分析 |
| `phase-4-7-executive-proposal.md` | フェーズ4-7の提案書 |
| `phase-4-completion-report.md` | フェーズ4完了報告 |
| `phase-5-1-completion-report.md` | フェーズ5.1完了報告 |
| `phase-5-2-completion-report.md` | フェーズ5.2完了報告 |
| `phase-6-implementation-plan.md` | フェーズ6実装計画 |
| `phase-6-completion-report.md` | フェーズ6完了報告 |

### 2025-refactoring/
**アーカイブ日**: 2025-11-30
**理由**: 過去のリファクタリング計画と報告

| ドキュメント | 内容 |
|-------------|------|
| `refactoring-completion-report.md` | リファクタリング完了報告 |
| `refactoring-plan-hooks.md` | Hooksリファクタリング計画 |
| `refactoring-plan-improvements.md` | 改善リファクタリング計画 |
| `comprehensive-redesign-plan.md` | 総合再設計計画 |
| `improvement-action-plan.md` | 改善アクションプラン |
| `VERSION_TRACKING.md` | バージョン追跡 |
| `COMPLETION_REPORT.md` | 完了報告 |
| `REFACTORING_PROGRESS.md` | リファクタリング進捗 |

### 2025-reviews/
**アーカイブ日**: 2025-11-30
**理由**: コードレビュー関連の履歴

| ドキュメント | 内容 |
|-------------|------|
| `EXECUTIVE_SUMMARY.md` | エグゼクティブサマリー |
| `ARCHITECTURE_PRINCIPLES_REVIEW.md` | アーキテクチャ原則レビュー |
| `QUICK_REFERENCE.md` | クイックリファレンス |
| `architecture-improvements.md` | アーキテクチャ改善提案 |
| `state-management-comparison.md` | 状態管理比較 |
| `testing-and-features.md` | テストと機能分析 |

### 2025-rfcs/
**アーカイブ日**: 2025-11-30
**理由**: 過去のRFC（Request for Comments）

| ドキュメント | 内容 |
|-------------|------|
| `001-comprehensive-refactoring-plan.md` | 総合リファクタリング計画RFC |

### 2025-deploy-guides/
**アーカイブ日**: 2025-11-30
**理由**: 古いデプロイガイド

| ドキュメント | 内容 |
|-------------|------|
| `QUICK_DEPLOY.md` | 簡易デプロイ手順 |
| `GOOGLE_CLOUD_SHELL_DEPLOY.md` | Google Cloud Shellデプロイ |

---

## 参照が推奨されるケース

- 過去の設計判断の背景を理解したい
- 歴史的な経緯を調査したい
- 移行前のアーキテクチャを確認したい
- フェーズごとの進捗を確認したい

## 参照が非推奨のケース

- 現在の実装方法を知りたい → 最新ドキュメントを参照
- 新機能を開発したい → 最新ドキュメントを参照
- トラブルシューティングをしたい → 最新ドキュメントを参照

---

## 最新ドキュメントの場所

| 内容 | 場所 |
|------|------|
| セットアップ | `docs/getting-started/` |
| アーキテクチャ | `docs/architecture/` |
| 開発ガイド | `docs/guides/` |
| 課題・改善 | `docs/issues/` |

---

**最終更新**: 2025-11-30
