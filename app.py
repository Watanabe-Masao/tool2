#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
配分表テンプレート作成WebアプリケーションAPI
FastAPIを使用したバックエンドサーバー
"""

import os
import logging
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Response, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from apscheduler.schedulers.background import BackgroundScheduler

# 環境変数を.envファイルから読み込み（明示的にパス指定）
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

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

# 静的ファイルの設定
# React アプリのビルド成果物を配信
# Reactのビルド成果物ディレクトリ
frontend_dist = Path(__file__).parent / "frontend" / "dist"

# 古い静的ファイルもマウント（バックエンドAPIで使用する場合のため）
app.mount("/static", StaticFiles(directory="static"), name="static")


# ============================================================
# React SPA のフォールバックルーティング
# ============================================================

@app.get("/assets/{file_path:path}")
async def serve_assets(file_path: str):
    """
    Reactのアセット（JS、CSS）を配信
    """
    asset_path = frontend_dist / "assets" / file_path
    if asset_path.exists():
        return FileResponse(asset_path)
    return Response(status_code=404)


@app.head("/")
async def root_head():
    """
    ルートパスのHEADリクエスト対応（Renderヘルスチェック用）
    """
    return Response(status_code=200)


@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_react_app(full_path: str):
    """
    すべてのパスでReactアプリを配信（SPA フォールバック）
    /api/ で始まるパスは除外（APIルーターで処理）
    """
    # APIパスは除外（すでにルーターで処理される）
    if full_path.startswith("api/"):
        return Response(status_code=404)

    # React の index.html を配信
    index_path = frontend_dist / "index.html"

    # デバッグ情報をログ出力
    logger.info(f"Request path: {full_path}")
    logger.info(f"Frontend dist directory: {frontend_dist}")
    logger.info(f"Frontend dist exists: {frontend_dist.exists()}")
    logger.info(f"Index path: {index_path}")
    logger.info(f"Index exists: {index_path.exists()}")

    if frontend_dist.exists():
        logger.info(f"Contents of frontend/dist: {list(frontend_dist.iterdir())}")

    if index_path.exists():
        response = FileResponse(index_path)
        # HTMLページはキャッシュしない（常に最新版を取得）
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    # ビルドされていない場合のエラー
    error_msg = f"<h1>Frontend not built</h1><p>frontend/dist directory exists: {frontend_dist.exists()}</p><p>index.html exists: {index_path.exists()}</p>"
    logger.error(f"Frontend build not found. Dir exists: {frontend_dist.exists()}, Index exists: {index_path.exists()}")
    return HTMLResponse(
        content=error_msg,
        status_code=500
    )


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
