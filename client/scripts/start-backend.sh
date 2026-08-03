#!/bin/bash

# Print Arts Flow - Backend Startup Script

echo "🚀 Starting Print Arts Flow Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version too old. Please install Node.js 18 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Navigate to backend directory
cd "$(dirname "$0")/../backend"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Backend directory not found. Please ensure backend setup is complete."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env file with your configuration before running again."
    echo "   Default MongoDB URI: mongodb://localhost:27017/print_arts_flow"
    echo "   Please set JWT_SECRET to a secure random string."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies."
        exit 1
    fi
fi

# Check if MongoDB is running (optional check)
echo "🔍 Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "⚠️  MongoDB may not be running. Please start MongoDB first:"
        echo "   macOS: brew services start mongodb/brew/mongodb-community"
        echo "   Linux: sudo systemctl start mongod"
        echo "   Windows: net start MongoDB"
        echo ""
        echo "Continuing anyway - MongoDB connection will be tested on startup..."
    else
        echo "✅ MongoDB is running"
    fi
else
    echo "⚠️  mongosh not found. Skipping MongoDB check."
fi

echo ""
echo "🚀 Starting backend server..."
echo "📊 Backend will be available at: http://localhost:5000"
echo "🔗 API endpoints: http://localhost:5000/api"
echo "❤️  Health check: http://localhost:5000/api/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev
