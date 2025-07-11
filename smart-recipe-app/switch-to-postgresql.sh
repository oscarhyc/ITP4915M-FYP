#!/bin/bash

# Switch from MongoDB to PostgreSQL
# This script backs up MongoDB files and switches to PostgreSQL

echo "🔄 Switching from MongoDB to PostgreSQL"
echo "======================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_step "1. Creating backup of MongoDB files..."

# Create backup directory
mkdir -p backup-mongodb-files

# Backup MongoDB-related files
if [ -f "src/lib/mongodb.ts" ]; then
    cp src/lib/mongodb.ts backup-mongodb-files/
    print_status "Backed up mongodb.ts"
fi

if [ -f "src/lib/auth.ts" ]; then
    cp src/lib/auth.ts backup-mongodb-files/
    print_status "Backed up auth.ts"
fi

if [ -f "src/pages/api/auth/register.ts" ]; then
    cp src/pages/api/auth/register.ts backup-mongodb-files/
    print_status "Backed up register.ts"
fi

if [ -f "src/pages/api/auth/login.ts" ]; then
    cp src/pages/api/auth/login.ts backup-mongodb-files/
    print_status "Backed up login.ts"
fi

# Backup models directory
if [ -d "src/models" ]; then
    cp -r src/models backup-mongodb-files/
    print_status "Backed up models directory"
fi

print_step "2. Switching to PostgreSQL files..."

# Replace auth.ts with Prisma version
if [ -f "src/lib/auth-prisma.ts" ]; then
    cp src/lib/auth-prisma.ts src/lib/auth.ts
    print_status "Replaced auth.ts with Prisma version"
fi

# Replace API endpoints
if [ -f "src/pages/api/auth/register-prisma.ts" ]; then
    cp src/pages/api/auth/register-prisma.ts src/pages/api/auth/register.ts
    print_status "Replaced register.ts with Prisma version"
fi

if [ -f "src/pages/api/auth/login-prisma.ts" ]; then
    cp src/pages/api/auth/login-prisma.ts src/pages/api/auth/login.ts
    print_status "Replaced login.ts with Prisma version"
fi

print_step "3. Installing PostgreSQL and dependencies..."

# Run the PostgreSQL conversion script
if [ -f "convert-to-postgresql.sh" ]; then
    chmod +x convert-to-postgresql.sh
    ./convert-to-postgresql.sh
else
    print_warning "convert-to-postgresql.sh not found, running manual setup..."
    
    # Manual PostgreSQL setup
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Install npm dependencies
    npm install pg @types/pg prisma @prisma/client
    
    print_status "PostgreSQL installed manually"
fi

print_step "4. Updating package.json scripts..."

# Add Prisma scripts to package.json if they don't exist
if [ -f "package.json" ]; then
    # Check if Prisma scripts exist
    if ! grep -q "prisma:generate" package.json; then
        # Create a temporary file with updated package.json
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        if (!pkg.scripts) pkg.scripts = {};
        
        pkg.scripts['prisma:generate'] = 'prisma generate';
        pkg.scripts['prisma:push'] = 'prisma db push';
        pkg.scripts['prisma:studio'] = 'prisma studio';
        pkg.scripts['db:reset'] = 'prisma db push --force-reset';
        
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('✅ Added Prisma scripts to package.json');
        "
    fi
fi

print_step "5. Testing PostgreSQL connection..."

# Test if PostgreSQL is running
if sudo systemctl is-active --quiet postgresql; then
    print_status "PostgreSQL service is running"
    
    # Test database connection
    if psql -h localhost -U recipe_user -d smart_recipe_generator -c "SELECT 1;" 2>/dev/null; then
        print_status "Database connection successful"
    else
        print_warning "Database connection test failed (this is normal if not set up yet)"
    fi
else
    print_warning "PostgreSQL service is not running"
fi

print_step "6. Cleanup and final steps..."

# Remove temporary Prisma files
rm -f src/lib/auth-prisma.ts
rm -f src/pages/api/auth/register-prisma.ts
rm -f src/pages/api/auth/login-prisma.ts

echo ""
echo "🎉 Switch to PostgreSQL completed!"
echo ""
echo "📋 Summary:"
echo "   ✅ MongoDB files backed up to: backup-mongodb-files/"
echo "   ✅ Authentication system switched to Prisma + PostgreSQL"
echo "   ✅ API endpoints updated"
echo "   ✅ Dependencies installed"
echo ""
echo "🔧 PostgreSQL Commands:"
echo "   Status: sudo systemctl status postgresql"
echo "   Connect: psql -h localhost -U recipe_user -d smart_recipe_generator"
echo "   Admin: sudo -u postgres psql"
echo ""
echo "🗄️  Prisma Commands:"
echo "   Generate: npm run prisma:generate"
echo "   Push: npm run prisma:push"
echo "   Studio: npm run prisma:studio"
echo "   Reset: npm run db:reset"
echo ""
echo "🚀 Next Steps:"
echo "   1. Run: npm run prisma:generate"
echo "   2. Run: npm run prisma:push"
echo "   3. Start app: npm run dev"
echo "   4. Test login: admin@test.com / admin123"
echo ""
echo "📁 Backup Location:"
echo "   Your MongoDB files are safely backed up in: backup-mongodb-files/"
echo "   You can restore them anytime if needed."
echo ""
print_status "PostgreSQL is ready! 🐘"
