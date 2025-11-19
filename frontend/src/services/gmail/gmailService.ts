import { getFirebaseAuth } from '@/services/firebase/config';

/**
 * Gmail API送信オプション
 */
export interface GmailSendOptions {
  /** 宛先メールアドレス */
  to: string;
  /** 件名 */
  subject: string;
  /** 本文 */
  body: string;
  /** 添付ファイル（Blob） */
  attachment?: Blob;
  /** 添付ファイル名 */
  filename?: string;
}

/**
 * Base64エンコード（URL-safe）
 */
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
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
 * MIME メッセージを作成
 */
async function createMimeMessage(options: GmailSendOptions, fromEmail: string): Promise<string> {
  const boundary = '----=_Part_' + Date.now();
  const { to, subject, body, attachment, filename } = options;

  let message = '';

  // ヘッダー
  message += `From: ${fromEmail}\r\n`;
  message += `To: ${to}\r\n`;
  message += `Subject: ${subject}\r\n`;
  message += `MIME-Version: 1.0\r\n`;

  if (attachment && filename) {
    // 添付ファイルがある場合
    message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

    // 本文パート
    message += `--${boundary}\r\n`;
    message += `Content-Type: text/plain; charset="UTF-8"\r\n`;
    message += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
    message += `${body}\r\n\r\n`;

    // 添付ファイルパート
    message += `--${boundary}\r\n`;
    message += `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n`;
    message += `Content-Transfer-Encoding: base64\r\n`;
    message += `Content-Disposition: attachment; filename="${filename}"\r\n\r\n`;

    const base64Data = await blobToBase64(attachment);
    message += `${base64Data}\r\n\r\n`;

    message += `--${boundary}--`;
  } else {
    // 添付ファイルがない場合
    message += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
    message += `${body}`;
  }

  return message;
}

/**
 * Gmail APIを使ってメールを送信
 */
export async function sendEmail(
  accessToken: string,
  options: GmailSendOptions
): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    if (!user || !user.email) {
      throw new Error('ユーザーがログインしていないか、メールアドレスが取得できません');
    }

    // MIMEメッセージを作成
    const mimeMessage = await createMimeMessage(options, user.email);

    // Base64エンコード（URL-safe）
    const encodedMessage = base64UrlEncode(mimeMessage);

    // Gmail API呼び出し
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gmail API error:', errorData);
      throw new Error(`メール送信に失敗しました: ${errorData.error?.message || response.statusText}`);
    }

    console.log('メールが正常に送信されました');
  } catch (error) {
    console.error('sendEmail error:', error);
    throw error;
  }
}
