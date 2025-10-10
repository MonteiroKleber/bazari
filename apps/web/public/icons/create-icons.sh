#!/bin/bash
# Create placeholder PWA icons using ImageMagick (if available)
# For production, replace with actual designed icons

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
    # Create a simple gradient icon with "B" text
    convert -size 512x512 xc:'#000000' \
        -fill '#10b981' \
        -draw 'circle 256,256 256,50' \
        -fill white \
        -pointsize 300 \
        -font helvetica \
        -gravity center \
        -annotate +0+0 'B' \
        icon-512x512.png
    
    # Resize for 192x192
    convert icon-512x512.png -resize 192x192 icon-192x192.png
    
    echo "Icons created successfully!"
else
    # Fallback: Create simple colored PNG using base64
    # This is a 1x1 pixel PNG that will be used as placeholder
    echo "ImageMagick not found. Creating placeholder icons..."
    
    # 512x512 placeholder (green circle)
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > icon-192x192.png
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > icon-512x512.png
    
    echo "Placeholder icons created. Please replace with actual icons for production."
fi
