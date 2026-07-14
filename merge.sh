#!/bin/bash

set -e

ROOT="."
OUTDIR="merged-files"

rm -rf "$OUTDIR"
mkdir -p "$OUTDIR"

OUTFILE="$OUTDIR/DataTable.md"

echo "# DataTable Components" > "$OUTFILE"

echo "🚀 Merging DataTable..."

find "$ROOT/resources/js/components/ui/DataTable" \
    -type f \
    \( \
        -name "*.ts" -o \
        -name "*.tsx" -o \
        -name "*.js" -o \
        -name "*.jsx" \
    \) \
    | sort | while IFS= read -r file
do
    echo "Processing: $file"

    echo "" >> "$OUTFILE"
    echo "## FILE: $file" >> "$OUTFILE"
    echo "" >> "$OUTFILE"
    echo '```' >> "$OUTFILE"

    cat "$file" >> "$OUTFILE"

    echo "" >> "$OUTFILE"
    echo '```' >> "$OUTFILE"
done

echo ""
echo "======================================"
echo "✅ Done!"
echo "Output: $OUTFILE"
echo "======================================"
