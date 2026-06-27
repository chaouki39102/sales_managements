#!/bin/bash

OUTPUT="REPORTING_FRAMEWORK_SOURCE.md"

> "$OUTPUT"

find resources/js/reporting \
     resources/js/pages/settings \
     resources/js/pages/documents \
     resources/js/pos/components \
     resources/js/components/ui \
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
