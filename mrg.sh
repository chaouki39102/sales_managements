#!/bin/bash

OUTPUT="FULL_DATATABLE_CODE.md"

> "$OUTPUT"


find resources/js/components/ui/DataTable/*. \
     -type f \( \
        -name "*.ts" -o \
        -name "*.tsx" -o \
        -name "*.js" -o \
        -name "*.jsx" \
     \) | sort | while read file
do
    echo "# FILE: $file" >> "$OUTPUT"
    echo "" >> "$OUTPUT"

    echo '```'"$(basename "$file" | sed 's/.*\.//')" >> "$OUTPUT"
    cat "$file" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo "---" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
done

echo "Generated $OUTPUT"
