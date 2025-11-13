// =====================================
// モジュールのインポート
// =====================================
import { APIClient } from './js/api/client.js';
import { FormService } from './js/services/form-service.js';
import { ValidationService } from './js/services/validation-service.js';
import { DownloadService } from './js/services/download-service.js';
import { LoadingUI } from './js/ui/loading.js';
import { NotificationUI } from './js/ui/notification.js';

// =====================================
// グローバル変数
// =====================================
let downloadUrl = null;
let downloadFilename = null;

// =====================================
// DOM要素の取得
// =====================================
const templateForm = document.getElementById('templateForm');
const generateBtn = document.getElementById('generateBtn');
const previewBtn = document.getElementById('previewBtn');
const downloadBtn = document.getElementById('downloadBtn');

// =====================================
// イベントリスナー設定
// =====================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Main] Application initialized with modular structure');

    // フォーム送信イベント
    if (templateForm) {
        templateForm.addEventListener('submit', handleFormSubmit);
    }

    // プレビューボタンクリックイベント
    if (previewBtn) {
        previewBtn.addEventListener('click', handlePreview);
    }

    // ダウンロードボタンクリックイベント
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    }
});

// =====================================
// フォーム送信ハンドラ
// =====================================
async function handleFormSubmit(event) {
    event.preventDefault();

    // 入力値の検証
    if (!ValidationService.validateForm()) {
        return;
    }

    // ローディング表示
    LoadingUI.show();

    // 結果・エラーセクションを非表示
    NotificationUI.hideAll();

    try {
        // フォームデータの取得
        const formData = FormService.getFormData();

        // API呼び出し
        const data = await APIClient.generateTemplate(formData);

        // 成功
        handleSuccess(data);
    } catch (error) {
        // エラー
        handleError(`テンプレート生成エラー: ${error.message}`);
    } finally {
        // ローディング非表示
        LoadingUI.hide();
    }
}

// =====================================
// プレビューハンドラ
// =====================================
async function handlePreview(event) {
    event.preventDefault();

    // 入力値の検証
    if (!ValidationService.validateForm()) {
        return;
    }

    // ローディング表示
    LoadingUI.show();

    // 結果・エラーセクションを非表示
    NotificationUI.hideAll();

    try {
        // フォームデータの取得
        const formData = FormService.getFormData();

        // API呼び出し (PDF preview endpoint)
        const blob = await APIClient.generatePreview(formData);

        // PDFをモーダルで表示（モバイル対応）
        showPDFModal(blob);
    } catch (error) {
        // エラー
        handleError(`プレビュー生成エラー: ${error.message}`);
    } finally {
        // ローディング非表示
        LoadingUI.hide();
    }
}

// =====================================
// PDFモーダル表示
// =====================================
function showPDFModal(blob) {
    const url = URL.createObjectURL(blob);

    // モーダル要素の取得
    const pdfModal = document.getElementById('pdfModal');
    const pdfIframe = document.getElementById('pdfIframe');
    const pdfFallback = document.getElementById('pdfFallback');
    const pdfDownloadLink = document.getElementById('pdfDownloadLink');
    const pdfModalClose = document.getElementById('pdfModalClose');

    if (!pdfModal || !pdfIframe) {
        console.error('[Main] PDF modal elements not found');
        return;
    }

    // iframeにPDFを読み込む
    pdfIframe.style.display = 'block';
    if (pdfFallback) pdfFallback.style.display = 'none';
    pdfIframe.src = url;

    // フォールバック用ダウンロードリンク設定
    if (pdfDownloadLink) {
        pdfDownloadLink.href = url;
        pdfDownloadLink.download = 'preview.pdf';
    }

    // モーダル表示
    pdfModal.style.display = 'flex';

    // iframe読み込みエラー時のフォールバック処理
    pdfIframe.onerror = () => {
        pdfIframe.style.display = 'none';
        if (pdfFallback) pdfFallback.style.display = 'block';
    };

    // 閉じるボタン
    if (pdfModalClose) {
        pdfModalClose.onclick = () => {
            pdfModal.style.display = 'none';
            URL.revokeObjectURL(url);
        };
    }

    // モーダル背景クリックで閉じる
    pdfModal.onclick = (e) => {
        if (e.target === pdfModal) {
            pdfModal.style.display = 'none';
            URL.revokeObjectURL(url);
        }
    };

    console.log('[Main] PDF modal shown');
}

// =====================================
// 成功ハンドラ
// =====================================
function handleSuccess(data) {
    console.log('[Main] Template generation successful:', data);

    // ダウンロードURLとファイル名を保存
    downloadUrl = data.download_url;
    downloadFilename = data.filename;

    // 成功メッセージを表示
    NotificationUI.showSuccess(data.message || 'テンプレートの生成に成功しました');

    // ダウンロードボタンを表示
    NotificationUI.showDownloadButton();

    // 自動ダウンロード（明示的に無効化されていない場合）
    if (data.auto_download !== false) {
        setTimeout(() => {
            handleDownload();
        }, 500);
    }
}

// =====================================
// エラーハンドラ
// =====================================
function handleError(errorMessage) {
    console.error('[Main] Error occurred:', errorMessage);

    // エラーメッセージを表示
    NotificationUI.showError(errorMessage);

    // ダウンロードURLをクリア
    downloadUrl = null;
    downloadFilename = null;
}

// =====================================
// ダウンロードハンドラ
// =====================================
function handleDownload() {
    console.log('[Main] Download requested');

    if (!downloadUrl) {
        alert('ダウンロードするファイルがありません');
        return;
    }

    // DownloadServiceを使用してダウンロード
    DownloadService.downloadFile(downloadUrl, downloadFilename || 'template.xlsx');
}

// =====================================
// グローバルスコープへのエクスポート
// =====================================
// app-workflow.jsなど他のスクリプトから使用するため
window.ValidationService = ValidationService;
window.FormService = FormService;

console.log('[Main] Script loaded successfully');
