#!/bin/bash

# Installation script for Health Check Dashboard
# This script sets up all dependencies for the desktop application

set -e

echo "🏥 Health Check Dashboard - Installation Script"
echo "================================================"
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "Found Node.js $NODE_VERSION"
echo ""

# Install root dependencies (Electron)
echo "📦 Installing Electron dependencies..."
npm install
echo "✅ Electron dependencies installed"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..
echo "✅ Frontend dependencies installed"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..
echo "✅ Backend dependencies installed"
echo ""

# Build frontend
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..
echo "✅ Frontend built successfully"
echo ""

# Initialize database
echo "🗄️  Initializing database..."
cd backend
npm run migrate
cd ..
echo "✅ Database initialized"
echo ""

echo "================================================"
echo "✨ Installation complete!"
echo ""
echo "To start the desktop app, run:"
echo "  npm start"
echo ""
echo "Or run as a web app:"
echo "  cd backend && npm start"
echo "================================================"
