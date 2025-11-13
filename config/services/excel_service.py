#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Excel生成サービス

設計原則:
- 責務の明確化: Excel生成のみを担当
- 抽象化・隠蔽: HaibunTemplateCreatorの呼び出し詳細を隠蔽
- 再利用性: 共通ロジックを一箇所で管理
"""

from datetime import datetime
from pathlib import Path
from typing import List, Optional
import uuid

from haibun_template_creator import (
    HaibunTemplateCreator,
    TemplateConfig,
    ProductData
)

from config.models import ProductDataRequest, TemplateRequest


class ExcelService:
    """
    Excel生成サービス

    HaibunTemplateCreatorを使用したExcelテンプレート生成を提供します。
    """

    @staticmethod
    def generate_filename(output_filename: Optional[str] = None) -> str:
        """
        出力ファイル名を生成

        Args:
            output_filename: 指定されたファイル名（オプション）

        Returns:
            str: 生成されたファイル名（.xlsx拡張子付き）

        設計原則:
        - 単一情報源: ファイル名生成ロジックを一箇所で管理
        - 標準化: 一貫した命名規則
        """
        if output_filename:
            filename = output_filename
            if not filename.endswith('.xlsx'):
                filename += '.xlsx'
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"配分表_テンプレート_{timestamp}.xlsx"

        return filename

    @staticmethod
    def convert_product_data(
        product_requests: List[ProductDataRequest],
        common_delivery_date: Optional[str] = None,
        common_supplier: Optional[str] = None
    ) -> List[ProductData]:
        """
        ProductDataRequestリストをProductDataリストに変換

        Args:
            product_requests: ProductDataRequestのリスト
            common_delivery_date: 全商品共通の納品日（オプション）
            common_supplier: 全商品共通の帳合先（オプション）

        Returns:
            List[ProductData]: 変換されたProductDataのリスト

        設計原則:
        - 関心の分離: データ変換ロジックを分離
        - 責務の明確化: モデル変換のみを担当
        """
        products = []
        for product_req in product_requests:
            # product_nameの決定（name優先、なければproduct_nameにフォールバック）
            product_name = product_req.name or product_req.product_name

            # delivery_dateの決定（商品固有 > 全体共通）
            delivery_date = product_req.delivery_date or common_delivery_date

            product_data = ProductData(
                delivery_date=delivery_date,
                origin=product_req.origin,
                standard=product_req.standard,
                product_name=product_name,
                store_cost=product_req.store_cost,
                price=product_req.price,
                quantity=product_req.quantity,
                total_delivery=product_req.total_delivery,
                delivery_dest=product_req.delivery_dest or common_supplier,  # 納品先がなければ帳合先を使用
                store_quantities=product_req.store_quantities
            )
            products.append(product_data)

        return products

    @staticmethod
    def create_template(
        temp_dir: Path,
        request: TemplateRequest,
        file_id: Optional[str] = None
    ) -> tuple[Path, str]:
        """
        Excelテンプレートを生成

        Args:
            temp_dir: 一時ファイル保存ディレクトリ
            request: テンプレート生成リクエスト
            file_id: ファイルID（指定しない場合は自動生成）

        Returns:
            tuple[Path, str]: (生成されたファイルのパス, ファイルID)

        Raises:
            Exception: テンプレート生成失敗時

        設計原則:
        - 抽象化: HaibunTemplateCreator呼び出しの詳細を隠蔽
        - 疎結合: 設定はTemplateRequestから取得
        """
        # ファイルID生成
        if file_id is None:
            file_id = str(uuid.uuid4())

        # 一時ファイルパス
        temp_path = temp_dir / f"{file_id}.xlsx"

        # 商品数を動的に取得（num_blocksが指定されていない場合）
        num_blocks = request.num_blocks if request.num_blocks else len(request.products)
        if num_blocks == 0:
            num_blocks = 1  # 最低1ブロック

        # 設定作成
        config = TemplateConfig(
            num_blocks=num_blocks,
            pixel_100=request.pixel_100,
            pixel_50=request.pixel_50,
            default_output_path=str(temp_path)
        )

        # 商品データを変換
        products = ExcelService.convert_product_data(
            request.products,
            common_delivery_date=request.delivery_date,
            common_supplier=request.supplier
        )

        # テンプレート生成
        creator = HaibunTemplateCreator(config=config)
        output_path = creator.create_template(
            buyer_name=request.buyer_name,
            products=products
        )

        return Path(output_path), file_id
