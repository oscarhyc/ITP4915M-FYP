# 🚀 Smart Recipe Generator - Ubuntu Server Deployment Guide

## 📋 **Prerequisites**

- Ubuntu Server (18.04 LTS or newer)
- Root or sudo access
- Domain name (optional, for production)
- At least 2GB RAM and 20GB storage

---

## 📁 **Files to Copy**

### **Essential Application Files:**
```
smart-recipe-generator/
├── src/                    # Complete source code
├── prisma/                 # Database schema
│   └── schema.prisma
├── public/                 # Static assets
├── package.json            # Dependencies
├── package-lock.json       # Lock file
├── next.config.mjs         # Next.js config
├── tailwind.config.js      # Styling config
├── tsconfig.json          # TypeScript config
├── .env.local.example     # Environment template
└── .gitignore             # Git ignore rules
```

### **Files NOT to Copy:**
```
❌ node_modules/           # Will be installed fresh
❌ .next/                  # Will be built on server
❌ .env.local              # Create new with server-specific values
❌ CLEANUP_COMPLETION_REPORT.md
❌ FORUM_FIXES_REPORT.md
❌ Any debug/temp files
```

---

## 🛠️ **Step-by-Step Deployment**

### **Step 1: Update Ubuntu Server**
```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common
```

### **Step 2: Install Node.js (v18 or newer)**
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or newer
```

### **Step 3: Install PostgreSQL**
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### **Step 4: Configure PostgreSQL Database**
```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell, run these commands:
```

```sql
-- Create database
CREATE DATABASE smart_recipe_generator;

-- Create user with password
CREATE USER recipe_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE smart_recipe_generator TO recipe_user;

-- Grant schema privileges
\c smart_recipe_generator
GRANT ALL ON SCHEMA public TO recipe_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO recipe_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO recipe_user;

-- Exit PostgreSQL
\q
```

```bash
# Configure PostgreSQL for local connections
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Add this line (replace * with your PostgreSQL version, e.g., 14):
# local   smart_recipe_generator    recipe_user                     md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### **Step 5: Install PM2 (Process Manager)**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### **Step 6: Create Application Directory**
```bash
# Create app directory
sudo mkdir -p /var/www/smart-recipe-generator
sudo chown $USER:$USER /var/www/smart-recipe-generator
cd /var/www/smart-recipe-generator
```

### **Step 7: Copy Application Files**

**Option A: Using SCP (from your local machine):**
```bash
# From your local machine, copy files to server
scp -r /path/to/your/smart-recipe-generator/* username@server-ip:/var/www/smart-recipe-generator/

# Or using rsync (recommended)
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.env.local' \
  /path/to/your/smart-recipe-generator/ username@server-ip:/var/www/smart-recipe-generator/
```

**Option B: Using Git (if you have a repository):**
```bash
# Clone from repository
git clone https://github.com/yourusername/smart-recipe-generator.git .

# Or if files are in a zip
wget https://your-file-host.com/smart-recipe-generator.zip
unzip smart-recipe-generator.zip
```

### **Step 8: Configure Environment Variables**
```bash
# Create environment file
cd /var/www/smart-recipe-generator
cp .env.local.example .env.local

# Edit environment variables
nano .env.local
```

**Add these environment variables:**
```env
# Database Configuration
DATABASE_URL="postgresql://recipe_user:your_secure_password_here@localhost:5432/smart_recipe_generator"

# NextAuth Configuration
NEXTAUTH_URL="http://your-server-ip:3002"
NEXTAUTH_SECRET="your-super-secret-key-here-min-32-chars"

# LM Studio Configuration (if using)
LMSTUDIO_BASE_URL="http://localhost:1234"

# Optional: External API keys
OPENAI_API_KEY="your-openai-key-if-needed"

# Production settings
NODE_ENV="production"
```

### **Step 9: Install Dependencies and Build**
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Build the application
npm run build
```

### **Step 10: Configure PM2**
```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

**Add this configuration:**
```javascript
module.exports = {
  apps: [{
    name: 'smart-recipe-generator',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/smart-recipe-generator',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    }
  }]
};
```

### **Step 11: Start Application with PM2**
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown by the command above

# Check application status
pm2 status
pm2 logs smart-recipe-generator
```

### **Step 12: Configure Firewall**
```bash
# Allow SSH (if not already configured)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow your application port
sudo ufw allow 3002

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### **Step 13: Install and Configure Nginx (Reverse Proxy)**
```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/smart-recipe-generator
```

**Add this Nginx configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain or server IP

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/smart-recipe-generator /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## ✅ **Verification Steps**

### **1. Check Database Connection:**
```bash
cd /var/www/smart-recipe-generator
npx prisma db push
```

### **2. Check Application Status:**
```bash
pm2 status
pm2 logs smart-recipe-generator --lines 50
```

### **3. Test Application:**
```bash
# Test direct access
curl http://localhost:3002

# Test through Nginx
curl http://your-server-ip
```

### **4. Check Services:**
```bash
# PostgreSQL
sudo systemctl status postgresql

# Nginx
sudo systemctl status nginx

# PM2
pm2 list
```

---

## 🔧 **Useful Management Commands**

### **Application Management:**
```bash
# Restart application
pm2 restart smart-recipe-generator

# Stop application
pm2 stop smart-recipe-generator

# View logs
pm2 logs smart-recipe-generator

# Monitor resources
pm2 monit
```

### **Database Management:**
```bash
# Access database
sudo -u postgres psql smart_recipe_generator

# Backup database
sudo -u postgres pg_dump smart_recipe_generator > backup.sql

# Restore database
sudo -u postgres psql smart_recipe_generator < backup.sql
```

### **Nginx Management:**
```bash
# Restart Nginx
sudo systemctl restart nginx

# Reload configuration
sudo systemctl reload nginx

# Check configuration
sudo nginx -t
```

---

## 🚀 **Your Application Should Now Be Running!**

- **Direct Access**: `http://your-server-ip:3002`
- **Through Nginx**: `http://your-server-ip` or `http://your-domain.com`

**Next Steps:**
1. Set up SSL certificate with Let's Encrypt (optional)
2. Configure domain name (if applicable)
3. Set up automated backups
4. Monitor application performance

**The deployment is complete! 🍳✨**

---

## 🔒 **Optional: SSL Certificate with Let's Encrypt**

### **Install Certbot:**
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### **Get SSL Certificate:**
```bash
# Replace with your actual domain
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### **Auto-renewal:**
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up auto-renewal
```

---

## 📊 **Monitoring and Maintenance**

### **Log Locations:**
- **Application**: `pm2 logs smart-recipe-generator`
- **Nginx**: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- **PostgreSQL**: `/var/log/postgresql/`

### **Regular Maintenance:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js dependencies
cd /var/www/smart-recipe-generator
npm update

# Restart application after updates
pm2 restart smart-recipe-generator
```

### **Backup Strategy:**
```bash
# Create backup script
sudo nano /usr/local/bin/backup-recipe-app.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/smart-recipe-generator"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump smart_recipe_generator > $BACKUP_DIR/db_backup_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /var/www smart-recipe-generator

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make script executable
sudo chmod +x /usr/local/bin/backup-recipe-app.sh

# Add to crontab for daily backups at 2 AM
sudo crontab -e
# Add this line:
# 0 2 * * * /usr/local/bin/backup-recipe-app.sh
```

---

## 🎯 **Quick Deployment Summary**

**Copy these files to your server:**
```
src/, prisma/, public/, package.json, package-lock.json,
next.config.mjs, tailwind.config.js, tsconfig.json, .env.local.example
```

**Run these essential commands:**
```bash
# 1. System setup
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib nginx

# 2. Database setup
sudo -u postgres createdb smart_recipe_generator
sudo -u postgres createuser recipe_user

# 3. Application setup
cd /var/www/smart-recipe-generator
npm install
npx prisma generate
npx prisma db push
npm run build

# 4. Process management
sudo npm install -g pm2
pm2 start npm --name "smart-recipe-generator" -- start
pm2 save
pm2 startup

# 5. Web server
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Your app will be running at: `http://your-server-ip:3002` 🚀**
