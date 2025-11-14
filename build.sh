#!/bin/bash
set -e

echo "===== Starting build process ====="

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check if Node.js is available, install if not
echo "Checking Node.js availability..."
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 20.x..."

    # Download and install Node.js binary (no root required)
    NODE_VERSION="20.11.0"
    NODE_DISTRO="linux-x64"

    cd ~
    curl -o node-v${NODE_VERSION}-${NODE_DISTRO}.tar.xz https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-${NODE_DISTRO}.tar.xz
    tar -xf node-v${NODE_VERSION}-${NODE_DISTRO}.tar.xz

    # Add to PATH
    export PATH="$HOME/node-v${NODE_VERSION}-${NODE_DISTRO}/bin:$PATH"

    cd -

    echo "Node.js installed successfully!"
else
    echo "Node.js is already installed"
fi

node --version
npm --version

# Build frontend
echo "Building React frontend..."
cd frontend

# Debug: Check if .env file exists and show its contents
echo "Checking for .env file..."
if [ -f .env ]; then
    echo ".env file found!"
    echo "First 3 lines of .env:"
    head -3 .env
else
    echo "WARNING: .env file not found!"
    echo "Creating .env from environment variables..."
    {
        echo "VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}"
        echo "VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}"
        echo "VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}"
        echo "VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}"
        echo "VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}"
        echo "VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}"
    } > .env
    echo ".env file created from environment variables"
fi

echo "Installing frontend dependencies..."
npm install

# Export environment variables from .env file for Vite build
if [ -f .env ]; then
    echo "Exporting variables from .env file for Vite build..."
    set -a  # automatically export all variables
    source .env
    set +a  # stop automatically exporting
fi

echo "Building frontend with environment variables..."
echo "VITE_FIREBASE_API_KEY is set: $(if [ -n "$VITE_FIREBASE_API_KEY" ]; then echo "YES"; else echo "NO"; fi)"
npm run build

echo "Build completed successfully!"
ls -la dist/

cd ..

echo "===== Build process completed ====="
