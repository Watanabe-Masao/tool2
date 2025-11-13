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
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, FileResponse

from config.config import settings
from config.models import TemplateRequest, TemplateResponse
from config.services import ExcelService, PDFService


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
        raise HTTPException(
            status_code=500,
            detail=f"テンプレート生成中にエラーが発生しました: {str(e)}"
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
    """
    try:
        # ファイルパス取得
        temp_path = settings.temp_dir / f"{file_id}.xlsx"

        if not temp_path.exists():
            raise HTTPException(
                status_code=404,
                detail="ファイルが見つかりません"
            )

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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"ファイルのダウンロード中にエラーが発生しました: {str(e)}"
        )


@router.post("/preview")
async def preview_template(req: TemplateRequest):
    """
    テンプレートのPDFプレビューを生成

    Args:
        req: テンプレート生成リクエスト

    Returns:
        FileResponse: PDFファイル
    """
    import traceback

    try:
        # 一時ファイルパス
        file_id = str(uuid.uuid4())
        temp_pdf_path = settings.temp_dir / f"{file_id}.pdf"

        # テンプレート生成
        print(f"[DEBUG] Creating Excel template...")
        temp_excel_path, _ = ExcelService.create_template(
            temp_dir=settings.temp_dir,
            request=req,
            file_id=file_id
        )
        print(f"[DEBUG] Excel template created: {temp_excel_path.exists()}")

        # PDF変換用にExcelを最適化（非表示列を削除）
        print(f"[DEBUG] Preparing Excel for PDF conversion...")
        PDFService.prepare_for_conversion(temp_excel_path)

        # ExcelをPDFに変換（LibreOffice使用）
        print(f"[DEBUG] Converting Excel to PDF using LibreOffice...")
        PDFService.convert_to_pdf(temp_excel_path, temp_pdf_path)
        print(f"[DEBUG] PDF created: {temp_pdf_path.exists()}")

        if not temp_pdf_path.exists():
            raise Exception("PDFファイルが生成されませんでした")

        # PDFを返す
        return FileResponse(
            path=str(temp_pdf_path),
            media_type="application/pdf",
            filename="preview.pdf",
            headers={
                "Content-Disposition": "inline; filename=preview.pdf"
            }
        )

    except Exception as e:
        error_detail = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        print(f"[ERROR] PDF preview generation failed:\n{error_detail}")
        raise HTTPException(
            status_code=500,
            detail=f"PDFプレビュー生成中にエラーが発生しました: {str(e)}"
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
    """
    firebase_config = {
        "apiKey": os.getenv("FIREBASE_API_KEY", "AIzaSyCjuPCpB0wqHxdX4JWL6VnEj1LJWgr4cKc"),
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN", "haibun-distribution.firebaseapp.com"),
        "projectId": os.getenv("FIREBASE_PROJECT_ID", "haibun-distribution"),
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", "haibun-distribution.firebasestorage.app"),
        "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID", "742220611313"),
        "appId": os.getenv("FIREBASE_APP_ID", "1:742220611313:web:bec0f006c4c648adcbb350")
    }

    return firebase_config
