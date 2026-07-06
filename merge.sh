#!/bin/bash

set -e

ROOT="resources"
OUTPUT="merged-lib-api-files.md"

> "$OUTPUT"

echo "🚀 Generating structured code export..."

# =========================================
# دالة لكتابة قسم
# =========================================
print_section() {
  echo -e "\n\n# =========================================" >> "$OUTPUT"
  echo "# $1" >> "$OUTPUT"
  echo -e "# =========================================\n" >> "$OUTPUT"
}

# =========================================
# دالة دمج الملفات
# =========================================
merge_section() {
  local title="$1"
  shift

  files=$(find "$ROOT" -type f "$@" "${EXCLUDE[@]}" 2>/dev/null | sort)

  if [ -n "$files" ]; then
    print_section "$title"

    echo "$files" | while IFS= read -r file
    do
      echo "Processing: $file"

      echo "## FILE: $file" >> "$OUTPUT"
      echo '```' >> "$OUTPUT"

      cat "$file" >> "$OUTPUT"

      echo "" >> "$OUTPUT"
      echo '```' >> "$OUTPUT"
      echo "" >> "$OUTPUT"
    done
  else
    echo "⚠️ No files found for section: $title"
  fi
}

# =========================================
# تجاهل
# =========================================
EXCLUDE=(
  -not -path "*/node_modules/*"
  -not -path "*/vendor/*"
  -not -path "*/.git/*"
)

# =========================================
# الأقسام
# =========================================

# merge_section "📘 CommercialDocument" \
#   \( -path "*/pages/documents/*" \)

merge_section "📘 core" \
  \( -path "*/lib/api/core/*" \)

  merge_section "📘 endpoints" \
  \( -path "*/lib/api/endpoints/*" \)


# أمثلة لإضافة أقسام أخرى:
#
# merge_section "📘 POS Components" \
#   \( -path "*/pos/components/*" \)
#
# merge_section "📘 Payment System" \
#   \( \
#      -path "*/services/payment/*" \
#      -o -path "*/hooks/payment/*" \
#      -o -path "*/pages/payment/*" \)
#   \)

echo "" >> "$OUTPUT"
echo "====================================================" >> "$OUTPUT"
echo "⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة" >> "$OUTPUT"
echo "====================================================" >> "$OUTPUT"

echo "✅ Done: $OUTPUT"
