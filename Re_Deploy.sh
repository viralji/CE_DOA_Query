#!/bin/bash
# Re-Deployment Script for DOA Chatbot
# Use this for updating an existing deployment
# Server: 64.227.174.91

set -e

SSH_KEY="$HOME/.ssh/do_64.227.174.91"
SERVER="root@64.227.174.91"
APP_DIR="/var/www/CE_DOA_Query"

echo "=========================================="
echo "DOA Chatbot - Re-Deployment (Update)"
echo "=========================================="
echo ""

# Step 1: Pull latest code
echo "Step 1: Pulling latest code from repository..."
ssh -i "$SSH_KEY" "$SERVER" << EOF
cd $APP_DIR
git pull origin main
EOF

# Step 2: Install/update dependencies
echo ""
echo "Step 2: Installing/updating dependencies..."
ssh -i "$SSH_KEY" "$SERVER" "cd $APP_DIR && npm install"

# Step 3: Rebuild application
echo ""
echo "Step 3: Rebuilding application..."
ssh -i "$SSH_KEY" "$SERVER" << EOF
cd $APP_DIR
rm -rf .next
npm run build
EOF

# Step 4: Restart PM2
echo ""
echo "Step 4: Restarting application..."
ssh -i "$SSH_KEY" "$SERVER" << EOF
cd $APP_DIR
pm2 restart doa-chatbot
EOF

# Step 5: Verify deployment
echo ""
echo "Step 5: Verifying deployment..."
sleep 5
ssh -i "$SSH_KEY" "$SERVER" << 'EOF'
pm2 status
echo ""
echo "Testing health endpoint..."
curl -s http://localhost:3000/api/health | head -1
echo ""
echo "Recent logs:"
pm2 logs doa-chatbot --lines 10 --nostream
EOF

echo ""
echo "=========================================="
echo "✅ Re-Deployment Complete!"
echo "=========================================="
echo ""
