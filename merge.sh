#!/bin/bash

set -e

ROOT="resources"
OUTPUT="merged-UI-files.md"

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

  files=$(find "$ROOT" -type f "$@" 2>/dev/null | sort)

  if [ -n "$files" ]; then
    print_section "$title"

    echo "$files" | while IFS= read -r file
    do
      echo "Processing: $file"

      echo "## FILE: $file" >> "$OUTPUT"
      echo '```' >> "$OUTPUT"

      cat "$file" >> "$OUTPUT"

      echo '```' >> "$OUTPUT"
      echo "" >> "$OUTPUT"
    done
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
# الأقسام (مصححة)
# =========================================



# COMPONENTS
merge_section "🧠 COMPONENTS" \
  \( -path "*/components/*" \) "${EXCLUDE[@]}"




echo "   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة" >> "$OUTPUT"
echo "==================================================== */" >> "$OUTPUT"
echo "" >> "$OUTPUT"

echo "✅ Done: $OUTPUT"
