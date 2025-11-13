#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
モデルのテスト

テスト駆動リファクタリング:
- モデルが正しくインポートできることを確認
- バリデーションが正しく機能することを確認
- デフォルト値が正しく設定されることを確認
"""

import pytest
from pydantic import ValidationError
from config.models import (
    ProductDataRequest,
    TemplateRequest,
    TemplateResponse,
    ErrorResponse
)


class TestProductDataRequest:
    """ProductDataRequestモデルのテスト"""

    def test_empty_product(self):
        """空の商品データが作成できること"""
        product = ProductDataRequest()
        assert product.name is None
        assert product.product_name is None
        assert product.store_quantities == {}

    def test_product_with_name(self):
        """品名付き商品データが作成できること"""
        product = ProductDataRequest(
            name="りんご",
            origin="青森県",
            store_cost=100.0,
            price=150.0
        )
        assert product.name == "りんご"
        assert product.origin == "青森県"
        assert product.store_cost == 100.0
        assert product.price == 150.0

    def test_store_quantities(self):
        """店舗配分数が正しく設定できること"""
        product = ProductDataRequest(
            name="みかん",
            store_quantities={"01": 10, "02": 20}
        )
        assert product.store_quantities == {"01": 10, "02": 20}

    def test_max_length_validation(self):
        """最大長のバリデーションが機能すること"""
        # 品名は50文字まで
        long_name = "a" * 51
        with pytest.raises(ValidationError):
            ProductDataRequest(name=long_name)


class TestTemplateRequest:
    """TemplateRequestモデルのテスト"""

    def test_empty_request(self):
        """空のリクエストが作成できること"""
        request = TemplateRequest()
        assert request.delivery_date is None
        assert request.supplier is None
        assert request.products == []

    def test_request_with_common_fields(self):
        """共通フィールド付きリクエストが作成できること"""
        request = TemplateRequest(
            delivery_date="2025-01-15",
            supplier="テスト商社",
            buyer_name="山田太郎"
        )
        assert request.delivery_date == "2025-01-15"
        assert request.supplier == "テスト商社"
        assert request.buyer_name == "山田太郎"

    def test_request_with_products(self):
        """商品リスト付きリクエストが作成できること"""
        product1 = ProductDataRequest(name="りんご")
        product2 = ProductDataRequest(name="みかん")

        request = TemplateRequest(
            delivery_date="2025-01-15",
            supplier="テスト商社",
            products=[product1, product2]
        )
        assert len(request.products) == 2
        assert request.products[0].name == "りんご"
        assert request.products[1].name == "みかん"

    def test_pixel_defaults(self):
        """ピクセル値のデフォルトが正しいこと"""
        request = TemplateRequest()
        assert request.pixel_100 == 13.5714285714
        assert request.pixel_50 == 6.4285714286

    def test_num_blocks_validation(self):
        """商品ブロック数のバリデーションが機能すること"""
        # 1-100の範囲外はエラー
        with pytest.raises(ValidationError):
            TemplateRequest(num_blocks=0)

        with pytest.raises(ValidationError):
            TemplateRequest(num_blocks=101)

        # 1-100の範囲内はOK
        request = TemplateRequest(num_blocks=50)
        assert request.num_blocks == 50


class TestTemplateResponse:
    """TemplateResponseモデルのテスト"""

    def test_success_response(self):
        """成功レスポンスが作成できること"""
        response = TemplateResponse(
            success=True,
            message="生成しました",
            download_url="/api/download/abc123",
            filename="template.xlsx"
        )
        assert response.success is True
        assert response.message == "生成しました"
        assert response.download_url == "/api/download/abc123"
        assert response.filename == "template.xlsx"

    def test_error_response(self):
        """エラーレスポンスが作成できること"""
        response = TemplateResponse(
            success=False,
            message="エラーが発生しました"
        )
        assert response.success is False
        assert response.message == "エラーが発生しました"
        assert response.download_url is None
        assert response.filename is None


class TestErrorResponse:
    """ErrorResponseモデルのテスト"""

    def test_simple_error(self):
        """シンプルなエラーレスポンスが作成できること"""
        error = ErrorResponse(error="エラーが発生しました")
        assert error.error == "エラーが発生しました"
        assert error.detail is None
        assert error.error_type == "GeneralError"

    def test_detailed_error(self):
        """詳細付きエラーレスポンスが作成できること"""
        error = ErrorResponse(
            error="バリデーションエラー",
            detail="必須フィールドが不足しています",
            error_type="ValidationError"
        )
        assert error.error == "バリデーションエラー"
        assert error.detail == "必須フィールドが不足しています"
        assert error.error_type == "ValidationError"
