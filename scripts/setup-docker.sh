#!/bin/bash

# Kelasipro SaaS Docker Setup Script

echo "🚀 Kelasipro SaaS Docker Setup"
echo "=============================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   macOS: brew install docker"
    echo "   Ubuntu: sudo apt-get install docker.io"
    echo "   Windows: Download from https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first:"
    echo "   macOS: brew install docker-compose"
    echo "   Ubuntu: sudo apt-get install docker-compose"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads
mkdir -p logs

# Set proper permissions
echo "🔧 Setting permissions..."
chmod +x scripts/*.sh

# Build and start services
echo "🏗️ Building and starting services..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📱 Access your application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Execute in container: docker-compose exec backend bash"
echo ""
echo "📖 For more information, see README-Docker.md"