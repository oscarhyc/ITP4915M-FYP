# 🍳 Smart Recipe Generator - Clean Version

A Next.js application for generating recipes using AI, with community features and PostgreSQL database.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup PostgreSQL database**
   ```sql
   CREATE DATABASE smart_recipe_generator;
   CREATE USER recipe_user WITH ENCRYPTED PASSWORD 'recipe_password_123';
   GRANT ALL PRIVILEGES ON DATABASE smart_recipe_generator TO recipe_user;
   ```

3. **Configure environment**
   ```bash
   # Create .env file
   echo 'DATABASE_URL="postgresql://recipe_user:recipe_password_123@localhost:5432/smart_recipe_generator?schema=public"' > .env
   
   # Create .env.local from template
   cp .env.local.example .env.local
   # Edit .env.local with your server IP and generate new secrets
   ```

4. **Setup database schema**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Create admin user**
   ```bash
   node -e "
   const { PrismaClient } = require('@prisma/client');
   const bcrypt = require('bcryptjs');
   (async () => {
     const prisma = new PrismaClient();
     const hashedPassword = await bcrypt.hash('admin123', 12);
     await prisma.user.create({
       data: {
         email: 'admin@test.com',
         name: 'Test Admin',
         password: hashedPassword,
         role: 'admin',
         isActive: true,
         preferences: {},
         stats: {}
       }
     });
     console.log('✅ Admin user created');
     await prisma.\$disconnect();
   })();
   "
   ```

6. **Start the application**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## 🔧 Essential Files Structure

```
smart-recipe-generator/
├── src/                    # Application source code
│   ├── components/         # React components
│   ├── contexts/          # React contexts
│   ├── lib/               # Utility libraries
│   ├── pages/             # Next.js pages and API routes
│   ├── styles/            # CSS styles
│   └── types/             # TypeScript types
├── prisma/                # Database schema
│   └── schema.prisma      # Prisma schema definition
├── public/                # Static assets
├── package.json           # Dependencies and scripts
├── next.config.mjs        # Next.js configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
├── .env.local.example     # Environment template
└── .gitignore             # Git ignore rules
```

## 🌐 Features

- **Recipe Generation**: AI-powered recipe creation using Gemini API
- **Community Forum**: Share recipes and discuss cooking tips
- **User Authentication**: Secure login and registration
- **Recipe Management**: Save, share, and like recipes
- **Responsive Design**: Works on desktop and mobile

## 🔑 Default Credentials

- **Email**: admin@test.com
- **Password**: admin123

## 🗄️ Database Management

```bash
# Connect to database
psql -h localhost -U recipe_user -d smart_recipe_generator

# View tables
\dt

# Reset database
npx prisma db push --force-reset

# View data in Prisma Studio
npx prisma studio
```

## 🚀 Deployment

### Development
```bash
npm run dev
# Access at http://localhost:3002
```

### Production with PM2
```bash
npm run build
npm install -g pm2
pm2 start npm --name "smart-recipe-generator" -- start
pm2 save
pm2 startup
```

## 🔧 Environment Variables

Required in `.env.local`:

```env
# Server Configuration
NEXT_PUBLIC_API_BASE_URL=http://your-server-ip:3002
NEXTAUTH_URL=http://your-server-ip:3002
NEXTAUTH_SECRET=your-secret-here
JWT_SECRET=your-jwt-secret-here

# Database
DATABASE_URL="postgresql://recipe_user:password@localhost:5432/smart_recipe_generator?schema=public"

# AI API
LM_STUDIO_BASE_URL=https://hahahagame-gemini-play.deno.dev
LM_STUDIO_API_KEY=your-api-key-here
```

## 🧪 Testing

```bash
# Test API health
curl http://localhost:3002/api/system/status

# Test authentication
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "admin123"}'
```

## 📦 Key Dependencies

- **Next.js**: React framework
- **Prisma**: Database ORM
- **PostgreSQL**: Database
- **Tailwind CSS**: Styling
- **bcryptjs**: Password hashing
- **jsonwebtoken**: Authentication
- **OpenAI**: AI API client

## 🔒 Security

- Passwords are hashed with bcrypt
- JWT tokens for authentication
- Environment variables for secrets
- SQL injection protection via Prisma

## 📞 Support

For issues:
1. Check logs: `npm run dev` output or `pm2 logs`
2. Verify database connection
3. Check environment variables
4. Ensure PostgreSQL is running

## 📄 License

This project is for educational and personal use.

---

**Your clean Smart Recipe Generator is ready to use! 🍳✨**
