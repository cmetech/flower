#!/bin/bash

# ============================================================================
# OSCAR Flower Build and Deploy Script
# ============================================================================
# This script rebuilds the oscar-flower wheel and deploys it to taskmanager
# After running this, simply execute: ./oscar compile taskmanager
# ============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}OSCAR Flower Build & Deploy${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Step 1: Compile SCSS to CSS
echo -e "${GREEN}[1/4] Compiling SCSS to CSS...${NC}"
cd "$(dirname "$0")"
npx sass bootstrap-scss/flower.scss:flower/static/css/flower.css --style compressed
echo -e "${GREEN}✓ SCSS compiled successfully${NC}"
echo ""

# Step 2: Clean old builds
echo -e "${GREEN}[2/4] Cleaning old builds...${NC}"
rm -rf build/ dist/ *.egg-info
echo -e "${GREEN}✓ Old builds cleaned${NC}"
echo ""

# Step 3: Build wheel
echo -e "${GREEN}[3/4] Building wheel package...${NC}"
python setup.py sdist bdist_wheel
WHEEL_FILE=$(ls dist/oscar_flower-*.whl)
WHEEL_NAME=$(basename "$WHEEL_FILE")
echo -e "${GREEN}✓ Built: $WHEEL_NAME${NC}"
echo ""

# Step 4: Copy to taskmanager
echo -e "${GREEN}[4/4] Deploying to taskmanager...${NC}"
TASKMANAGER_DIR="../oscar/oscar-taskmanager/wheels"

# Create wheels directory if it doesn't exist
mkdir -p "$TASKMANAGER_DIR"

# Remove old oscar-flower wheels
rm -f "$TASKMANAGER_DIR"/oscar_flower-*.whl

# Copy new wheel
cp "$WHEEL_FILE" "$TASKMANAGER_DIR/"
echo -e "${GREEN}✓ Copied to: $TASKMANAGER_DIR/$WHEEL_NAME${NC}"
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}✓ Build and deploy complete!${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${YELLOW}Next step:${NC}"
echo -e "  cd ../oscar && ./oscar compile taskmanager"
echo ""
echo -e "${YELLOW}Then restart to apply changes:${NC}"
echo -e "  ./oscar restart taskmanager"
echo -e "  ./oscar restart flower"
echo ""
