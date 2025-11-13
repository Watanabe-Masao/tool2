#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
API層パッケージ

設計原則:
- SSOT: すべてのAPIルーターをここからインポート可能にする
- 利便性: from config.api import router で直接インポート可能
"""

from config.api.routes import router

__all__ = [
    "router",
]
