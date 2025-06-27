#!/bin/bash

# AWS EC2 Setup Script for Smart Recipe Generator
# Run this on a fresh Ubuntu 22.04 EC2 instance

set -e

echo "🚀 Smart Recipe Generator - AWS EC2 Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running on Ubuntu
if [[ ! -f /etc/lsb-release ]] || ! grep -q "Ubuntu" /etc/lsb-release; then
    print_error "This script is designed for Ubuntu. Please use Ubuntu 22.04 LTS."
    exit 1
fi

print_step "1. Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_status "System updated successfully"

print_step "2. Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
NODE_VERSION=$(node --version)
print_status "Node.js installed: $NODE_VERSION"

print_step "3. Installing MongoDB..."
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update package list and install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB installation
if sudo systemctl is-active --quiet mongod; then
    print_status "MongoDB installed and running successfully"
else
    print_error "MongoDB installation failed"
    exit 1
fi

print_step "4. Installing PM2 for process management..."
sudo npm install -g pm2
print_status "PM2 installed successfully"

print_step "5. Setting up firewall..."
sudo ufw allow ssh
sudo ufw allow 3000
sudo ufw --force enable
print_status "Firewall configured (SSH and port 3000 allowed)"

print_step "6. Creating application directory..."
cd /home/ubuntu
if [ ! -d "smart-recipe-generator" ]; then
    print_warning "Application code not found. Please clone your repository:"
    echo "git clone https://github.com/your-username/smart-recipe-generator.git"
    echo "cd smart-recipe-generator"
else
    cd smart-recipe-generator
    print_status "Found existing application directory"
fi

print_step "7. System information..."
echo "📊 System Information:"
echo "  - OS: $(lsb_release -d | cut -f2)"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo "  - MongoDB: $(mongod --version | head -1)"
echo "  - PM2: $(pm2 --version)"
echo "  - Public IP: $(curl -s http://checkip.amazonaws.com/)"
echo "  - Private IP: $(hostname -I | awk '{print $1}')"

print_step "8. Next steps..."
echo ""
echo "🎉 AWS EC2 setup completed successfully!"
echo ""
echo "Next steps to deploy your application:"
echo ""
echo "1. Clone your application (if not done already):"
echo "   git clone https://github.com/your-username/smart-recipe-generator.git"
echo "   cd smart-recipe-generator"
echo ""
echo "2. Install application dependencies:"
echo "   npm install"
echo ""
echo "3. Configure environment variables:"
echo "   cp .env.local.example .env.local"
echo "   nano .env.local"
echo ""
echo "   Update these values in .env.local:"
echo "   NEXT_PUBLIC_API_BASE_URL=http://$(curl -s http://checkip.amazonaws.com/):3000"
echo "   NEXTAUTH_URL=http://$(curl -s http://checkip.amazonaws.com/):3000"
echo "   MONGO_URI=mongodb://localhost:27017/smart-recipe-generator-prod"
echo ""
echo "4. Generate new security secrets:"
echo "   node -e \"console.log('NEXTAUTH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))\""
echo "   node -e \"console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))\""
echo ""
echo "5. Build and start the application:"
echo "   npm run build"
echo "   pm2 start npm --name \"recipe-app\" -- start"
echo "   pm2 startup"
echo "   pm2 save"
echo ""
echo "6. Access your application:"
echo "   http://$(curl -s http://checkip.amazonaws.com/):3000"
echo ""
echo "📚 For detailed instructions, see AWS_DEPLOYMENT_GUIDE.md"
echo ""
print_status "Setup script completed! 🚀"
