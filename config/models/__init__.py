#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
モデル定義パッケージ

設計原則:
- SSOT: すべてのモデルをここからインポート可能にする
- 利便性: from config.models import TemplateRequest で直接インポート可能
"""

from config.models.requests import ProductDataRequest, TemplateRequest, EmailRequest
from config.models.responses import TemplateResponse, ErrorResponse

__all__ = [
    "ProductDataRequest",
    "TemplateRequest",
    "EmailRequest",
    "TemplateResponse",
    "ErrorResponse",
]
