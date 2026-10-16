#!/bin/bash

# ============================================================================
# OSCAR Flower Build and Deploy Script
# ============================================================================
# This script packages the checked-in Flower assets and copies the wheel to taskmanager.
# Rebuild vendored Bootstrap assets with scss/build.sh only when scss/flower.scss changes.
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

cd "$(dirname "$0")"
TASKMANAGER_DIR="${TASKMANAGER_WHEELS_DIR:-../oscar/oscar-taskmanager/wheels}"
if [ ! -f "$(dirname "$TASKMANAGER_DIR")/Dockerfile" ]; then
  echo "Taskmanager checkout not found; set TASKMANAGER_WHEELS_DIR to its wheels directory." >&2
  exit 1
fi

echo -e "${GREEN}[1/3] Cleaning old builds...${NC}"
rm -rf build/ dist/ *.egg-info
echo -e "${GREEN}✓ Old builds cleaned${NC}"
echo ""

echo -e "${GREEN}[2/3] Building wheel package...${NC}"
python setup.py sdist bdist_wheel
WHEEL_FILE=$(ls dist/oscar_flower-*.whl)
WHEEL_NAME=$(basename "$WHEEL_FILE")
echo -e "${GREEN}✓ Built: $WHEEL_NAME${NC}"
echo ""

echo -e "${GREEN}[3/3] Deploying to taskmanager...${NC}"

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
