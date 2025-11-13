#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
例外ハンドラー

設計原則:
- 統一されたエラーレスポンス: すべてのエラーを一貫した形式で返す
- 適切なHTTPステータスコード: エラーの種類に応じた適切なコードを設定
- ログ記録: すべてのエラーをログに記録
"""

import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError

from config.exceptions import (
    AppException,
    TemplateCreationError,
    PDFConversionError,
    ValidationError,
    FileNotFoundError,
    ConfigurationError,
    ServiceError
)
from config.models.responses import ErrorResponse

# ロガー設定
logger = logging.getLogger(__name__)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """
    アプリケーション例外ハンドラー

    Args:
        request: リクエストオブジェクト
        exc: アプリケーション例外

    Returns:
        JSONResponse: エラーレスポンス
    """
    logger.error(f"Application error: {exc.message}", extra={
        "detail": exc.detail,
        "path": request.url.path,
        "method": request.method
    })

    return JSONResponse(
        status_code=400,
        content=ErrorResponse(
            error=exc.message,
            detail=exc.detail,
            error_type=exc.__class__.__name__
        ).dict()
    )


async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """
    バリデーションエラーハンドラー

    Args:
        request: リクエストオブジェクト
        exc: バリデーションエラー

    Returns:
        JSONResponse: エラーレスポンス
    """
    logger.warning(f"Validation error: {exc.message}", extra={
        "detail": exc.detail,
        "path": request.url.path
    })

    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error=exc.message,
            detail=exc.detail,
            error_type="ValidationError"
        ).dict()
    )


async def pydantic_validation_error_handler(
    request: Request,
    exc: PydanticValidationError
) -> JSONResponse:
    """
    Pydanticバリデーションエラーハンドラー

    Args:
        request: リクエストオブジェクト
        exc: Pydanticバリデーションエラー

    Returns:
        JSONResponse: エラーレスポンス
    """
    logger.warning(f"Pydantic validation error: {exc}", extra={
        "path": request.url.path
    })

    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error="入力データが正しくありません",
            detail=str(exc),
            error_type="ValidationError"
        ).dict()
    )


async def file_not_found_handler(request: Request, exc: FileNotFoundError) -> JSONResponse:
    """
    ファイル未検出ハンドラー

    Args:
        request: リクエストオブジェクト
        exc: ファイル未検出エラー

    Returns:
        JSONResponse: エラーレスポンス
    """
    logger.warning(f"File not found: {exc.message}", extra={
        "detail": exc.detail,
        "path": request.url.path
    })

    return JSONResponse(
        status_code=404,
        content=ErrorResponse(
            error=exc.message,
            detail=exc.detail,
            error_type="FileNotFoundError"
        ).dict()
    )


async def template_creation_error_handler(
    request: Request,
    exc: TemplateCreationError
) -> JSONResponse:
    """
    テンプレート生成エラーハンドラー

    Args:
        request: リクエストオブジェクト
        exc: テンプレート生成エラー

    Returns:
        JSONResponse: エラーレスポンス
    """
    logger.error(f"Template creation error: {exc.message}", extra={
        "detail": exc.detail,
        "path": request.url.path
    })

    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error=exc.message,
            detail=exc.detail,
            error_type="TemplateCreationError"
        ).dict()
    )


async def pdf_conversion_error_handler(
    request: Request,
    exc: PDFConversionError
) -> JSONResponse:
    """
    PDF変換エラーハンドラー

    Args:
        request: リクエストオブジェクト
        exc: PDF変換エラー

    Returns:
        JSONResponse: エラーレスポンス
    """
    logger.error(f"PDF conversion error: {exc.message}", extra={
        "detail": exc.detail,
        "path": request.url.path
    })

    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error=exc.message,
            detail=exc.detail,
            error_type="PDFConversionError"
        ).dict()
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    汎用例外ハンドラー

    想定外のエラーをキャッチして統一されたレスポンスを返す

    Args:
        request: リクエストオブジェクト
        exc: 例外

    Returns:
        JSONResponse: エラーレスポンス
    """
    logger.exception(f"Unhandled exception: {str(exc)}", extra={
        "path": request.url.path,
        "method": request.method
    })

    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="内部サーバーエラーが発生しました",
            detail=str(exc),
            error_type="InternalServerError"
        ).dict()
    )


def register_exception_handlers(app):
    """
    例外ハンドラーをアプリケーションに登録

    Args:
        app: FastAPIアプリケーションインスタンス
    """
    # カスタム例外ハンドラー
    app.add_exception_handler(TemplateCreationError, template_creation_error_handler)
    app.add_exception_handler(PDFConversionError, pdf_conversion_error_handler)
    app.add_exception_handler(ValidationError, validation_error_handler)
    app.add_exception_handler(FileNotFoundError, file_not_found_handler)
    app.add_exception_handler(AppException, app_exception_handler)

    # Pydantic検証エラー
    app.add_exception_handler(PydanticValidationError, pydantic_validation_error_handler)

    # 汎用例外ハンドラー（最後に登録）
    app.add_exception_handler(Exception, generic_exception_handler)

    logger.info("Exception handlers registered successfully")
