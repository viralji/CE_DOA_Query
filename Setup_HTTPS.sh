#!/bin/bash
# HTTPS Setup Script for DOA Chatbot
# Sets up Nginx reverse proxy and SSL certificate
# Domain: doa.cloudextel.com
# Server: 64.227.174.91

set -e

DOMAIN="doa.cloudextel.com"
APP_DIR="/var/www/CE_DOA_Query"

echo "=========================================="
echo "HTTPS Setup for DOA Chatbot"
echo "Domain: $DOMAIN"
echo "=========================================="
echo ""

# Step 1: Install Certbot
echo "Step 1: Installing Certbot..."
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Step 2: Create Nginx configuration
echo ""
echo "Step 2: Creating Nginx configuration..."
cat > /etc/nginx/sites-available/doa-chatbot << 'NGINX_EOF'
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name doa.cloudextel.com www.doa.cloudextel.com;

    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name doa.cloudextel.com www.doa.cloudextel.com;

    # SSL configuration (will be updated by Certbot)
    # ssl_certificate /etc/letsencrypt/live/doa.cloudextel.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/doa.cloudextel.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

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

    # Chat API - longer timeout (vector load + LLM can be slow)
    location /api/chat {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Health check endpoint (no logging)
    location /api/health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
NGINX_EOF

# Step 3: Enable site
echo ""
echo "Step 3: Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/doa-chatbot /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Step 4: Test Nginx configuration
echo ""
echo "Step 4: Testing Nginx configuration..."
nginx -t

# Step 5: Start/Reload Nginx
echo ""
echo "Step 5: Starting Nginx..."
systemctl enable nginx
systemctl restart nginx

# Step 6: Configure firewall
echo ""
echo "Step 6: Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Step 7: Obtain SSL certificate
echo ""
echo "Step 7: Obtaining SSL certificate from Let's Encrypt..."
echo "⚠️  IMPORTANT: Make sure DNS is configured to point $DOMAIN to this server IP!"
echo "   DNS A record: $DOMAIN -> 64.227.174.91"
echo ""
read -p "Press Enter to continue after DNS is configured..."

certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@cloudextel.com --redirect

# Step 8: Test SSL renewal
echo ""
echo "Step 8: Testing SSL certificate renewal..."
certbot renew --dry-run

# Step 9: Verify HTTPS
echo ""
echo "Step 9: Verifying HTTPS setup..."
sleep 3
curl -I https://$DOMAIN/api/health || echo "⚠️  HTTPS not accessible yet. Check DNS and firewall."

# Step 10: Update Azure AD redirect URI
echo ""
echo "=========================================="
echo "✅ HTTPS Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update Azure AD redirect URI:"
echo "   https://$DOMAIN/api/auth/callback/azure-ad"
echo ""
echo "2. Update .env file with production URL:"
echo "   NEXTAUTH_URL=https://$DOMAIN"
echo ""
echo "3. Restart application:"
echo "   cd $APP_DIR && pm2 restart doa-chatbot"
echo ""
echo "4. Test the application:"
echo "   https://$DOMAIN"
echo ""
