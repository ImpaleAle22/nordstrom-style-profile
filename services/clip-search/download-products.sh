#!/bin/bash

# Download lightweight products file from R2 on startup
# Set PRODUCTS_FILE_URL environment variable in Railway/Render

if [ -f "products-lightweight.json" ]; then
    echo "✓ Products file already exists (cached)"
    exit 0
fi

if [ -z "$PRODUCTS_FILE_URL" ]; then
    echo "❌ ERROR: PRODUCTS_FILE_URL environment variable not set"
    echo "   Set it to your R2 URL for products-lightweight.json"
    exit 1
fi

echo "📥 Downloading products file from R2..."
echo "   URL: $PRODUCTS_FILE_URL"

curl -f -L -o products-lightweight.json "$PRODUCTS_FILE_URL"

if [ $? -eq 0 ]; then
    echo "✓ Download complete!"
    ls -lh products-lightweight.json
else
    echo "❌ Download failed"
    exit 1
fi
