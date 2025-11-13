#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
アプリケーション設定管理

設計原則:
- SSOT (Single Source of Truth): 設定値を一箇所で管理
- 変更容易性: 環境変数による設定変更をサポート
- セキュリティ設計: 機密情報は環境変数から読み込み
"""

from pathlib import Path
from typing import Optional

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    # pydantic_settings がない場合は pydantic v1 の BaseSettings を使用
    from pydantic import BaseSettings
    SettingsConfigDict = None


class Settings(BaseSettings):
    """
    アプリケーション設定クラス

    環境変数または.envファイルから設定を読み込みます。
    環境変数が設定されていない場合はデフォルト値を使用します。
    """

    # アプリケーション設定
    app_name: str = "配分表テンプレート作成API"
    app_version: str = "2.2.1"
    debug: bool = False

    # ファイル設定
    temp_dir: Path = Path("temp_files")
    max_file_age_hours: int = 24

    # Excel設定
    max_products: int = 100
    pixel_100: float = 13.5714285714  # 100ピクセル
    pixel_50: float = 6.4285714286    # 50ピクセル

    # LibreOffice設定
    libreoffice_timeout: int = 30  # PDF変換タイムアウト（秒）

    # キャッシュ設定
    cache_max_age_with_version: int = 31536000  # 1年（秒）
    cache_max_age_without_version: int = 3600   # 1時間（秒）

    # Pydantic V2 設定（ConfigDict使用）
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="",  # 環境変数の接頭辞
    ) if SettingsConfigDict else None

    # Pydantic V1 互換性（SettingsConfigDictがない場合）
    if not SettingsConfigDict:
        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8"
            env_prefix = ""

    def __init__(self, **kwargs):
        """
        設定初期化時に一時ディレクトリを作成
        """
        super().__init__(**kwargs)
        self.temp_dir.mkdir(exist_ok=True)


# グローバル設定インスタンス
settings = Settings()
