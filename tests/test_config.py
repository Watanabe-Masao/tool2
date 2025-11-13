#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
設定管理のテスト

テスト駆動リファクタリング:
- 設定クラスが正しく初期化されることを確認
- デフォルト値が正しく設定されることを確認
- 一時ディレクトリが自動作成されることを確認
"""

import pytest
from pathlib import Path
import tempfile
import shutil
from config.config import Settings


class TestSettings:
    """設定クラスのテスト"""

    def test_default_values(self):
        """デフォルト値が正しく設定されること"""
        settings = Settings()

        # アプリケーション設定
        assert settings.app_name == "配分表テンプレート作成API"
        assert settings.app_version == "2.2.1"
        assert settings.debug == False

        # Excel設定
        assert settings.max_products == 100
        assert settings.pixel_100 == 13.5714285714
        assert settings.pixel_50 == 6.4285714286

        # LibreOffice設定
        assert settings.libreoffice_timeout == 30

    def test_temp_dir_creation(self):
        """一時ディレクトリが自動作成されること"""
        # テスト用の一時ディレクトリ
        test_temp_dir = Path(tempfile.mkdtemp()) / "test_temp"

        # 存在しないディレクトリを指定
        assert not test_temp_dir.exists()

        # Settingsインスタンス作成
        settings = Settings(temp_dir=test_temp_dir)

        # ディレクトリが作成されることを確認
        assert settings.temp_dir.exists()
        assert settings.temp_dir.is_dir()

        # クリーンアップ
        shutil.rmtree(test_temp_dir.parent)

    def test_temp_dir_default_value(self):
        """temp_dirのデフォルト値が正しいこと"""
        settings = Settings()
        assert settings.temp_dir == Path("temp_files")

    def test_cache_settings(self):
        """キャッシュ設定が正しいこと"""
        settings = Settings()
        assert settings.cache_max_age_with_version == 31536000  # 1年
        assert settings.cache_max_age_without_version == 3600    # 1時間

    def test_file_age_setting(self):
        """ファイル保持期間の設定が正しいこと"""
        settings = Settings()
        assert settings.max_file_age_hours == 24
