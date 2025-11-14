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
ARG VITE_API_BASE_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
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

# アプリケーションファイルをコピー（frontend/.envも含まれる）
COPY . .

# Ensure frontend/.env exists for Vite build
# If not present, create it from ARG values (for Render.com builds)
RUN if [ ! -f frontend/.env ]; then \
        echo "Creating frontend/.env from build arguments..." && \
        { \
            echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}"; \
            echo "VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}"; \
            echo "VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}"; \
            echo "VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}"; \
            echo "VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}"; \
            echo "VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}"; \
            echo "VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}"; \
        } > frontend/.env; \
    else \
        echo "frontend/.env already exists, using it for build"; \
    fi

# Verify .env file (for debugging)
RUN echo "Checking frontend/.env before build:" && \
    ls -la frontend/.env && \
    echo "First 3 lines of frontend/.env:" && \
    head -3 frontend/.env

# .env ファイルを読み込んで環境変数としてエクスポート
RUN cd frontend && \
    if [ -f .env ]; then \
        set -a && \
        . ./.env && \
        set +a && \
        npm run build; \
    fi

# ビルド結果の検証
RUN cd frontend/dist/assets && \
    if grep -q "AIzaSyCjuPCpB0wqHxdX4JWL6VnEj1LJWgr4cKc" *.js; then \
        echo "✓ Firebase API key found in build output"; \
    fi

# 一時ファイル用ディレクトリを作成
RUN mkdir -p temp_files

# ポート8000を公開（デフォルト）
EXPOSE 8000

# 環境変数の設定
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# アプリケーションの起動（環境変数PORTを使用）
CMD uvicorn app:app --host 0.0.0.0 --port $PORT
