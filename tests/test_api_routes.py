#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
APIエンドポイントの統合テスト

テスト対象:
- /api/generate - テンプレート生成
- /api/download/{file_id} - ファイルダウンロード
- /api/preview - PDFプレビュー（LibreOffice環境のみ）
- /api/health - ヘルスチェック
- /api/version - バージョン情報
- /api/firebase-config - Firebase設定
"""

import pytest
import os
from fastapi.testclient import TestClient
from pathlib import Path
import tempfile
import shutil

from app import app
from config.config import settings


# TestClientのインスタンスを作成
client = TestClient(app)


class TestHealthAndVersion:
    """ヘルスチェックとバージョンエンドポイントのテスト"""

    def test_health_check_get(self):
        """ヘルスチェック（GET）が正常に動作すること"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert data["service"] == "tool2"

    def test_health_check_head(self):
        """ヘルスチェック（HEAD）が正常に動作すること"""
        response = client.head("/api/health")
        assert response.status_code == 200

    def test_get_version(self):
        """バージョン情報が正しく取得できること"""
        response = client.get("/api/version")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert data["version"] == settings.app_version
        assert "pdf_preview_available" in data
        assert "cache_busting_enabled" in data


class TestFirebaseConfig:
    """Firebase設定エンドポイントのテスト"""

    def test_firebase_config_success(self):
        """Firebase設定が正しく取得できること（環境変数が設定されている場合）"""
        # テスト用に環境変数を一時的に設定
        os.environ["FIREBASE_API_KEY"] = "test_api_key"
        os.environ["FIREBASE_AUTH_DOMAIN"] = "test.firebaseapp.com"
        os.environ["FIREBASE_PROJECT_ID"] = "test-project"
        os.environ["FIREBASE_STORAGE_BUCKET"] = "test.appspot.com"
        os.environ["FIREBASE_MESSAGING_SENDER_ID"] = "12345"
        os.environ["FIREBASE_APP_ID"] = "test-app-id"

        try:
            response = client.get("/api/firebase-config")
            assert response.status_code == 200
            data = response.json()
            assert data["apiKey"] == "test_api_key"
            assert data["authDomain"] == "test.firebaseapp.com"
            assert data["projectId"] == "test-project"
            assert data["storageBucket"] == "test.appspot.com"
            assert data["messagingSenderId"] == "12345"
            assert data["appId"] == "test-app-id"
        finally:
            # 環境変数をクリア
            for key in ["FIREBASE_API_KEY", "FIREBASE_AUTH_DOMAIN", "FIREBASE_PROJECT_ID",
                        "FIREBASE_STORAGE_BUCKET", "FIREBASE_MESSAGING_SENDER_ID", "FIREBASE_APP_ID"]:
                if key in os.environ:
                    del os.environ[key]

    def test_firebase_config_missing_vars(self):
        """Firebase設定が不完全な場合にエラーが返されること"""
        # 環境変数をクリア
        for key in ["FIREBASE_API_KEY", "FIREBASE_AUTH_DOMAIN", "FIREBASE_PROJECT_ID",
                    "FIREBASE_STORAGE_BUCKET", "FIREBASE_MESSAGING_SENDER_ID", "FIREBASE_APP_ID"]:
            if key in os.environ:
                del os.environ[key]

        response = client.get("/api/firebase-config")
        assert response.status_code == 500
        data = response.json()
        assert "error" in data
        assert "Firebase設定が不完全です" in data["error"]


class TestTemplateGeneration:
    """テンプレート生成エンドポイントのテスト"""

    def test_generate_template_success(self):
        """テンプレート生成が正常に動作すること"""
        request_data = {
            "delivery_date": "2025-01-15",
            "supplier": "テスト商社",
            "buyer_name": "山田太郎",
            "products": [
                {
                    "name": "りんご",
                    "origin": "青森県",
                    "standard": "10kg",
                    "store_cost": 1000.0,
                    "price": 1500.0,
                    "quantity": 10,
                    "total_delivery": 100,
                    "store_quantities": {"01": 10, "02": 20}
                }
            ]
        }

        response = client.post("/api/generate", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "download_url" in data
        assert "filename" in data
        assert data["message"] == "テンプレートの生成に成功しました"

    def test_generate_template_with_multiple_products(self):
        """複数商品のテンプレート生成が正常に動作すること"""
        request_data = {
            "delivery_date": "2025-01-15",
            "supplier": "テスト商社",
            "buyer_name": "山田太郎",
            "products": [
                {"name": "りんご"},
                {"name": "みかん"},
                {"name": "ぶどう"}
            ]
        }

        response = client.post("/api/generate", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_generate_template_with_custom_filename(self):
        """カスタムファイル名でテンプレート生成が正常に動作すること"""
        request_data = {
            "delivery_date": "2025-01-15",
            "supplier": "テスト商社",
            "output_filename": "custom_template",
            "products": [
                {"name": "りんご"}
            ]
        }

        response = client.post("/api/generate", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "custom_template.xlsx" in data["filename"]

    def test_generate_template_minimal(self):
        """最小限のデータでテンプレート生成が動作すること"""
        request_data = {
            "products": []
        }

        response = client.post("/api/generate", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestDownload:
    """ファイルダウンロードエンドポイントのテスト"""

    def test_download_success(self):
        """ファイルダウンロードが正常に動作すること"""
        # まずテンプレートを生成
        request_data = {
            "delivery_date": "2025-01-15",
            "supplier": "テスト商社",
            "products": [{"name": "りんご"}]
        }

        generate_response = client.post("/api/generate", json=request_data)
        assert generate_response.status_code == 200
        generate_data = generate_response.json()
        download_url = generate_data["download_url"]

        # ダウンロード
        download_response = client.get(download_url)
        assert download_response.status_code == 200
        assert download_response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert "Content-Disposition" in download_response.headers
        assert len(download_response.content) > 0

    def test_download_file_not_found(self):
        """存在しないファイルIDでダウンロードするとエラーが返されること"""
        response = client.get("/api/download/non-existent-id")
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "ファイルが見つかりません" in data["error"]


class TestPreview:
    """PDFプレビューエンドポイントのテスト"""

    @pytest.mark.skip(reason="LibreOfficeが必要なため、CI環境ではスキップ")
    def test_preview_success(self):
        """
        PDFプレビュー生成が正常に動作すること

        このテストはLibreOfficeがインストールされている環境でのみ実行可能
        """
        request_data = {
            "delivery_date": "2025-01-15",
            "supplier": "テスト商社",
            "products": [{"name": "りんご"}]
        }

        response = client.post("/api/preview", json=request_data)
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert len(response.content) > 0


class TestRootEndpoints:
    """ルートエンドポイントのテスト"""

    def test_root_page(self):
        """ルートページが正常に表示されること"""
        response = client.get("/")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]

    def test_root_head(self):
        """ルートページのHEADリクエストが正常に動作すること"""
        response = client.head("/")
        assert response.status_code == 200
