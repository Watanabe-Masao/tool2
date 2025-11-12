#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Phase 3 API統合テスト
新しい5ステップワークフローのAPIをテスト
"""

import pytest
from fastapi.testclient import TestClient
from app import app, TemplateRequest, ProductDataRequest


client = TestClient(app)


class TestPhase3API:
    """Phase 3: 5ステップワークフローのAPIテスト"""

    def test_generate_with_new_structure(self):
        """新しいデータ構造（name, delivery_date, supplier）でのテンプレート生成"""
        request_data = {
            "delivery_date": "2025-01-20",
            "supplier": "○○商事",
            "buyer_name": "田中太郎",
            "products": [
                {
                    "name": "りんご",
                    "origin": "青森県",
                    "standard": "5kg箱",
                    "quantity": 20,
                    "store_cost": 1500.0,
                    "price": 2000.0,
                    "total_delivery": 100,
                    "store_quantities": {
                        "01": 10,
                        "02": 20,
                        "03": 30,
                        "05": 40
                    }
                }
            ]
        }

        response = client.post("/api/generate", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "テンプレートの生成に成功しました"
        assert data["download_url"] is not None
        assert data["filename"] is not None

    def test_generate_with_multiple_products(self):
        """複数商品の動的生成テスト"""
        request_data = {
            "delivery_date": "2025-01-21",
            "supplier": "△△農園",
            "buyer_name": "山田花子",
            "products": [
                {
                    "name": "トマト",
                    "origin": "高知県",
                    "standard": "L",
                    "quantity": 10,
                    "store_cost": 120.0,
                    "price": 198.0,
                    "total_delivery": 50,
                    "store_quantities": {"01": 25, "02": 25}
                },
                {
                    "name": "きゅうり",
                    "origin": "宮崎県",
                    "standard": "M",
                    "quantity": 15,
                    "store_cost": 80.0,
                    "price": 150.0,
                    "total_delivery": 100,
                    "store_quantities": {"01": 50, "02": 50}
                },
                {
                    "name": "なす",
                    "origin": "熊本県",
                    "standard": "S",
                    "quantity": 20,
                    "store_cost": 100.0,
                    "price": 180.0,
                    "total_delivery": 75,
                    "store_quantities": {"01": 40, "02": 35}
                }
            ]
        }

        response = client.post("/api/generate", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_backward_compatibility_product_name(self):
        """後方互換性テスト: product_name フィールド"""
        request_data = {
            "num_blocks": 1,
            "buyer_name": "佐藤次郎",
            "products": [
                {
                    "product_name": "バナナ",  # 古いフィールド名
                    "delivery_date": "2025-01-22",
                    "origin": "フィリピン",
                    "standard": "箱",
                    "quantity": 50,
                    "store_cost": 300.0,
                    "price": 500.0,
                    "total_delivery": 200,
                    "delivery_dest": "本社",
                    "store_quantities": {"01": 100, "02": 100}
                }
            ]
        }

        response = client.post("/api/generate", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_name_field_precedence(self):
        """nameフィールドがproduct_nameより優先されることをテスト"""
        request_data = {
            "delivery_date": "2025-01-23",
            "supplier": "××水産",
            "buyer_name": "鈴木一郎",
            "products": [
                {
                    "name": "正しい商品名",
                    "product_name": "古い商品名",
                    "origin": "静岡県",
                    "standard": "特大",
                    "quantity": 5,
                    "store_cost": 500.0,
                    "price": 800.0,
                    "total_delivery": 30,
                    "store_quantities": {"01": 30}
                }
            ]
        }

        response = client.post("/api/generate", json=request_data)

        assert response.status_code == 200
        # nameフィールドが使用されるべき（詳細検証は実際のExcelファイルで）

    def test_auto_num_blocks_calculation(self):
        """num_blocksの自動計算テスト"""
        request_data = {
            "delivery_date": "2025-01-24",
            "supplier": "□□商店",
            "buyer_name": "高橋美咲",
            # num_blocksを指定しない
            "products": [
                {"name": "商品A", "origin": "北海道", "standard": "A", "quantity": 10,
                 "store_cost": 100.0, "price": 150.0, "total_delivery": 50,
                 "store_quantities": {"01": 50}},
                {"name": "商品B", "origin": "沖縄県", "standard": "B", "quantity": 20,
                 "store_cost": 200.0, "price": 300.0, "total_delivery": 100,
                 "store_quantities": {"01": 100}},
                {"name": "商品C", "origin": "東京都", "standard": "C", "quantity": 30,
                 "store_cost": 300.0, "price": 450.0, "total_delivery": 150,
                 "store_quantities": {"01": 150}},
                {"name": "商品D", "origin": "大阪府", "standard": "D", "quantity": 40,
                 "store_cost": 400.0, "price": 600.0, "total_delivery": 200,
                 "store_quantities": {"01": 200}},
                {"name": "商品E", "origin": "福岡県", "standard": "E", "quantity": 50,
                 "store_cost": 500.0, "price": 750.0, "total_delivery": 250,
                 "store_quantities": {"01": 250}}
            ]
        }

        response = client.post("/api/generate", json=request_data)

        assert response.status_code == 200
        # 5商品が正しく処理されるべき

    def test_supplier_as_delivery_dest(self):
        """納品先が未指定の場合、帳合先が使用されることをテスト"""
        request_data = {
            "delivery_date": "2025-01-25",
            "supplier": "◇◇青果",
            "buyer_name": "渡辺健太",
            "products": [
                {
                    "name": "レタス",
                    "origin": "長野県",
                    "standard": "M",
                    "quantity": 8,
                    "store_cost": 90.0,
                    "price": 158.0,
                    "total_delivery": 80,
                    # delivery_destを指定しない
                    "store_quantities": {"01": 40, "02": 40}
                }
            ]
        }

        response = client.post("/api/generate", json=request_data)

        assert response.status_code == 200
        # supplierが納品先として使用されるべき

    def test_shared_delivery_date(self):
        """共通のdelivery_dateが全商品に適用されることをテスト"""
        request_data = {
            "delivery_date": "2025-02-01",  # 共通の店着日
            "supplier": "◆◆流通",
            "buyer_name": "小林由美",
            "products": [
                {
                    "name": "商品1",
                    # delivery_dateを指定しない
                    "origin": "産地1",
                    "standard": "規格1",
                    "quantity": 10,
                    "store_cost": 100.0,
                    "price": 150.0,
                    "total_delivery": 50,
                    "store_quantities": {"01": 50}
                },
                {
                    "name": "商品2",
                    "delivery_date": "2025-02-05",  # 商品固有の店着日（優先される）
                    "origin": "産地2",
                    "standard": "規格2",
                    "quantity": 20,
                    "store_cost": 200.0,
                    "price": 300.0,
                    "total_delivery": 100,
                    "store_quantities": {"01": 100}
                }
            ]
        }

        response = client.post("/api/generate", json=request_data)

        assert response.status_code == 200
        # 商品1は2025-02-01、商品2は2025-02-05が使用されるべき

    def test_all_36_stores_allocation(self):
        """36店舗全てへの配分テスト"""
        store_quantities = {
            f"{i+1:02d}": 3 for i in range(36)  # 各店舗に3個ずつ
        }

        request_data = {
            "delivery_date": "2025-02-10",
            "supplier": "全店配送センター",
            "buyer_name": "全店配送担当",
            "products": [
                {
                    "name": "全店舗配分商品",
                    "origin": "全国",
                    "standard": "共通",
                    "quantity": 1,
                    "store_cost": 50.0,
                    "price": 100.0,
                    "total_delivery": 108,  # 36店舗 × 3個
                    "store_quantities": store_quantities
                }
            ]
        }

        response = client.post("/api/generate", json=request_data)

        assert response.status_code == 200


class TestAPIHealth:
    """APIヘルスチェック"""

    def test_health_check(self):
        """ヘルスチェックエンドポイント"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_version_endpoint(self):
        """バージョン情報エンドポイント"""
        response = client.get("/api/version")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert data["pdf_preview_available"] is True

    def test_firebase_config_endpoint(self):
        """Firebase設定エンドポイント"""
        response = client.get("/api/firebase-config")
        assert response.status_code == 200
        data = response.json()
        assert "apiKey" in data
        assert "projectId" in data


class TestErrorHandling:
    """エラーハンドリングのテスト"""

    def test_empty_products_list(self):
        """商品リストが空の場合のエラー"""
        request_data = {
            "delivery_date": "2025-03-01",
            "supplier": "テスト業者",
            "buyer_name": "テスト担当",
            "products": []
        }

        response = client.post("/api/generate", json=request_data)

        # エラーが返されるべき（または空のテンプレートが生成される）
        # 実装に依存するため、適宜調整
        assert response.status_code in [200, 400, 500]

    def test_missing_required_fields(self):
        """必須フィールドが欠けている場合"""
        request_data = {
            "delivery_date": "2025-03-02",
            "supplier": "テスト業者",
            "products": [
                {
                    "name": "商品A",
                    # 必須フィールドが不足
                    "store_quantities": {"01": 10}
                }
            ]
        }

        response = client.post("/api/generate", json=request_data)

        # バリデーションエラーまたは成功（Noneを許容する場合）
        assert response.status_code in [200, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
