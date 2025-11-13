#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
カスタム例外クラス

設計原則:
- 明確なエラー分類: 各例外が特定のエラーケースを表現
- 統一されたインターフェース: すべての例外が共通の基底クラスを継承
- 詳細情報の保持: エラーメッセージと詳細情報を保持
"""

from typing import Optional


class AppException(Exception):
    """
    アプリケーション基底例外

    すべてのカスタム例外の基底クラス
    """

    def __init__(self, message: str, detail: Optional[str] = None):
        """
        Args:
            message: エラーメッセージ
            detail: エラーの詳細情報（オプション）
        """
        self.message = message
        self.detail = detail
        super().__init__(self.message)


class TemplateCreationError(AppException):
    """
    テンプレート生成エラー

    Excelテンプレート生成時に発生するエラー
    """
    pass


class PDFConversionError(AppException):
    """
    PDF変換エラー

    ExcelからPDFへの変換時に発生するエラー
    """
    pass


class ValidationError(AppException):
    """
    バリデーションエラー

    入力データの検証時に発生するエラー
    """
    pass


class FileNotFoundError(AppException):
    """
    ファイル未検出エラー

    指定されたファイルが見つからない場合のエラー
    """
    pass


class ConfigurationError(AppException):
    """
    設定エラー

    アプリケーション設定に問題がある場合のエラー
    """
    pass


class ServiceError(AppException):
    """
    サービスエラー

    サービス層で発生する一般的なエラー
    """
    pass
