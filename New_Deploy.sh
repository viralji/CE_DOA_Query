#!/bin/bash
# New Deployment Script for DOA Chatbot
# Use this for fresh deployments on a new server
# Server: 64.227.174.91

set -e

SSH_KEY="$HOME/.ssh/do_64.227.174.91"
SERVER="root@64.227.174.91"
APP_DIR="/var/www/CE_DOA_Query"
REPO_URL="git@github.com:viralji/CE_DOA_Query.git"

echo "=========================================="
echo "DOA Chatbot - New Deployment"
echo "=========================================="
echo ""

# Step 1: Install prerequisites
echo "Step 1: Installing prerequisites..."
ssh -i "$SSH_KEY" "$SERVER" << 'EOF'
apt-get update
apt-get install -y curl git build-essential
EOF

# Step 2: Install Node.js 18
echo ""
echo "Step 2: Installing Node.js 18..."
ssh -i "$SSH_KEY" "$SERVER" << 'EOF'
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node -v
npm -v
EOF

# Step 3: Install PM2
echo ""
echo "Step 3: Installing PM2..."
ssh -i "$SSH_KEY" "$SERVER" "npm install -g pm2"

# Step 4: Install Nginx
echo ""
echo "Step 4: Installing Nginx..."
ssh -i "$SSH_KEY" "$SERVER" "apt-get install -y nginx"

# Step 5: Create directory and clone repository
echo ""
echo "Step 5: Creating directory and cloning repository..."
ssh -i "$SSH_KEY" "$SERVER" << EOF
mkdir -p $APP_DIR
cd $APP_DIR
if [ -d ".git" ]; then
    echo "Repository exists, pulling latest..."
    git pull origin main
else
    echo "Cloning repository..."
    git clone $REPO_URL .
fi
EOF

# Step 6: Install dependencies
echo ""
echo "Step 6: Installing dependencies..."
ssh -i "$SSH_KEY" "$SERVER" "cd $APP_DIR && npm install"

# Step 7: Upload .env file
echo ""
echo "Step 7: Uploading .env file..."
if [ -f ".env" ]; then
    cat .env | ssh -i "$SSH_KEY" "$SERVER" "cat > $APP_DIR/.env"
    echo "✅ .env uploaded"
else
    echo "⚠️  WARNING: .env file not found locally!"
    echo "   Please create .env on server manually:"
    echo "   ssh -i $SSH_KEY $SERVER 'nano $APP_DIR/.env'"
fi

# Step 8: Upload Excel file
echo ""
echo "Step 8: Uploading Excel file..."
if [ -f "9 DOA - 2024-10-13 v2 BK.xlsx" ]; then
    base64 -w0 "9 DOA - 2024-10-13 v2 BK.xlsx" | ssh -i "$SSH_KEY" "$SERVER" "base64 -d > '$APP_DIR/9 DOA - 2024-10-13 v2 BK.xlsx'"
    echo "✅ Excel file uploaded"
else
    echo "⚠️  WARNING: Excel file not found locally!"
    echo "   Please upload manually:"
    echo "   scp -i $SSH_KEY '9 DOA - 2024-10-13 v2 BK.xlsx' $SERVER:$APP_DIR/"
fi

# Step 9: Process data
echo ""
echo "Step 9: Processing Excel file and building index..."
ssh -i "$SSH_KEY" "$SERVER" << EOF
cd $APP_DIR
npm run process-doa
npm run build-index
EOF

# Step 10: Build application
echo ""
echo "Step 10: Building application..."
ssh -i "$SSH_KEY" "$SERVER" "cd $APP_DIR && npm run build"

# Step 11: Start with PM2
echo ""
echo "Step 11: Starting application with PM2..."
ssh -i "$SSH_KEY" "$SERVER" << EOF
cd $APP_DIR
pm2 delete doa-chatbot 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup
EOF

# Step 12: Verify deployment
echo ""
echo "Step 12: Verifying deployment..."
sleep 5
ssh -i "$SSH_KEY" "$SERVER" << 'EOF'
pm2 status
echo ""
echo "Testing health endpoint..."
curl -s http://localhost:3000/api/health | head -1
echo ""
EOF

echo ""
echo "=========================================="
echo "✅ New Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Configure Nginx reverse proxy"
echo "2. Set up SSL certificate"
echo "3. Configure firewall"
echo ""
