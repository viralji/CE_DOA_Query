#!/bin/bash
# HTTPS Setup Script for DOA Chatbot using Wildcard SSL
# Sets up Nginx reverse proxy with existing wildcard SSL certificate
# Domain: doa.cloudextel.com
# Server: 64.227.174.91

set -e

DOMAIN="doa.cloudextel.com"
APP_DIR="/var/www/CE_DOA_Query"
SSL_DIR="/etc/ssl/cloudextel"

echo "=========================================="
echo "HTTPS Setup for DOA Chatbot (Wildcard SSL)"
echo "Domain: $DOMAIN"
echo "=========================================="
echo ""

# Step 1: Create SSL directory
echo "Step 1: Creating SSL directory..."
mkdir -p $SSL_DIR
chmod 755 $SSL_DIR

# Step 2: Upload SSL files (will be done manually or via scp)
echo ""
echo "Step 2: SSL Certificate Files Required"
echo "======================================"
echo "Please ensure these files are uploaded to: $SSL_DIR/"
echo "  - EndEntity_wc.cloudextel.com.cer (main certificate)"
echo "  - CA_emSign SSL CA - G1.cer (intermediate certificate)"
echo "  - RootCA_emSign Root CA - G1.cer (root certificate)"
echo "  - Private Key.txt (private key)"
echo ""
read -p "Press Enter after uploading SSL files to $SSL_DIR/..."

# Step 3: Verify SSL files exist
echo ""
echo "Step 3: Verifying SSL files..."
if [ ! -f "$SSL_DIR/EndEntity_wc.cloudextel.com.cer" ]; then
    echo "❌ Error: EndEntity_wc.cloudextel.com.cer not found!"
    exit 1
fi
if [ ! -f "$SSL_DIR/Private Key.txt" ]; then
    echo "❌ Error: Private Key.txt not found!"
    exit 1
fi
echo "✅ SSL files found"

# Step 4: Convert and combine certificates
echo ""
echo "Step 4: Processing SSL certificates..."
# Convert main certificate to PEM if needed
if ! grep -q "BEGIN CERTIFICATE" "$SSL_DIR/EndEntity_wc.cloudextel.com.cer"; then
    openssl x509 -inform DER -in "$SSL_DIR/EndEntity_wc.cloudextel.com.cer" -out "$SSL_DIR/cert.pem"
else
    cp "$SSL_DIR/EndEntity_wc.cloudextel.com.cer" "$SSL_DIR/cert.pem"
fi

# Convert intermediate certificate to PEM if needed
if [ -f "$SSL_DIR/CA_emSign SSL CA - G1.cer" ]; then
    if ! grep -q "BEGIN CERTIFICATE" "$SSL_DIR/CA_emSign SSL CA - G1.cer"; then
        openssl x509 -inform DER -in "$SSL_DIR/CA_emSign SSL CA - G1.cer" -out "$SSL_DIR/intermediate.pem"
    else
        cp "$SSL_DIR/CA_emSign SSL CA - G1.cer" "$SSL_DIR/intermediate.pem"
    fi
fi

# Combine certificates into fullchain
cat "$SSL_DIR/cert.pem" > "$SSL_DIR/fullchain.pem"
if [ -f "$SSL_DIR/intermediate.pem" ]; then
    cat "$SSL_DIR/intermediate.pem" >> "$SSL_DIR/fullchain.pem"
fi
if [ -f "$SSL_DIR/RootCA_emSign Root CA - G1.cer" ]; then
    if ! grep -q "BEGIN CERTIFICATE" "$SSL_DIR/RootCA_emSign Root CA - G1.cer"; then
        openssl x509 -inform DER -in "$SSL_DIR/RootCA_emSign Root CA - G1.cer" >> "$SSL_DIR/fullchain.pem" 2>/dev/null || true
    else
        cat "$SSL_DIR/RootCA_emSign Root CA - G1.cer" >> "$SSL_DIR/fullchain.pem"
    fi
fi

# Process private key
if ! grep -q "BEGIN.*PRIVATE KEY" "$SSL_DIR/Private Key.txt"; then
    # Try to convert if it's in different format
    openssl rsa -in "$SSL_DIR/Private Key.txt" -out "$SSL_DIR/privkey.pem" 2>/dev/null || \
    openssl pkcs8 -in "$SSL_DIR/Private Key.txt" -out "$SSL_DIR/privkey.pem" 2>/dev/null || \
    cp "$SSL_DIR/Private Key.txt" "$SSL_DIR/privkey.pem"
else
    cp "$SSL_DIR/Private Key.txt" "$SSL_DIR/privkey.pem"
fi

# Set proper permissions
chmod 644 "$SSL_DIR/fullchain.pem"
chmod 600 "$SSL_DIR/privkey.pem"
chmod 644 "$SSL_DIR/cert.pem"

echo "✅ Certificates processed"

# Step 5: Create Nginx configuration
echo ""
echo "Step 5: Creating Nginx configuration..."
cat > /etc/nginx/sites-available/doa-chatbot << NGINX_EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name doa.cloudextel.com www.doa.cloudextel.com;

    # Redirect all traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name doa.cloudextel.com www.doa.cloudextel.com;

    # SSL configuration
    ssl_certificate $SSL_DIR/fullchain.pem;
    ssl_certificate_key $SSL_DIR/privkey.pem;
    
    # SSL protocols and ciphers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Chat API - longer timeout (vector load + LLM can be slow)
    location /api/chat {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
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

# Step 6: Enable site
echo ""
echo "Step 6: Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/doa-chatbot /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Step 7: Test Nginx configuration
echo ""
echo "Step 7: Testing Nginx configuration..."
nginx -t

# Step 8: Reload Nginx
echo ""
echo "Step 8: Reloading Nginx..."
systemctl reload nginx

# Step 9: Configure firewall
echo ""
echo "Step 9: Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Step 10: Verify HTTPS
echo ""
echo "Step 10: Verifying HTTPS setup..."
sleep 3
curl -I https://$DOMAIN/api/health 2>&1 | head -10 || echo "⚠️  Testing HTTPS connection..."

# Step 11: Update .env file
echo ""
echo "Step 11: Updating .env file..."
if [ -f "$APP_DIR/.env" ]; then
    # Update NEXTAUTH_URL if it exists
    if grep -q "NEXTAUTH_URL" "$APP_DIR/.env"; then
        sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|" "$APP_DIR/.env"
    else
        echo "NEXTAUTH_URL=https://$DOMAIN" >> "$APP_DIR/.env"
    fi
    echo "✅ .env updated"
else
    echo "⚠️  .env file not found at $APP_DIR/.env"
fi

# Step 12: Restart application
echo ""
echo "Step 12: Restarting application..."
cd $APP_DIR
pm2 restart doa-chatbot

echo ""
echo "=========================================="
echo "✅ HTTPS Setup Complete!"
echo "=========================================="
echo ""
echo "Application is now available at:"
echo "  https://$DOMAIN"
echo ""
echo "Next steps:"
echo "1. Update Azure AD redirect URI:"
echo "   https://$DOMAIN/api/auth/callback/azure-ad"
echo ""
echo "2. Test the application:"
echo "   https://$DOMAIN"
echo ""
