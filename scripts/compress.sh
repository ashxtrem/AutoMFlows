#!/bin/bash

# AutoMFlows Project Compression Script
# Compresses the entire project excluding node_modules and other build artifacts

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the project directory name
PROJECT_NAME=$(basename "$(pwd)")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="${PROJECT_NAME}_${TIMESTAMP}.zip"

echo -e "${BLUE}📦 Compressing AutoMFlows project...${NC}"

# Check if zip command is available
if ! command -v zip &> /dev/null; then
    echo -e "${YELLOW}❌ zip command not found. Please install zip utility.${NC}"
    echo -e "${YELLOW}   On macOS: brew install zip${NC}"
    echo -e "${YELLOW}   On Ubuntu/Debian: sudo apt-get install zip${NC}"
    exit 1
fi

# Build exclude patterns for zip
# zip uses -x flag for exclusions, and patterns need to be relative
EXCLUDE_PATTERNS=(
    "node_modules/*"
    "dist/*"
    "build/*"
    "output/*"
    ".vscode/*"
    ".idea/*"
    ".cache/*"
    ".temp/*"
    "coverage/*"
    ".nyc_output/*"
    ".npm/*"
    ".parcel-cache/*"
    ".next/*"
    ".nuxt/*"
    ".vite/*"
    "test-results/*"
    "playwright-report/*"
    "playwright/.cache/*"
    "screenshots/*"
    "videos/*"
    "blob-report/*"
    "logs/*"
    "__pycache__/*"
    "venv/*"
    "env/*"
    "ENV/*"
    "docker/data/*"
    "docker/volumes/*"
    "*.log"
    "*.tsbuildinfo"
    "*.db"
    "*.sqlite"
    "*.sqlite3"
    ".DS_Store"
    "*.swp"
    "*.swo"
    "*~"
    ".automflows-port"
    ".browserflow-port"
)

# Build exclude arguments for zip
EXCLUDE_ARGS=()
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    EXCLUDE_ARGS+=(-x "$pattern")
done

# Create the zip archive
echo "Creating zip archive..."
if zip -r -q "$ARCHIVE_NAME" . "${EXCLUDE_ARGS[@]}" 2>/dev/null; then
    ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
    echo -e "${GREEN}✅ Successfully created archive: ${ARCHIVE_NAME}${NC}"
    echo -e "${BLUE}📊 Archive size: ${ARCHIVE_SIZE}${NC}"
    echo -e "${YELLOW}💡 Location: $(pwd)/${ARCHIVE_NAME}${NC}"
else
    echo -e "${YELLOW}⚠️  zip with exclude patterns failed, trying alternative method...${NC}"
    
    # Alternative: Use find to create file list, then zip
    echo "Creating file list..."
    TEMP_FILE_LIST=$(mktemp)
    
    find . -type f \
        ! -path "*/node_modules/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/output/*" \
        ! -path "*/.vscode/*" \
        ! -path "*/.idea/*" \
        ! -path "*/.cache/*" \
        ! -path "*/.temp/*" \
        ! -path "*/coverage/*" \
        ! -path "*/.nyc_output/*" \
        ! -path "*/.npm/*" \
        ! -path "*/.parcel-cache/*" \
        ! -path "*/.next/*" \
        ! -path "*/.nuxt/*" \
        ! -path "*/.vite/*" \
        ! -path "*/test-results/*" \
        ! -path "*/playwright-report/*" \
        ! -path "*/playwright/.cache/*" \
        ! -path "*/screenshots/*" \
        ! -path "*/videos/*" \
        ! -path "*/blob-report/*" \
        ! -path "*/logs/*" \
        ! -path "*/__pycache__/*" \
        ! -path "*/venv/*" \
        ! -path "*/env/*" \
        ! -path "*/ENV/*" \
        ! -path "*/docker/data/*" \
        ! -path "*/docker/volumes/*" \
        ! -name "*.log" \
        ! -name "*.tsbuildinfo" \
        ! -name "*.db" \
        ! -name "*.sqlite" \
        ! -name "*.sqlite3" \
        ! -name ".DS_Store" \
        ! -name "*.swp" \
        ! -name "*.swo" \
        ! -name "*~" \
        ! -name ".automflows-port" \
        ! -name ".browserflow-port" \
        > "$TEMP_FILE_LIST"
    
    if [ -s "$TEMP_FILE_LIST" ]; then
        zip -q "$ARCHIVE_NAME" -@ < "$TEMP_FILE_LIST" 2>/dev/null
        rm -f "$TEMP_FILE_LIST"
        
        if [ $? -eq 0 ]; then
            ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
            echo -e "${GREEN}✅ Successfully created archive: ${ARCHIVE_NAME}${NC}"
            echo -e "${BLUE}📊 Archive size: ${ARCHIVE_SIZE}${NC}"
            echo -e "${YELLOW}💡 Location: $(pwd)/${ARCHIVE_NAME}${NC}"
        else
            rm -f "$TEMP_FILE_LIST"
            echo -e "${YELLOW}❌ Failed to create archive${NC}"
            exit 1
        fi
    else
        rm -f "$TEMP_FILE_LIST"
        echo -e "${YELLOW}❌ No files found to compress${NC}"
        exit 1
    fi
fi

echo -e "\n${GREEN}✨ Compression complete!${NC}"
