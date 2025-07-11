#!/bin/bash

# Verification Script for Smart Recipe Generator Setup
# Run this to verify everything is working correctly

echo "🔍 Smart Recipe Generator - Setup Verification"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        return 0
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

ISSUES=0

echo ""
print_info "Checking system components..."

# Check Node.js
if command -v node &> /dev/null; then
    print_check 0 "Node.js is installed ($(node --version))"
else
    print_check 1 "Node.js is not installed"
    ((ISSUES++))
fi

# Check npm
if command -v npm &> /dev/null; then
    print_check 0 "npm is installed ($(npm --version))"
else
    print_check 1 "npm is not installed"
    ((ISSUES++))
fi

# Check MongoDB
if command -v mongod &> /dev/null; then
    print_check 0 "MongoDB is installed"
else
    print_check 1 "MongoDB is not installed"
    ((ISSUES++))
fi

# Check MongoDB service
if sudo systemctl is-active --quiet mongod; then
    print_check 0 "MongoDB service is running"
else
    print_check 1 "MongoDB service is not running"
    ((ISSUES++))
fi

# Check MongoDB connection
if mongosh --eval "db.adminCommand('ismaster')" &> /dev/null; then
    print_check 0 "MongoDB connection works"
else
    print_check 1 "MongoDB connection failed"
    ((ISSUES++))
fi

echo ""
print_info "Checking application files..."

# Check package.json
if [ -f "package.json" ]; then
    print_check 0 "package.json exists"
else
    print_check 1 "package.json not found"
    ((ISSUES++))
fi

# Check .env.local
if [ -f ".env.local" ]; then
    print_check 0 ".env.local exists"
    
    # Check required environment variables
    if grep -q "MONGO_URI=mongodb://localhost:27017" .env.local; then
        print_check 0 "MONGO_URI is configured for local MongoDB"
    else
        print_check 1 "MONGO_URI is not configured correctly"
        ((ISSUES++))
    fi
    
    if grep -q "JWT_SECRET=" .env.local && ! grep -q "your-jwt-secret" .env.local; then
        print_check 0 "JWT_SECRET is configured"
    else
        print_check 1 "JWT_SECRET needs to be set"
        ((ISSUES++))
    fi
    
else
    print_check 1 ".env.local not found"
    ((ISSUES++))
fi

# Check node_modules
if [ -d "node_modules" ]; then
    print_check 0 "Dependencies are installed"
else
    print_check 1 "Dependencies not installed (run: npm install)"
    ((ISSUES++))
fi

echo ""
print_info "Checking database..."

# Check database and collections
DB_CHECK=$(mongosh --quiet --eval "
use smart_recipe_generator;
const collections = db.getCollectionNames();
const userCount = db.users.countDocuments();
print('Collections: ' + collections.length);
print('Users: ' + userCount);
if (collections.includes('users')) print('users_collection_exists');
if (userCount > 0) print('test_user_exists');
" 2>/dev/null)

if echo "$DB_CHECK" | grep -q "users_collection_exists"; then
    print_check 0 "Users collection exists"
else
    print_check 1 "Users collection not found"
    ((ISSUES++))
fi

if echo "$DB_CHECK" | grep -q "test_user_exists"; then
    print_check 0 "Test user exists in database"
else
    print_check 1 "No users in database"
    print_warning "Run: node fix-auth.js to create test user"
fi

echo ""
print_info "Testing authentication..."

# Test if we can create a JWT token
JWT_TEST=$(node -e "
try {
  const jwt = require('jsonwebtoken');
  const crypto = require('crypto');
  const secret = process.env.JWT_SECRET || 'test-secret';
  const token = jwt.sign({test: true}, secret);
  const decoded = jwt.verify(token, secret);
  console.log('jwt_works');
} catch (e) {
  console.log('jwt_error: ' + e.message);
}
" 2>/dev/null)

if echo "$JWT_TEST" | grep -q "jwt_works"; then
    print_check 0 "JWT token generation works"
else
    print_check 1 "JWT token generation failed"
    ((ISSUES++))
fi

echo ""
print_info "Summary..."

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Your setup is ready.${NC}"
    echo ""
    echo "🚀 To start the application:"
    echo "   npm run dev"
    echo ""
    echo "🔑 Test credentials:"
    echo "   Email: admin@test.com"
    echo "   Password: admin123"
    echo ""
    echo "🌐 Access at: http://localhost:3000"
else
    echo -e "${RED}⚠️  Found $ISSUES issue(s) that need to be fixed.${NC}"
    echo ""
    echo "🔧 To fix issues automatically:"
    echo "   ./complete-setup.sh"
    echo ""
    echo "🔍 For detailed diagnosis:"
    echo "   node debug-auth.js"
fi

echo ""
print_info "System Information:"
echo "   OS: $(lsb_release -d | cut -f2 2>/dev/null || echo 'Unknown')"
echo "   MongoDB: $(mongod --version 2>/dev/null | head -1 || echo 'Not installed')"
echo "   Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
echo "   Working Directory: $(pwd)"

if [ -f ".env.local" ]; then
    echo "   Database: $(grep MONGO_URI .env.local | cut -d'=' -f2)"
fi

exit $ISSUES
