#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
メール送信サービス（Resend API使用）

設計原則:
- SSOT: メール送信ロジックを一箇所に集約
- 関心の分離: メール送信の詳細を抽象化
- セキュリティ: APIキーは環境変数から取得
"""

import os
import logging
import base64
from typing import Optional

import resend

from config.exceptions import ConfigurationError

# ロガー設定
logger = logging.getLogger(__name__)


class EmailService:
    """
    Resend APIを使用したメール送信サービス
    """

    @staticmethod
    def send_email(
        to: str,
        subject: str,
        html: str,
        attachment_data: Optional[str] = None,
        attachment_filename: Optional[str] = None
    ) -> dict:
        """
        Resend APIを使用してメールを送信

        Args:
            to: 送信先メールアドレス
            subject: メール件名
            html: HTML形式のメール本文
            attachment_data: Base64エンコードされた添付ファイルデータ（オプション）
            attachment_filename: 添付ファイル名（オプション）

        Returns:
            dict: Resend APIのレスポンス（id, fromなど）

        Raises:
            ConfigurationError: RESEND_API_KEYが設定されていない場合
            Exception: メール送信失敗時
        """
        # 環境変数からAPIキーを取得
        api_key = os.getenv("RESEND_API_KEY")
        if not api_key:
            raise ConfigurationError(
                message="Resend APIキーが設定されていません",
                detail="RESEND_API_KEY環境変数を設定してください"
            )

        # ResendクライアントのAPIキー設定
        resend.api_key = api_key

        # メールパラメータ
        params = {
            "from": "配本管理システム <onboarding@resend.dev>",  # Resendの検証済みドメイン
            "to": [to],
            "subject": subject,
            "html": html,
        }

        # 添付ファイルがある場合
        if attachment_data and attachment_filename:
            try:
                # Base64デコード（フロントエンドからBase64で送信される）
                file_content = base64.b64decode(attachment_data)

                params["attachments"] = [{
                    "filename": attachment_filename,
                    "content": list(file_content)  # Resendはbytesのリストを期待
                }]
                logger.info(f"Attachment added: {attachment_filename} ({len(file_content)} bytes)")
            except Exception as e:
                logger.error(f"Failed to process attachment: {e}")
                # 添付ファイルのエラーは無視して本文のみ送信
                logger.warning("Sending email without attachment due to processing error")

        # メール送信
        try:
            logger.info(f"Sending email to {to} with subject '{subject}'")
            email = resend.Emails.send(params)
            logger.info(f"Email sent successfully. ID: {email.get('id', 'unknown')}")
            return email
        except Exception as e:
            logger.error(f"Failed to send email: {e}", exc_info=True)
            raise
