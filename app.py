#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
配分表テンプレート作成WebアプリケーションAPI
FastAPIを使用したバックエンドサーバー
"""

import os

from fastapi import FastAPI, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Request

# APIルーターのインポート (Phase 1.4: APIエンドポイントの分離)
from config.api import router

# 設定のインポート
from config.config import settings

# FastAPIアプリケーション初期化
app = FastAPI(
    title="配分表テンプレート作成API",
    description="Excelの配分表テンプレートを生成するWebアプリケーション",
    version=settings.app_version
)

# APIルーターを登録 (Phase 1.4: APIエンドポイントの分離)
app.include_router(router)

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
            response.headers["Cache-Control"] = f"public, max-age={settings.cache_max_age_with_version}, immutable"
        else:
            # バージョンパラメータがない場合は短期間のみキャッシュ
            response.headers["Cache-Control"] = f"public, max-age={settings.cache_max_age_without_version}"

    return response


# ============================================================
# Web Pages (Templates)
# ============================================================

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """
    ルートページ - フロントエンドUIを表示
    """
    response = templates.TemplateResponse("index.html", {
        "request": request,
        "version": settings.app_version
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
        for file in settings.temp_dir.glob("*.xlsx"):
            file.unlink()
        for file in settings.temp_dir.glob("*.pdf"):
            file.unlink()
        print("クリーンアップ完了")
    except Exception as e:
        print(f"クリーンアップ中にエラーが発生: {e}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
