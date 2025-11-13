#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
APIルーター定義

設計原則:
- 関心の分離: APIエンドポイントをアプリケーション初期化から分離
- 責務の明確化: ルーティングとビジネスロジックの分離
- 保守性: エンドポイントを一箇所で管理
"""

import os
import io
import uuid
import logging
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, FileResponse

from config.config import settings
from config.models import TemplateRequest, TemplateResponse
from config.services import ExcelService, PDFService
from config.exceptions import (
    TemplateCreationError,
    PDFConversionError,
    FileNotFoundError as AppFileNotFoundError,
    ConfigurationError
)

# ロガー設定
logger = logging.getLogger(__name__)


# APIルーター
router = APIRouter(prefix="/api", tags=["api"])


@router.post("/generate", response_model=TemplateResponse)
async def generate_template(req: TemplateRequest):
    """
    テンプレート生成API

    Args:
        req: テンプレート生成リクエスト

    Returns:
        TemplateResponse: 生成結果とダウンロードURL

    Raises:
        TemplateCreationError: テンプレート生成失敗時
    """
    try:
        # ファイル名の生成
        filename = ExcelService.generate_filename(req.output_filename)

        # テンプレート生成
        output_path, file_id = ExcelService.create_template(
            temp_dir=settings.temp_dir,
            request=req
        )

        # ダウンロードURL生成
        download_url = f"/api/download/{file_id}?filename={filename}"

        return TemplateResponse(
            success=True,
            message="テンプレートの生成に成功しました",
            download_url=download_url,
            filename=filename
        )

    except Exception as e:
        # カスタム例外を使用（統一ハンドラーで処理）
        raise TemplateCreationError(
            message="テンプレート生成中にエラーが発生しました",
            detail=str(e)
        )


@router.get("/download/{file_id}")
async def download_template(file_id: str, filename: str = "配分表_テンプレート.xlsx"):
    """
    生成されたテンプレートファイルをダウンロード

    Args:
        file_id: ファイルID
        filename: ダウンロード時のファイル名

    Returns:
        StreamingResponse: Excelファイル

    Raises:
        AppFileNotFoundError: ファイルが存在しない場合
    """
    # ファイルパス取得
    temp_path = settings.temp_dir / f"{file_id}.xlsx"

    if not temp_path.exists():
        raise AppFileNotFoundError(
            message="ファイルが見つかりません",
            detail=f"ファイルID: {file_id}"
        )

    try:
        # ファイルを読み込み
        with open(temp_path, "rb") as f:
            file_content = f.read()

        # 注意: ファイルは削除せず、複数回ダウンロード可能にする
        # クリーンアップはshutdownイベントで実行される

        # 日本語ファイル名のエンコード（RFC 5987対応）
        # ASCIIフォールバック用にtemplate.xlsxを設定
        encoded_filename = quote(filename.encode('utf-8'))

        # ストリーミングレスポンス
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                # RFC 5987形式: ASCIIフォールバック + UTF-8エンコード
                "Content-Disposition": f"attachment; filename=\"template.xlsx\"; filename*=UTF-8''{encoded_filename}"
            }
        )

    except AppFileNotFoundError:
        # カスタム例外をそのまま伝播
        raise
    except Exception as e:
        # その他のエラーは汎用エラーとして扱う
        logger.error(f"Download error: {e}", exc_info=True)
        raise TemplateCreationError(
            message="ファイルのダウンロード中にエラーが発生しました",
            detail=str(e)
        )


@router.post("/preview")
async def preview_template(req: TemplateRequest):
    """
    テンプレートのPDFプレビューを生成

    Args:
        req: テンプレート生成リクエスト

    Returns:
        FileResponse: PDFファイル

    Raises:
        PDFConversionError: PDF生成失敗時
    """
    try:
        # 一時ファイルパス
        file_id = str(uuid.uuid4())
        temp_pdf_path = settings.temp_dir / f"{file_id}.pdf"

        # テンプレート生成
        logger.debug("Creating Excel template...")
        temp_excel_path, _ = ExcelService.create_template(
            temp_dir=settings.temp_dir,
            request=req,
            file_id=file_id
        )
        logger.debug(f"Excel template created: {temp_excel_path.exists()}")

        # PDF変換用にExcelを最適化（非表示列を削除）
        logger.debug("Preparing Excel for PDF conversion...")
        PDFService.prepare_for_conversion(temp_excel_path)

        # ExcelをPDFに変換（LibreOffice使用）
        logger.debug("Converting Excel to PDF using LibreOffice...")
        PDFService.convert_to_pdf(temp_excel_path, temp_pdf_path)
        logger.debug(f"PDF created: {temp_pdf_path.exists()}")

        if not temp_pdf_path.exists():
            raise PDFConversionError(
                message="PDFファイルが生成されませんでした",
                detail="LibreOffice変換が完了しましたが、ファイルが見つかりません"
            )

        # PDFを返す
        return FileResponse(
            path=str(temp_pdf_path),
            media_type="application/pdf",
            filename="preview.pdf",
            headers={
                "Content-Disposition": "inline; filename=preview.pdf"
            }
        )

    except PDFConversionError:
        # カスタム例外をそのまま伝播
        raise
    except Exception as e:
        # その他のエラーはPDF変換エラーとして扱う
        logger.error(f"PDF preview generation failed: {e}", exc_info=True)
        raise PDFConversionError(
            message="PDFプレビュー生成中にエラーが発生しました",
            detail=str(e)
        )


@router.get("/health")
@router.head("/health")
async def health_check():
    """
    ヘルスチェックエンドポイント（GET/HEADメソッド対応）
    """
    return {
        "status": "healthy",
        "version": settings.app_version,
        "service": "tool2"
    }


@router.get("/version")
async def get_version():
    """
    現在のアプリケーションバージョンを返す
    """
    return {
        "version": settings.app_version,
        "pdf_preview_available": True,
        "cache_busting_enabled": True
    }


@router.get("/firebase-config")
async def get_firebase_config():
    """
    Firebaseの設定を環境変数から取得して返す
    セキュリティ向上のため、クライアント側にハードコードしない

    注意: Firebase Web SDKの仕様上、これらの設定は公開されても問題ありません。
    セキュリティはFirestore Security Rulesで制御します。

    Raises:
        HTTPException: Firebase設定が環境変数に設定されていない場合
    """
    # 必須の環境変数を取得
    api_key = os.getenv("FIREBASE_API_KEY")
    auth_domain = os.getenv("FIREBASE_AUTH_DOMAIN")
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET")
    messaging_sender_id = os.getenv("FIREBASE_MESSAGING_SENDER_ID")
    app_id = os.getenv("FIREBASE_APP_ID")

    # 環境変数の検証
    missing_vars = []
    if not api_key:
        missing_vars.append("FIREBASE_API_KEY")
    if not auth_domain:
        missing_vars.append("FIREBASE_AUTH_DOMAIN")
    if not project_id:
        missing_vars.append("FIREBASE_PROJECT_ID")
    if not storage_bucket:
        missing_vars.append("FIREBASE_STORAGE_BUCKET")
    if not messaging_sender_id:
        missing_vars.append("FIREBASE_MESSAGING_SENDER_ID")
    if not app_id:
        missing_vars.append("FIREBASE_APP_ID")

    if missing_vars:
        raise ConfigurationError(
            message="Firebase設定が不完全です",
            detail=f"以下の環境変数を設定してください: {', '.join(missing_vars)}"
        )

    firebase_config = {
        "apiKey": api_key,
        "authDomain": auth_domain,
        "projectId": project_id,
        "storageBucket": storage_bucket,
        "messagingSenderId": messaging_sender_id,
        "appId": app_id
    }

    return firebase_config
