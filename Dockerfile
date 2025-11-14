# Python 3.11をベースイメージとして使用
FROM python:3.11-slim

# 作業ディレクトリを設定
WORKDIR /app

# システムパッケージの更新と必要なパッケージのインストール
# LibreOffice for Excel to PDF conversion + Node.js for React build
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-calc \
    libreoffice-writer \
    libreoffice-core \
    fonts-takao-gothic \
    fonts-takao-mincho \
    fonts-noto-cjk \
    curl \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20.x をインストール
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Viteビルド用の環境変数を定義（render.yamlから渡される）
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

# 依存関係ファイルをコピー
COPY requirements.txt .

# Pythonパッケージのインストール（キャッシュを有効化して高速化）
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# フロントエンド依存関係ファイルをコピー（キャッシング用）
COPY frontend/package*.json frontend/

# フロントエンド依存関係のインストール
RUN cd frontend && npm install

# アプリケーションファイルをコピー
COPY . .

# Firebase設定ファイルを明示的に上書きコピー（.dockerignoreを回避）
COPY frontend/.env frontend/.env

# Reactアプリをビルド
RUN cd frontend && npm run build

# 一時ファイル用ディレクトリを作成
RUN mkdir -p temp_files

# ポート8000を公開（デフォルト）
EXPOSE 8000

# 環境変数の設定
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# アプリケーションの起動（環境変数PORTを使用）
CMD uvicorn app:app --host 0.0.0.0 --port $PORT
