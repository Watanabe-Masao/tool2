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

echo "Installing frontend dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Build completed successfully!"
ls -la dist/

cd ..

echo "===== Build process completed ====="
