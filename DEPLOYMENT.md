# Deployment Guide

## Overview

This guide covers deploying the DOA Chatbot application to:
1. **Git Repository** (viralji)
2. **Digital Ocean Server** (139.59.72.225)

## Quick Start Checklist

### Pre-Deployment (Local)
- [ ] Test production build: `npm run build`
- [ ] Verify no secrets in code
- [ ] Commit and push to Git

### Git Repository
```bash
git init
git remote add origin <your-git-repo-url>
git add .
git commit -m "Initial commit: DOA Chatbot"
git push -u origin main
```

### Server Setup (139.59.72.225)
```bash
# 1. Clone and install
cd /var/www && git clone <repo-url> doa-chatbot
cd doa-chatbot && npm install --production

# 2. Configure .env (see Step 5 below)

# 3. Upload Excel and process
scp "9 DOA - 2024-10-13 v2 BK.xlsx" root@139.59.72.225:/var/www/doa-chatbot/
npm run process-doa && npm run build-index

# 4. Build and start
npm run build
pm2 start ecosystem.config.js
pm2 save

# 5. Configure Nginx and SSL (see Steps 9-10 below)
```

### Post-Deployment
- [ ] Health check: `curl https://doa.cloud/api/health`
- [ ] Test authentication flow
- [ ] Test chat functionality
- [ ] Verify email whitelist works

## Prerequisites

- Git repository access (viralji)
- SSH access to Digital Ocean server (139.59.72.225)
- Domain name configured (doa.cloud or doa.cloudextel.com)
- Azure AD app registration with production redirect URI
- Node.js 18+ installed on server
- PM2 or similar process manager installed

## Part 1: Git Repository Setup

### Step 1: Initialize Git Repository (if not already done)

```bash
cd /home/viral/code/work/CE_DOA_Query
git init
git remote add origin <your-git-repo-url>
```

### Step 2: Verify .gitignore

Ensure `.gitignore` includes:
```
.env
.env.local
.env.production
node_modules/
.next/
data/processed/
data/faiss-index/
9 DOA - 2024-10-13 v2 BK.xlsx
```

### Step 3: Pre-Commit Checklist

- [ ] Remove any console.log statements (or replace with proper logging)
- [ ] Verify no secrets in code
- [ ] Test build: `npm run build`
- [ ] Run linter: `npm run lint`
- [ ] Update README.md if needed

### Step 4: Commit and Push

```bash
git add .
git commit -m "Initial commit: DOA Chatbot application"
git branch -M main
git push -u origin main
```

## Part 2: Digital Ocean Server Setup

### Step 1: Server Requirements

- **OS**: Ubuntu 20.04+ or similar
- **Node.js**: 18.x or higher
- **PM2**: For process management
- **Nginx**: For reverse proxy (recommended)
- **SSL Certificate**: Let's Encrypt (recommended)

### Step 2: Initial Server Setup

SSH into the server:
```bash
ssh root@139.59.72.225
```

Install Node.js (if not installed):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Install PM2:
```bash
sudo npm install -g pm2
```

Install Nginx (if not installed):
```bash
sudo apt-get update
sudo apt-get install -y nginx
```

### Step 3: Clone Repository

```bash
cd /var/www
sudo git clone <your-git-repo-url> doa-chatbot
cd doa-chatbot
sudo chown -R $USER:$USER /var/www/doa-chatbot
```

### Step 4: Install Dependencies

```bash
npm install --production
```

### Step 5: Environment Configuration

Create `.env` file:
```bash
nano .env
```

Add production environment variables:
```env
# Google API
GOOGLE_API_KEY=your_production_google_api_key

# Azure AD
AZURE_AD_CLIENT_ID=your_azure_client_id
AZURE_AD_CLIENT_SECRET=your_azure_client_secret
AZURE_AD_TENANT_ID=your_azure_tenant_id

# NextAuth
NEXTAUTH_URL=https://doa.cloud
NEXTAUTH_SECRET=your_production_nextauth_secret

# Environment
NODE_ENV=production
ALLOWED_DOMAIN=cloudextel.com

# Allowed Emails (comma-separated)
ALLOWED_EMAILS=k.trivedi@cloudextel.com,s.gite@cloudextel.com,r.gaur@cloudextel.com,p.bala@cloudextel.com,s.goenka@cloudextel.com,s.karra@cloudextel.com,b.chandak@cloudextel.com,r.vyawahare@cloudextel.com,k.bajaj@cloudextel.com,y.upadhyay@cloudextel.com,r.yadav1@cloudextel.com,v.saraf@cloudextel.com,v.raghuvanshi@cloudextel.com,d.saxena@cloudextel.com,v.shah@cloudextel.com
```

**Important**: Generate a new `NEXTAUTH_SECRET` for production:
```bash
openssl rand -base64 32
```

### Step 6: Process Excel File and Build Index

Upload Excel file to server:
```bash
# From local machine
scp "9 DOA - 2024-10-13 v2 BK.xlsx" root@139.59.72.225:/var/www/doa-chatbot/
```

On server, process the file:
```bash
cd /var/www/doa-chatbot
npm run process-doa
npm run build-index
```

### Step 7: Build Application

```bash
npm run build
```

### Step 8: Configure PM2

Create PM2 ecosystem file (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'doa-chatbot',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/doa-chatbot',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/doa-chatbot/error.log',
    out_file: '/var/log/doa-chatbot/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

Create log directory:
```bash
sudo mkdir -p /var/log/doa-chatbot
sudo chown -R $USER:$USER /var/log/doa-chatbot
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 9: Configure Nginx Reverse Proxy

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/doa-chatbot
```

Add configuration:
```nginx
server {
    listen 80;
    server_name doa.cloud www.doa.cloud;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name doa.cloud www.doa.cloud;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/doa.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/doa.cloud/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/doa-chatbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 10: SSL Certificate (Let's Encrypt)

Install Certbot:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

Obtain certificate:
```bash
sudo certbot --nginx -d doa.cloud -d www.doa.cloud
```

### Step 11: Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Step 12: Azure AD Configuration

1. Go to Azure Portal → App Registrations
2. Add redirect URI: `https://doa.cloud/api/auth/callback/azure-ad`
3. Update allowed redirect URIs

## Part 3: Post-Deployment Verification

### 1. Health Check
```bash
curl https://doa.cloud/api/health
```

### 2. Application Status
```bash
pm2 status
pm2 logs doa-chatbot
```

### 3. Test Authentication
- Visit https://doa.cloud
- Test Microsoft login
- Verify email whitelist works

### 4. Test Chat Functionality
- Ask a test question
- Verify response with sources

## Part 4: Maintenance & Updates

### Updating Application

```bash
cd /var/www/doa-chatbot
git pull origin main
npm install --production
npm run build
pm2 restart doa-chatbot
```

### Monitoring

```bash
# View logs
pm2 logs doa-chatbot

# Monitor resources
pm2 monit

# Check status
pm2 status
```

### Backup

Important files to backup:
- `/var/www/doa-chatbot/.env`
- `/var/www/doa-chatbot/data/processed/doa-chunks.json`
- `/var/www/doa-chatbot/9 DOA - 2024-10-13 v2 BK.xlsx`

## Troubleshooting

### Application won't start
- Check PM2 logs: `pm2 logs doa-chatbot`
- Verify environment variables: `cat .env`
- Check Node.js version: `node -v`
- Verify build: `npm run build`

### Authentication issues
- Verify Azure AD redirect URI matches production URL
- Check NEXTAUTH_URL in .env
- Verify NEXTAUTH_SECRET is set

### Vector store issues
- Rebuild index: `npm run build-index`
- Check processed chunks exist: `ls -la data/processed/`

### Nginx issues
- Test configuration: `sudo nginx -t`
- Check error logs: `sudo tail -f /var/log/nginx/error.log`

## Security Checklist

- [ ] Firewall configured (only 22, 80, 443 open)
- [ ] SSL certificate installed and valid
- [ ] Environment variables secured (not in git)
- [ ] PM2 running as non-root user
- [ ] Nginx configured with security headers
- [ ] Regular security updates: `sudo apt-get update && sudo apt-get upgrade`
- [ ] Backup strategy in place
- [ ] Monitoring/logging configured

## Performance Optimization

1. **Enable Gzip compression** in Nginx
2. **Configure caching** for static assets
3. **Monitor memory usage** (PM2 auto-restart on high memory)
4. **Consider CDN** for static assets
5. **Database/Vector Store**: Consider persistent vector store for production

## Support Contacts

- **Server**: 139.59.72.225
- **Domain**: doa.cloud
- **Repository**: viralji
