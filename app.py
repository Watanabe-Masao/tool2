#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
配分表テンプレート作成WebアプリケーションAPI
FastAPIを使用したバックエンドサーバー
"""

import os
import logging
from datetime import datetime, timedelta

from fastapi import FastAPI, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Request
from apscheduler.schedulers.background import BackgroundScheduler

# APIルーターのインポート (Phase 1.4: APIエンドポイントの分離)
from config.api import router

# 設定のインポート
from config.config import settings

# 例外ハンドラーのインポート (Phase 3: エラーハンドリング統一)
from config.handlers import register_exception_handlers

# ロガー設定（モジュールレベル）
logger = logging.getLogger(__name__)

# バックグラウンドスケジューラー
scheduler = BackgroundScheduler()


# ============================================================
# ファイルクリーンアップ
# ============================================================

def cleanup_old_files():
    """
    古い一時ファイルを削除

    設定されたmax_file_age_hoursより古いファイルを削除します。
    """
    try:
        cutoff_time = datetime.now() - timedelta(hours=settings.max_file_age_hours)
        cutoff_timestamp = cutoff_time.timestamp()

        deleted_count = 0
        for pattern in ["*.xlsx", "*.pdf", "*.ods"]:
            for file in settings.temp_dir.glob(pattern):
                try:
                    if file.stat().st_mtime < cutoff_timestamp:
                        file.unlink()
                        deleted_count += 1
                        logger.debug(f"Deleted old file: {file.name}")
                except Exception as e:
                    logger.warning(f"Failed to delete file {file.name}: {e}")

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old temporary files")
    except Exception as e:
        logger.error(f"Error during file cleanup: {e}", exc_info=True)

# FastAPIアプリケーション初期化
app = FastAPI(
    title="配分表テンプレート作成API",
    description="Excelの配分表テンプレートを生成するWebアプリケーション",
    version=settings.app_version
)

# 例外ハンドラーを登録 (Phase 3: エラーハンドリング統一)
register_exception_handlers(app)

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
    # ログ設定 (Phase 3: エラーハンドリング統一)
    log_level = logging.DEBUG if settings.debug else logging.INFO
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    port = os.getenv("PORT", "8000")
    logger.info("=" * 60)
    logger.info("配分表テンプレート作成Webアプリケーションを起動しました")
    logger.info(f"PORT: {port}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"App version: {settings.app_version}")
    logger.info("=" * 60)

    # 定期的なファイルクリーンアップジョブを開始（1時間ごと）
    scheduler.add_job(
        cleanup_old_files,
        'interval',
        hours=1,
        id='cleanup_old_files',
        name='古い一時ファイルのクリーンアップ',
        replace_existing=True
    )
    scheduler.start()
    logger.info(f"Started periodic file cleanup job (every 1 hour, max age: {settings.max_file_age_hours} hours)")


@app.on_event("shutdown")
async def shutdown_event():
    """
    アプリケーション終了時の処理
    """
    # スケジューラーを停止
    logger.info("Shutting down periodic cleanup scheduler...")
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")

    # 最終クリーンアップを実行
    logger.info("一時ファイルをクリーンアップ中...")
    try:
        deleted_count = 0
        for pattern in ["*.xlsx", "*.pdf", "*.ods"]:
            for file in settings.temp_dir.glob(pattern):
                try:
                    file.unlink()
                    deleted_count += 1
                except Exception as e:
                    logger.warning(f"Failed to delete file {file.name}: {e}")

        logger.info(f"クリーンアップ完了 ({deleted_count} files deleted)")
    except Exception as e:
        logger.error(f"クリーンアップ中にエラーが発生: {e}", exc_info=True)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
