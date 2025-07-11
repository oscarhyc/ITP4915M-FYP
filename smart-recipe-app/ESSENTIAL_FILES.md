# Smart Recipe Generator - Essential Files

## 🔧 Core Application Files
- `src/` - All source code
- `prisma/` - Database schema and migrations
- `public/` - Static assets
- `package.json` - Dependencies and scripts
- `next.config.mjs` - Next.js configuration
- `tailwind.config.js` - Styling configuration
- `tsconfig.json` - TypeScript configuration

## ⚙️ Configuration Files
- `.env.local` - Environment variables (create from .env.local.example)
- `.env` - Database URL for Prisma
- `.gitignore` - Git ignore rules

## 🚀 Quick Start Commands
```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## 🗄️ Database Setup
1. Install PostgreSQL
2. Create database and user:
   ```sql
   CREATE DATABASE smart_recipe_generator;
   CREATE USER recipe_user WITH ENCRYPTED PASSWORD 'recipe_password_123';
   GRANT ALL PRIVILEGES ON DATABASE smart_recipe_generator TO recipe_user;
   ```
3. Set DATABASE_URL in .env file
4. Run `npx prisma db push`

## 🔑 Default Admin User
- Email: admin@test.com
- Password: admin123

(Create with Prisma after database setup)
