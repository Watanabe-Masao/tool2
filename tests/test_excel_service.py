#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
ExcelServiceのテスト

テスト対象:
- ファイル名生成ロジック
- 商品データ変換ロジック
- テンプレート生成ロジック（基本的な検証）
"""

import pytest
from pathlib import Path
import tempfile
import shutil
from datetime import datetime

from config.services.excel_service import ExcelService
from config.models.requests import ProductDataRequest, TemplateRequest


class TestExcelService:
    """ExcelServiceのテスト"""

    def test_generate_filename_with_custom_name(self):
        """カスタムファイル名が正しく生成されること"""
        filename = ExcelService.generate_filename("test_template")
        assert filename == "test_template.xlsx"

    def test_generate_filename_with_extension(self):
        """拡張子付きファイル名が正しく処理されること"""
        filename = ExcelService.generate_filename("test_template.xlsx")
        assert filename == "test_template.xlsx"

    def test_generate_filename_auto_generated(self):
        """自動生成ファイル名が正しい形式であること"""
        filename = ExcelService.generate_filename()
        assert filename.startswith("配分表_テンプレート_")
        assert filename.endswith(".xlsx")
        # タイムスタンプが含まれていることを確認
        assert len(filename) > 20

    def test_convert_product_data_basic(self):
        """商品データ変換が正しく機能すること"""
        product_request = ProductDataRequest(
            name="りんご",
            origin="青森県",
            standard="10kg",
            store_cost=1000.0,
            price=1500.0,
            quantity=10,
            total_delivery=100,
            store_quantities={"01": 10, "02": 20}
        )

        products = ExcelService.convert_product_data([product_request])

        assert len(products) == 1
        assert products[0].product_name == "りんご"
        assert products[0].origin == "青森県"
        assert products[0].standard == "10kg"
        assert products[0].store_cost == 1000.0
        assert products[0].price == 1500.0

    def test_convert_product_data_with_common_fields(self):
        """共通フィールドが正しく適用されること"""
        product_request = ProductDataRequest(
            name="みかん"
        )

        products = ExcelService.convert_product_data(
            [product_request],
            common_delivery_date="2025-01-15",
            common_supplier="テスト商社"
        )

        assert len(products) == 1
        assert products[0].product_name == "みかん"
        assert products[0].delivery_date == "2025-01-15"
        assert products[0].delivery_dest == "テスト商社"

    def test_convert_product_data_product_specific_overrides(self):
        """商品固有のフィールドが共通フィールドより優先されること"""
        product_request = ProductDataRequest(
            name="ぶどう",
            delivery_date="2025-01-20"
        )

        products = ExcelService.convert_product_data(
            [product_request],
            common_delivery_date="2025-01-15",
            common_supplier="テスト商社"
        )

        assert products[0].delivery_date == "2025-01-20"  # 商品固有の日付が優先

    def test_convert_product_data_multiple_products(self):
        """複数商品の変換が正しく機能すること"""
        products_request = [
            ProductDataRequest(name="りんご"),
            ProductDataRequest(name="みかん"),
            ProductDataRequest(name="ぶどう")
        ]

        products = ExcelService.convert_product_data(products_request)

        assert len(products) == 3
        assert products[0].product_name == "りんご"
        assert products[1].product_name == "みかん"
        assert products[2].product_name == "ぶどう"

    def test_convert_product_data_backward_compatibility(self):
        """後方互換性: product_nameフィールドが使用できること"""
        product_request = ProductDataRequest(
            product_name="バナナ"  # 古いフィールド名
        )

        products = ExcelService.convert_product_data([product_request])

        assert products[0].product_name == "バナナ"

    def test_convert_product_data_name_priority(self):
        """nameフィールドがproduct_nameより優先されること"""
        product_request = ProductDataRequest(
            name="りんご",
            product_name="みかん"  # こちらは無視される
        )

        products = ExcelService.convert_product_data([product_request])

        assert products[0].product_name == "りんご"

    def test_create_template_basic(self):
        """基本的なテンプレート生成が成功すること"""
        # 一時ディレクトリを作成
        temp_dir = Path(tempfile.mkdtemp())

        try:
            # テスト用リクエスト
            request = TemplateRequest(
                delivery_date="2025-01-15",
                supplier="テスト商社",
                buyer_name="山田太郎",
                products=[
                    ProductDataRequest(
                        name="りんご",
                        origin="青森県",
                        standard="10kg",
                        store_cost=1000.0,
                        price=1500.0,
                        quantity=10,
                        total_delivery=100
                    )
                ]
            )

            # テンプレート生成
            output_path, file_id = ExcelService.create_template(
                temp_dir=temp_dir,
                request=request
            )

            # 検証
            assert output_path.exists()
            assert output_path.suffix == ".xlsx"
            assert file_id is not None
            assert len(file_id) > 0

        finally:
            # クリーンアップ
            shutil.rmtree(temp_dir)

    def test_create_template_with_file_id(self):
        """指定したfile_idでテンプレートが生成されること"""
        temp_dir = Path(tempfile.mkdtemp())

        try:
            request = TemplateRequest(
                delivery_date="2025-01-15",
                supplier="テスト商社",
                products=[
                    ProductDataRequest(name="りんご")
                ]
            )

            custom_file_id = "test-file-id-12345"

            output_path, file_id = ExcelService.create_template(
                temp_dir=temp_dir,
                request=request,
                file_id=custom_file_id
            )

            assert file_id == custom_file_id
            assert output_path.name == f"{custom_file_id}.xlsx"

        finally:
            shutil.rmtree(temp_dir)

    def test_create_template_with_multiple_products(self):
        """複数商品のテンプレートが生成されること"""
        temp_dir = Path(tempfile.mkdtemp())

        try:
            request = TemplateRequest(
                delivery_date="2025-01-15",
                supplier="テスト商社",
                products=[
                    ProductDataRequest(name="りんご"),
                    ProductDataRequest(name="みかん"),
                    ProductDataRequest(name="ぶどう")
                ]
            )

            output_path, file_id = ExcelService.create_template(
                temp_dir=temp_dir,
                request=request
            )

            assert output_path.exists()
            # ファイルサイズが0より大きいことを確認
            assert output_path.stat().st_size > 0

        finally:
            shutil.rmtree(temp_dir)

    def test_create_template_auto_num_blocks(self):
        """num_blocksが自動計算されること"""
        temp_dir = Path(tempfile.mkdtemp())

        try:
            request = TemplateRequest(
                delivery_date="2025-01-15",
                supplier="テスト商社",
                # num_blocksを指定せず、商品数から自動計算
                products=[
                    ProductDataRequest(name="りんご"),
                    ProductDataRequest(name="みかん")
                ]
            )

            output_path, file_id = ExcelService.create_template(
                temp_dir=temp_dir,
                request=request
            )

            assert output_path.exists()

        finally:
            shutil.rmtree(temp_dir)
