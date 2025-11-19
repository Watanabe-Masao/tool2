/**
 * メール送信サービス（Resend API経由）
 *
 * Gmail API依存を削除し、バックエンド（Resend）経由でメール送信を行います
 */

/**
 * メール送信オプション
 */
export interface EmailSendOptions {
  /** 宛先メールアドレス */
  to: string;
  /** 件名 */
  subject: string;
  /** 本文（HTML形式） */
  body: string;
  /** 送信元の表示名（オプション） */
  senderName?: string;
  /** 添付ファイル（Blob） */
  attachment?: Blob;
  /** 添付ファイル名 */
  filename?: string;
}

/**
 * BlobをBase64に変換
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // data:application/octet-stream;base64,xxx の形式から base64部分のみ取得
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * バックエンドAPI経由でメールを送信
 */
export async function sendEmail(options: EmailSendOptions): Promise<void> {
  try {
    // 添付ファイルをBase64に変換
    let attachmentData: string | undefined;
    if (options.attachment && options.filename) {
      attachmentData = await blobToBase64(options.attachment);
    }

    // HTMLメール本文を生成
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>${options.body.replace(/\n/g, '<br>')}</p>
        </body>
      </html>
    `;

    // バックエンドAPIを呼び出し
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: options.to,
        subject: options.subject,
        html: htmlBody,
        sender_name: options.senderName,
        attachment_data: attachmentData,
        attachment_filename: options.filename,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Email API error:', errorData);
      throw new Error(`メール送信に失敗しました: ${errorData.detail || response.statusText}`);
    }

    const result = await response.json();
    console.log('メールが正常に送信されました', result);
  } catch (error) {
    console.error('sendEmail error:', error);
    throw error;
  }
}
