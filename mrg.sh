#!/bin/bash

# المجلد المصدر (تقدر تمرره كـ argument)
SOURCE_DIR=${1:-.}

# اسم الملف الناتج
OUTPUT_FILE="merged-ui.ts"

# حذف الملف القديم إن وجد
> "$OUTPUT_FILE"

# كتابة Header في الأعلى
echo "/* ====================================================" >> "$OUTPUT_FILE"
echo "   ⚠️ هذا الملف عبارة عن دمج لعدة ملفات من المشروع" >> "$OUTPUT_FILE"
echo "   ⚠️ الملفات الأصلية مازالت منفصلة داخل المشروع" >> "$OUTPUT_FILE"
echo "   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة" >> "$OUTPUT_FILE"
echo "==================================================== */" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# دمج الملفات
find "$SOURCE_DIR" -type f -name "*.ts" | sort | while read file
do
    echo "" >> "$OUTPUT_FILE"
    echo "// ===== FILE: $file =====" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

echo "✅ تم إنشاء الملف: $OUTPUT_FILE"
