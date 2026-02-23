#!/bin/bash
# HTTPS Setup Commands for Wildcard SSL
# Run these commands on the server

DOMAIN="doa.cloudextel.com"
APP_DIR="/var/www/CE_DOA_Query"
SSL_DIR="/etc/ssl/cloudextel"

# Step 1: Process SSL certificates
echo "Step 1: Processing SSL certificates..."
cd $SSL_DIR

# Convert certificates to PEM format
openssl x509 -inform DER -in "EndEntity_wc.cloudextel.com.cer" -out cert.pem
openssl x509 -inform DER -in "CA_emSign SSL CA - G1.cer" -out intermediate.pem
openssl x509 -inform DER -in "RootCA_emSign Root CA - G1.cer" -out root.pem

# Create fullchain
cat cert.pem > fullchain.pem
cat intermediate.pem >> fullchain.pem
cat root.pem >> fullchain.pem

# Copy private key
cp "Private Key.txt" privkey.pem

# Set permissions
chmod 644 fullchain.pem cert.pem
chmod 600 privkey.pem

echo "✅ Certificates processed"

# Step 2: Create Nginx configuration
echo ""
echo "Step 2: Creating Nginx configuration..."
cat > /etc/nginx/sites-available/doa-chatbot << 'NGINX_EOF'
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name doa.cloudextel.com www.doa.cloudextel.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name doa.cloudextel.com www.doa.cloudextel.com;

    # SSL configuration
    ssl_certificate /etc/ssl/cloudextel/fullchain.pem;
    ssl_certificate_key /etc/ssl/cloudextel/privkey.pem;
    
    # SSL protocols and ciphers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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

# Step 4: Test Nginx
echo ""
echo "Step 4: Testing Nginx configuration..."
nginx -t

# Step 5: Reload Nginx
echo ""
echo "Step 5: Reloading Nginx..."
systemctl reload nginx

# Step 6: Update .env
echo ""
echo "Step 6: Updating .env file..."
cd $APP_DIR
if grep -q "NEXTAUTH_URL" .env; then
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|" .env
else
    echo "NEXTAUTH_URL=https://$DOMAIN" >> .env
fi

# Step 7: Restart application
echo ""
echo "Step 7: Restarting application..."
pm2 restart doa-chatbot

# Step 8: Verify
echo ""
echo "Step 8: Verifying HTTPS..."
sleep 3
curl -I https://$DOMAIN/api/health

echo ""
echo "✅ HTTPS Setup Complete!"
echo "Application available at: https://$DOMAIN"
