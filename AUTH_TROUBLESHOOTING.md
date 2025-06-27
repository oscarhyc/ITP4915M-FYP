# Authentication Troubleshooting Guide

This guide helps diagnose and fix authentication issues in the Smart Recipe Generator application.

## 🚨 Quick Diagnosis

### Step 1: Run the Diagnostic Tool
```bash
# Make scripts executable
chmod +x debug-auth.js fix-auth.js

# Run comprehensive diagnosis
node debug-auth.js

# If issues found, run the fix script
node fix-auth.js
```

### Step 2: Check Application Logs
```bash
# Start the application and watch for errors
npm run dev

# Look for these error patterns:
# - MongoDB connection errors
# - JWT secret warnings
# - Authentication middleware errors
```

## 🔍 Common Issues and Solutions

### Issue 1: Cannot Create Account / Register
**Symptoms:**
- Registration form shows "Failed to create account"
- Console shows MongoDB connection errors
- 500 Internal Server Error

**Diagnosis:**
```bash
# Check MongoDB status
sudo systemctl status mongod  # Linux
brew services list | grep mongodb  # macOS

# Test MongoDB connection
mongosh  # or mongo
```

**Solutions:**
```bash
# Start MongoDB
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS

# For Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Check .env.local
cat .env.local | grep MONGO_URI
```

### Issue 2: Cannot Login with Existing Account
**Symptoms:**
- Login form shows "Invalid credentials"
- User exists in database but login fails
- JWT token errors

**Diagnosis:**
```bash
# Check if user exists in database
mongosh
use smart-recipe-generator
db.users.find({email: "your-email@example.com"})

# Check JWT secret
cat .env.local | grep JWT_SECRET
```

**Solutions:**
```bash
# Reset user password (in MongoDB shell)
mongosh
use smart-recipe-generator
const bcrypt = require('bcryptjs')
const newPassword = bcrypt.hashSync('newpassword123', 12)
db.users.updateOne(
  {email: "your-email@example.com"}, 
  {$set: {password: newPassword}}
)

# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Update JWT_SECRET in .env.local
```

### Issue 3: MongoDB Connection Refused
**Symptoms:**
- "ECONNREFUSED" errors
- "MongoDB connection error"
- Application won't start

**Solutions:**

#### For Local MongoDB:
```bash
# Install MongoDB (Ubuntu/Debian)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### For AWS EC2:
```bash
# Use the AWS setup script
chmod +x setup-aws.sh
./setup-aws.sh
```

#### For MongoDB Atlas (Cloud):
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free cluster
3. Get connection string
4. Update MONGO_URI in .env.local:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-recipe-generator?retryWrites=true&w=majority
```

### Issue 4: JWT Token Errors
**Symptoms:**
- "Invalid token" errors
- Authentication middleware failures
- Users get logged out immediately

**Solutions:**
```bash
# Check JWT_SECRET is set and secure
cat .env.local | grep JWT_SECRET

# Generate new JWT secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Update .env.local with the new secret
# Restart the application
```

### Issue 5: Environment Variables Missing
**Symptoms:**
- "Please define the MONGO_URI environment variable" error
- Default secrets being used
- Configuration warnings

**Solutions:**
```bash
# Check if .env.local exists
ls -la .env.local

# Create from example if missing
cp .env.local.example .env.local

# Verify required variables
cat .env.local | grep -E "(MONGO_URI|JWT_SECRET|NEXTAUTH_SECRET)"

# Generate secure secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('NEXTAUTH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## 🛠️ Manual Database Setup

### Create Database and Collections
```javascript
// Connect to MongoDB
mongosh

// Switch to application database
use smart-recipe-generator

// Create users collection with indexes
db.users.createIndex({email: 1}, {unique: true})
db.users.createIndex({"stats.lastActiveAt": -1})
db.users.createIndex({isActive: 1, role: 1})

// Create other collections
db.recipes.createIndex({userId: 1, createdAt: -1})
db.recipes.createIndex({likesCount: -1, createdAt: -1})
db.recipes.createIndex({"tags.tag": 1})

// Verify collections
show collections
```

### Create Test User Manually
```javascript
// In MongoDB shell
use smart-recipe-generator

// Create test user (password: admin123)
db.users.insertOne({
  email: "admin@test.com",
  password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJgusgdRu",
  name: "Test Admin",
  isActive: true,
  role: "admin",
  preferences: {
    dietaryRestrictions: [],
    favoriteIngredients: [],
    cookingSkillLevel: "intermediate",
    notifications: {email: true, push: true}
  },
  stats: {
    recipesGenerated: 0,
    recipesLiked: 0,
    recipesShared: 0,
    lastActiveAt: new Date()
  },
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## 🔧 API Endpoint Testing

### Test Registration Endpoint
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

### Test Login Endpoint
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### Test Authentication Status
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Cookie: auth-token=YOUR_TOKEN_HERE"
```

## 📊 Database Verification Commands

### Check User Count
```javascript
mongosh
use smart-recipe-generator
db.users.countDocuments()
```

### List All Users
```javascript
db.users.find({}, {password: 0}).pretty()
```

### Check Database Stats
```javascript
db.stats()
```

### Verify Indexes
```javascript
db.users.getIndexes()
```

## 🚀 AWS-Specific Issues

### EC2 Security Groups
Ensure these ports are open:
- 22 (SSH)
- 3000 (Application)
- 27017 (MongoDB - only if needed externally)

### MongoDB on EC2
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod
```

### Environment Variables on EC2
```bash
# Check environment file
cat /home/ubuntu/smart-recipe-generator/.env.local

# Update for EC2 public IP
NEXT_PUBLIC_API_BASE_URL=http://YOUR_EC2_PUBLIC_IP:3000
NEXTAUTH_URL=http://YOUR_EC2_PUBLIC_IP:3000
```

## 🔍 Debug Mode

### Enable Detailed Logging
Add to your .env.local:
```env
DEBUG=true
NODE_ENV=development
```

### Check Application Logs
```bash
# Development mode
npm run dev

# Production mode with PM2
pm2 logs recipe-app
```

## 📞 Getting Help

If you're still having issues:

1. **Run the diagnostic tool**: `node debug-auth.js`
2. **Check the generated report**: `auth-diagnostic-report.json`
3. **Review application logs** for specific error messages
4. **Verify all environment variables** are set correctly
5. **Test MongoDB connection** independently

### Common Error Messages and Solutions

| Error Message | Solution |
|---------------|----------|
| "MONGO_URI not defined" | Set MONGO_URI in .env.local |
| "ECONNREFUSED 27017" | Start MongoDB service |
| "User already exists" | Use different email or login instead |
| "Invalid credentials" | Check email/password or reset password |
| "JWT malformed" | Generate new JWT_SECRET |
| "Cannot read property 'id'" | Check user object structure |

---

**Last Updated**: Current
**For AWS Deployment**: See `AWS_DEPLOYMENT_GUIDE.md`
**For API Configuration**: See `API_CONFIGURATION.md`
