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
        download_url: ExcelダウンロードURL（成功時のみ）
        filename: 生成されたExcelファイル名（成功時のみ）
        pdf_filename: 生成されたPDFファイル名（成功時のみ）
        pdf_download_url: PDFダウンロードURL（成功時のみ）
    """

    success: bool = Field(..., description="処理成功フラグ")
    message: str = Field(..., description="ユーザー向けメッセージ")
    download_url: Optional[str] = Field(default=None, description="ExcelダウンロードURL")
    filename: Optional[str] = Field(default=None, description="生成されたExcelファイル名")
    pdf_filename: Optional[str] = Field(default=None, description="生成されたPDFファイル名")
    pdf_download_url: Optional[str] = Field(default=None, description="PDFダウンロードURL")


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
