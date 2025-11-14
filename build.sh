#!/bin/bash
set -e

echo "===== ビルドプロセス開始 ====="

# Python依存関係のインストール
echo "Python依存関係をインストール中..."
pip install -r requirements.txt

# Node.jsの確認とインストール
echo "Node.jsの確認中..."
if ! command -v node &> /dev/null; then
    echo "Node.jsが見つかりません。Node.js 20.xをインストール中..."

    # Node.jsバイナリをダウンロードしてインストール（root権限不要）
    NODE_VERSION="20.11.0"
    NODE_DISTRO="linux-x64"

    cd ~
    curl -o node-v${NODE_VERSION}-${NODE_DISTRO}.tar.xz https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-${NODE_DISTRO}.tar.xz
    tar -xf node-v${NODE_VERSION}-${NODE_DISTRO}.tar.xz

    # PATHに追加
    export PATH="$HOME/node-v${NODE_VERSION}-${NODE_DISTRO}/bin:$PATH"

    cd -

    echo "Node.jsのインストールが完了しました！"
else
    echo "Node.jsは既にインストールされています"
fi

node --version
npm --version

# フロントエンドのビルド
echo "Reactフロントエンドをビルド中..."
cd frontend

# デバッグ: .envファイルの存在確認と内容表示
echo ".envファイルを確認中..."
if [ -f .env ]; then
    echo ".envファイルが見つかりました！"
    echo ".envの最初の3行:"
    head -3 .env
else
    echo "警告: .envファイルが見つかりません！"
    echo "環境変数から.envファイルを作成中..."
    {
        echo "VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}"
        echo "VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}"
        echo "VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}"
        echo "VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}"
        echo "VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}"
        echo "VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}"
    } > .env
    echo "環境変数から.envファイルを作成しました"
fi

echo "フロントエンド依存関係をインストール中..."
npm install

# .envファイルから環境変数を自動エクスポート
if [ -f .env ]; then
    echo ".envファイルからViteビルド用の環境変数をエクスポート中..."
    set -a  # 自動エクスポート有効化
    source .env
    set +a  # 自動エクスポート無効化
fi

echo "環境変数を使用してフロントエンドをビルド中..."
echo "VITE_FIREBASE_API_KEYが設定されています: $(if [ -n "$VITE_FIREBASE_API_KEY" ]; then echo "はい"; else echo "いいえ"; fi)"
npm run build

echo "ビルドが正常に完了しました！"
ls -la dist/

cd ..

echo "===== ビルドプロセス完了 ====="
