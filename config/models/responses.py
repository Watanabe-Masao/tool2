#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
レスポンスモデル定義

設計原則:
- SSOT: レスポンスモデルを一箇所で定義
- 関心の分離: レスポンスデータの構造のみを定義
- 標準化: 一貫したレスポンス形式
"""

from typing import Optional
from pydantic import BaseModel, Field


class TemplateResponse(BaseModel):
    """
    テンプレート生成レスポンス

    Attributes:
        success: 処理成功フラグ
        message: ユーザー向けメッセージ
        download_url: ダウンロードURL（成功時のみ）
        filename: 生成されたファイル名（成功時のみ）
    """

    success: bool = Field(..., description="処理成功フラグ")
    message: str = Field(..., description="ユーザー向けメッセージ")
    download_url: Optional[str] = Field(default=None, description="ダウンロードURL")
    filename: Optional[str] = Field(default=None, description="生成されたファイル名")


class ErrorResponse(BaseModel):
    """
    エラーレスポンス

    Attributes:
        error: エラーメッセージ
        detail: エラー詳細（オプション）
        error_type: エラータイプ（デフォルト: "GeneralError"）
    """

    error: str = Field(..., description="エラーメッセージ")
    detail: Optional[str] = Field(default=None, description="エラー詳細")
    error_type: str = Field(default="GeneralError", description="エラータイプ")
