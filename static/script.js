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
const downloadBtn = document.getElementById('downloadBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const messageText = document.getElementById('messageText');
const errorText = document.getElementById('errorText');

// =====================================
// イベントリスナー設定
// =====================================
document.addEventListener('DOMContentLoaded', () => {
    // フォーム送信イベント
    templateForm.addEventListener('submit', handleFormSubmit);

    // ダウンロードボタンクリックイベント
    downloadBtn.addEventListener('click', handleDownload);

    // 入力値の検証
    const numBlocksInput = document.getElementById('numBlocks');
    numBlocksInput.addEventListener('input', validateNumBlocks);
});

// =====================================
// フォーム送信ハンドラ
// =====================================
async function handleFormSubmit(event) {
    event.preventDefault();

    // 入力値の検証
    if (!validateForm()) {
        return;
    }

    // ローディング表示
    showLoading();

    // 結果・エラーセクションを非表示
    hideResults();

    try {
        // フォームデータの取得
        const formData = getFormData();

        // API呼び出し
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        // レスポンスの処理
        const data = await response.json();

        if (response.ok && data.success) {
            // 成功
            handleSuccess(data);
        } else {
            // エラー
            const errorMessage = data.detail || data.message || '不明なエラーが発生しました';
            handleError(errorMessage);
        }
    } catch (error) {
        // ネットワークエラーなど
        handleError(`通信エラーが発生しました: ${error.message}`);
    } finally {
        // ローディング非表示
        hideLoading();
    }
}

// =====================================
// フォームデータ取得
// =====================================
function getFormData() {
    const numBlocks = parseInt(document.getElementById('numBlocks').value);
    const outputFilename = document.getElementById('outputFilename').value.trim();
    const buyerName = document.getElementById('buyerName').value.trim();
    const pixel100 = parseFloat(document.getElementById('pixel100').value);
    const pixel50 = parseFloat(document.getElementById('pixel50').value);

    const data = {
        num_blocks: numBlocks,
        pixel_100: pixel100,
        pixel_50: pixel50,
    };

    // オプショナルフィールド
    if (outputFilename) {
        data.output_filename = outputFilename;
    }

    if (buyerName) {
        data.buyer_name = buyerName;
    }

    return data;
}

// =====================================
// フォーム検証
// =====================================
function validateForm() {
    const numBlocksInput = document.getElementById('numBlocks');
    const numBlocks = parseInt(numBlocksInput.value);

    if (isNaN(numBlocks) || numBlocks < 1 || numBlocks > 100) {
        alert('商品ブロック数は1〜100の範囲で入力してください');
        numBlocksInput.focus();
        return false;
    }

    return true;
}

function validateNumBlocks(event) {
    const value = parseInt(event.target.value);
    if (isNaN(value) || value < 1 || value > 100) {
        event.target.setCustomValidity('1〜100の範囲で入力してください');
    } else {
        event.target.setCustomValidity('');
    }
}

// =====================================
// 成功ハンドラ
// =====================================
function handleSuccess(data) {
    // ダウンロードURLとファイル名を保存
    downloadUrl = data.download_url;
    downloadFilename = data.filename;

    // 成功メッセージ表示
    messageText.textContent = data.message || 'テンプレートの生成に成功しました';
    resultSection.style.display = 'block';
    downloadBtn.style.display = 'block';

    // スムーズスクロール
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =====================================
// エラーハンドラ
// =====================================
function handleError(errorMessage) {
    errorText.textContent = errorMessage;
    errorSection.style.display = 'block';

    // スムーズスクロール
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =====================================
// ダウンロードハンドラ
// =====================================
async function handleDownload() {
    if (!downloadUrl) {
        alert('ダウンロードURLが見つかりません');
        return;
    }

    try {
        // ダウンロードボタンを無効化
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'ダウンロード中...';

        // ファイルをダウンロード
        const response = await fetch(downloadUrl);

        if (!response.ok) {
            throw new Error('ダウンロードに失敗しました');
        }

        // Blobとして取得
        const blob = await response.blob();

        // ダウンロードリンクを作成
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadFilename || '配分表_テンプレート.xlsx';
        document.body.appendChild(a);
        a.click();

        // クリーンアップ
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // ボタンのテキストを更新
        downloadBtn.innerHTML = '<span class="btn-icon">✅</span> ダウンロード完了';
        downloadBtn.style.background = '#059669';

        // 3秒後に元に戻す
        setTimeout(() => {
            downloadBtn.innerHTML = '<span class="btn-icon">📥</span> Excelファイルをダウンロード';
            downloadBtn.style.background = '';
            downloadBtn.disabled = false;
        }, 3000);

    } catch (error) {
        alert(`ダウンロード中にエラーが発生しました: ${error.message}`);
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<span class="btn-icon">📥</span> Excelファイルをダウンロード';
    }
}

// =====================================
// UI制御関数
// =====================================
function showLoading() {
    loadingOverlay.style.display = 'flex';
    generateBtn.disabled = true;
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
    generateBtn.disabled = false;
}

function hideResults() {
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// =====================================
// ヘルスチェック（オプション）
// =====================================
async function checkApiHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('API Health:', data);
    } catch (error) {
        console.error('API Health Check Failed:', error);
    }
}

// 初回ロード時にヘルスチェック
checkApiHealth();
