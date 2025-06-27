# Smart Recipe Generator - Local Setup Guide

This guide will help you set up the Smart Recipe Generator with local LM Studio and MongoDB.

## Prerequisites

### 1. System Requirements
- **Node.js** v18 or higher
- **MongoDB** (local installation or Docker)
- **LM Studio** running on 192.168.5.35:1234
- **Git** for cloning the repository

### 2. LM Studio Setup
1. Download and install [LM Studio](https://lmstudio.ai/)
2. Download a compatible model:
   - **Recommended**: Llama 2 7B Chat, Mistral 7B Instruct, or Code Llama 7B
   - **Minimum**: Any instruction-tuned model with at least 7B parameters
3. Start LM Studio and load your chosen model
4. Start the local server on `192.168.5.35:1234`
5. Verify the API is accessible by visiting `http://192.168.5.35:1234/v1/models`

### 3. MongoDB Setup

#### Option A: Local MongoDB Installation
```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# macOS with Homebrew
brew install mongodb-community

# Windows
# Download from https://www.mongodb.com/try/download/community
```

#### Option B: MongoDB with Docker
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### Option C: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string

## Installation Steps

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd smart-recipe-generator-local

# Install dependencies and initialize database
npm run setup
```

### 2. Environment Configuration
```bash
# Copy the example environment file
cp .env.local.example .env.local
```

Edit `.env.local` with your settings:
```env
# Next.js Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production

# Local Authentication
JWT_SECRET=your-jwt-secret-key-change-this-in-production
BCRYPT_ROUNDS=12

# LM Studio Configuration
LM_STUDIO_BASE_URL=http://192.168.5.35:1234/v1
LM_STUDIO_API_KEY=not-needed-for-local

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/smart-recipe-generator

# API Request Limit (optional)
API_REQUEST_LIMIT=100

# Image Storage (local or cloud)
IMAGES_STORAGE_PATH=./public/images/recipes
AUDIO_STORAGE_PATH=./public/audio/recipes
```

### 3. Create Required Directories
```bash
mkdir -p public/images/recipes
mkdir -p public/audio/recipes
mkdir -p public/images/placeholders
```

### 4. Start the Application
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## First Time Setup

### 1. Create Your Account
1. Navigate to [http://localhost:3000](http://localhost:3000)
2. Click "Sign up" to create a new account
3. Fill in your details (name, email, password)
4. Sign in with your new credentials

### 2. Test LM Studio Connection
1. The home page will show system status
2. Verify that "LM Studio Connection" shows as "Connected"
3. If not connected, check:
   - LM Studio is running on 192.168.5.35:1234
   - The model is loaded and active
   - Network connectivity between devices

### 3. Generate Your First Recipe
1. Click "Generate Recipe" from the home page
2. Select some ingredients from the database
3. Choose dietary preferences if needed
4. Click "Generate" to create recipes using local AI

## Troubleshooting

### LM Studio Issues
- **Connection Failed**: Verify LM Studio is running and accessible
- **Model Not Loaded**: Ensure a model is loaded in LM Studio
- **Network Issues**: Check firewall settings and network connectivity
- **API Errors**: Verify the API endpoint is correct (192.168.5.35:1234/v1)

### MongoDB Issues
- **Connection Failed**: Ensure MongoDB is running on port 27017
- **Database Not Found**: Run `npm run init-db` to initialize
- **Permission Issues**: Check MongoDB user permissions

### Application Issues
- **Build Errors**: Run `npm run compileTS` to check TypeScript errors
- **Missing Dependencies**: Run `npm install` to reinstall packages
- **Port Conflicts**: Change the port in package.json if 3000 is in use

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Initialize/reset database
npm run init-db

# Run tests
npm test

# Type checking
npm run compileTS

# Linting
npm run lint
```

## Database Management

### Reset Database
```bash
npm run init-db
```

### Add Custom Ingredients
1. Connect to MongoDB
2. Use the `ingredients` collection
3. Add documents following the schema in `src/models/ingredient.ts`

### Backup Database
```bash
mongodump --db smart-recipe-generator --out backup/
```

### Restore Database
```bash
mongorestore --db smart-recipe-generator backup/smart-recipe-generator/
```

## Security Notes

### Production Deployment
1. **Change default secrets** in `.env.local`
2. **Use HTTPS** for production
3. **Secure MongoDB** with authentication
4. **Configure firewall** rules appropriately
5. **Regular backups** of your data

### Environment Variables
- Never commit `.env.local` to version control
- Use strong, unique secrets for JWT and NextAuth
- Consider using environment-specific configurations

## Performance Optimization

### LM Studio
- Use appropriate model size for your hardware
- Adjust temperature and token limits for faster responses
- Consider using quantized models for better performance

### MongoDB
- Create indexes for frequently queried fields
- Monitor query performance
- Consider sharding for large datasets

### Next.js
- Enable production optimizations
- Use CDN for static assets
- Implement caching strategies

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Check the application logs for error messages
4. Ensure all services are running and accessible

For additional help, refer to the main README.md file.
