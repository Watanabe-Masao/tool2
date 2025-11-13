#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
配分表テンプレート作成WebアプリケーションAPI
FastAPIを使用したバックエンドサーバー
"""

import os
import io
import uuid
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import StreamingResponse, HTMLResponse, FileResponse
from fastapi import Request

# モデルのインポート (Phase 1.2: モデルの分離)
from config.models import (
    ProductDataRequest,
    TemplateRequest,
    TemplateResponse
)

# サービスのインポート (Phase 1.3: サービス層の作成)
from config.services import ExcelService, PDFService


# アプリケーションバージョン（静的ファイルのキャッシュバスティング用）
APP_VERSION = "2.2.1"

# FastAPIアプリケーション初期化
app = FastAPI(
    title="配分表テンプレート作成API",
    description="Excelの配分表テンプレートを生成するWebアプリケーション",
    version=APP_VERSION
)

# 静的ファイルとテンプレートの設定
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# キャッシュ制御ミドルウェア
@app.middleware("http")
async def add_cache_control_header(request: Request, call_next):
    """
    静的ファイルにCache-Controlヘッダーを追加
    バージョンクエリパラメータがある場合は長期間キャッシュ
    """
    response = await call_next(request)

    # 静的ファイルの場合
    if request.url.path.startswith("/static/"):
        # バージョンパラメータがある場合は1年間キャッシュ
        if "v=" in request.url.query:
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        else:
            # バージョンパラメータがない場合は短期間のみキャッシュ
            response.headers["Cache-Control"] = "public, max-age=3600"

    return response

# 一時ファイル保存ディレクトリ
TEMP_DIR = Path("temp_files")
TEMP_DIR.mkdir(exist_ok=True)


# ============================================================
# API Endpoints
# ============================================================

@app.get("/api/health")
async def health_check():
    """
    ヘルスチェックエンドポイント
    Renderがサーバーの状態を確認するために使用
    """
    return {
        "status": "healthy",
        "version": APP_VERSION,
        "service": "tool2"
    }


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """
    ルートページ - フロントエンドUIを表示
    """
    response = templates.TemplateResponse("index.html", {
        "request": request,
        "version": APP_VERSION
    })
    # HTMLページはキャッシュしない（常に最新版を取得）
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """
    ログインページ
    """
    response = templates.TemplateResponse("login.html", {
        "request": request
    })
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.post("/api/generate", response_model=TemplateResponse)
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
            temp_dir=TEMP_DIR,
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


@app.get("/api/download/{file_id}")
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
        temp_path = TEMP_DIR / f"{file_id}.xlsx"

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


@app.post("/api/preview")
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
        temp_pdf_path = TEMP_DIR / f"{file_id}.pdf"

        # テンプレート生成
        print(f"[DEBUG] Creating Excel template...")
        temp_excel_path, _ = ExcelService.create_template(
            temp_dir=TEMP_DIR,
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


@app.get("/api/health")
@app.head("/api/health")
async def health_check():
    """
    ヘルスチェックエンドポイント（GET/HEADメソッド対応）
    """
    return {"status": "ok", "message": "API is running"}


@app.get("/api/version")
async def get_version():
    """
    現在のアプリケーションバージョンを返す
    """
    return {
        "version": APP_VERSION,
        "pdf_preview_available": True,
        "cache_busting_enabled": True
    }


@app.get("/api/firebase-config")
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


@app.head("/")
async def root_head():
    """
    ルートパスのHEADリクエスト対応（Renderヘルスチェック用）
    """
    return Response(status_code=200)


@app.on_event("startup")
async def startup_event():
    """
    アプリケーション起動時の処理
    """
    port = os.getenv("PORT", "8000")
    print("=" * 60)
    print("配分表テンプレート作成Webアプリケーションを起動しました")
    print(f"PORT: {port}")
    print("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """
    アプリケーション終了時の処理 - 一時ファイルのクリーンアップ
    """
    print("一時ファイルをクリーンアップ中...")
    try:
        for file in TEMP_DIR.glob("*.xlsx"):
            file.unlink()
        for file in TEMP_DIR.glob("*.pdf"):
            file.unlink()
        print("クリーンアップ完了")
    except Exception as e:
        print(f"クリーンアップ中にエラーが発生: {e}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
