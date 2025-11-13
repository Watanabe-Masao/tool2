#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
リクエストモデル定義

設計原則:
- SSOT: リクエストモデルを一箇所で定義
- 関心の分離: リクエストデータの構造のみを定義
- 責務の明確化: バリデーションとデータ構造のみ担当
"""

from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class ProductDataRequest(BaseModel):
    """
    商品データリクエスト

    Attributes:
        name: 品名（Phase 3以降の推奨フィールド）
        product_name: 品名（後方互換用、nameが優先される）
        delivery_date: 納品日（YYYY-MM-DD形式）
        origin: 産地
        standard: 規格
        store_cost: 店着原価
        price: 税抜売価
        quantity: 入数
        total_delivery: 総納品数
        delivery_dest: 納品先
        store_quantities: 店舗配分数（店舗コード: 数量）
    """

    name: Optional[str] = Field(default=None, max_length=50, description="品名")
    product_name: Optional[str] = Field(default=None, max_length=50, description="品名（後方互換用）")
    delivery_date: Optional[str] = Field(default=None, description="納品日（YYYY-MM-DD形式）")
    origin: Optional[str] = Field(default=None, max_length=30, description="産地")
    standard: Optional[str] = Field(default=None, max_length=20, description="規格")
    store_cost: Optional[float] = Field(default=None, description="店着原価")
    price: Optional[float] = Field(default=None, description="税抜売価")
    quantity: Optional[int] = Field(default=None, description="入数")
    total_delivery: Optional[int] = Field(default=None, description="総納品数")
    delivery_dest: Optional[str] = Field(default=None, max_length=30, description="納品先")
    store_quantities: Dict[str, int] = Field(default_factory=dict, description="店舗配分数")


class TemplateRequest(BaseModel):
    """
    テンプレート生成リクエスト（Phase 3: 5-step workflow対応）

    5ステップワークフロー:
        Step 1: 店着日（delivery_date） - 全商品共通
        Step 2: 帳合先（supplier） - 全商品共通
        Step 3-5: 商品情報（products） - 動的リスト

    Attributes:
        delivery_date: 店着日（全商品共通）
        supplier: 帳合先名（全商品共通）
        num_blocks: 商品ブロック数（自動計算されるが後方互換用に残す）
        output_filename: 出力ファイル名（省略時は自動生成）
        buyer_name: 担当バイヤー名
        pixel_100: 100ピクセル列幅（デフォルト: 13.5714285714）
        pixel_50: 50ピクセル列幅（デフォルト: 6.4285714286）
        products: 商品データリスト
    """

    # Step 1: 店着日（全商品共通）
    delivery_date: Optional[str] = Field(default=None, description="店着日（YYYY-MM-DD形式）")

    # Step 2: 帳合先（全商品共通）
    supplier: Optional[str] = Field(default=None, max_length=50, description="帳合先名")

    # 商品数（自動計算されるが、後方互換用に残す）
    num_blocks: Optional[int] = Field(default=None, ge=1, le=100, description="商品ブロック数（1-100）")

    output_filename: Optional[str] = Field(
        default=None,
        description="出力ファイル名（省略時は自動生成）"
    )

    buyer_name: Optional[str] = Field(
        default=None,
        max_length=20,
        description="担当バイヤー名（最大20文字）"
    )

    pixel_100: Optional[float] = Field(default=13.5714285714, description="100ピクセル列幅")
    pixel_50: Optional[float] = Field(default=6.4285714286, description="50ピクセル列幅")

    # Step 3-5: 商品情報（動的リスト）
    products: List[ProductDataRequest] = Field(default_factory=list, description="商品データリスト")
