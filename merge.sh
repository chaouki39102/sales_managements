#!/bin/bash

set -e

ROOT="."
OUTDIR="merged-print-files"

rm -rf "$OUTDIR"
mkdir -p "$OUTDIR"

echo "🚀 Generating structured code export per section..."

# =========================================
# دالة لكتابة ملف قسم
# =========================================
merge_section() {
  local filename="$1"
  local title="$2"
  shift 2

  local outfile="$OUTDIR/$filename.md"
  > "$outfile"

  echo -e "# $title\n" >> "$outfile"

  files=$(find "$ROOT" -type f "$@" "${EXCLUDE[@]}" 2>/dev/null | sort)

  if [ -n "$files" ]; then
    echo "$files" | while IFS= read -r file; do
      echo "  $file"
      echo -e "\n## FILE: $file\n" >> "$outfile"
      echo '```' >> "$outfile"
      cat "$file" >> "$outfile"
      echo "" >> "$outfile"
      echo '```' >> "$outfile"
    done
    echo "✅ $filename.md ($(echo "$files" | wc -l | tr -d ' ') files)"
  else
    echo "⚠️  No files: $title"
  fi
}

# =========================================
# دالة دمج ملفات محددة بالاسم
# =========================================
merge_files() {
  local filename="$1"
  local title="$2"
  shift 2

  local outfile="$OUTDIR/$filename.md"
  > "$outfile"

  echo -e "# $title\n" >> "$outfile"

  local count=0
  for file in "$@"; do
    if [ -f "$ROOT/$file" ]; then
      echo "  $ROOT/$file"
      echo -e "\n## FILE: $ROOT/$file\n" >> "$outfile"
      echo '```' >> "$outfile"
      cat "$ROOT/$file" >> "$outfile"
      echo "" >> "$outfile"
      echo '```' >> "$outfile"
      count=$((count + 1))
    else
      echo "⚠️  Not found: $ROOT/$file"
    fi
  done
  echo "✅ $filename.md ($count files)"
}

# =========================================
# دالة استخراج أجزاء من ملف كبير
# =========================================
merge_grep() {
  local filename="$1"
  local title="$2"
  shift 2

  local outfile="$OUTDIR/$filename.md"
  > "$outfile"

  echo -e "# $title\n" >> "$outfile"

  local count=0
  for file in "$@"; do
    if [ -f "$ROOT/$file" ]; then
      echo "  $ROOT/$file (filtered)"
      echo -e "\n## FILE: $ROOT/$file (print-templates section)\n" >> "$outfile"
      echo '```php' >> "$outfile"
      grep -n 'print-template\|PrintTemplate\|print_template' "$ROOT/$file" >> "$outfile" 2>/dev/null || true
      echo "" >> "$outfile"
      echo '```' >> "$outfile"
      count=$((count + 1))
    fi
  done
  echo "✅ $filename.md ($count files, filtered)"
}

# =========================================
# تجاهل
# =========================================
EXCLUDE=(
  -not -path "*/node_modules/*"
  -not -path "*/vendor/*"
  -not -path "*/.git/*"
)

echo ""
echo "═══════════════════════════════════════════"
echo "  📘 POS Components"
echo "═══════════════════════════════════════════"
merge_section "01-pos-components" "📘 POS Components" \
  \( -path "*/resources/js/pos/*" -name "*.ts" -o -path "*/resources/js/pos/*" -name "*.tsx" \)

echo ""
echo "═══════════════════════════════════════════"
echo "  🖨️ Print Settings — Core Module"
echo "═══════════════════════════════════════════"
merge_section "02-print-core" "🖨️ Print Settings — Core Module (types, services, components, sections)" \
  \( -path "*/print-settings/types/*" -o -path "*/print-settings/services/*" \
     -o -path "*/print-settings/components/*" -o -path "*/print-settings/sections/*" \
     -o -path "*/print-settings/providers/*" -o -path "*/print-settings/engines/*" \
     -o -path "*/print-settings/contracts/*" -o -path "*/print-settings/renderers/*" \
     -o -path "*/print-settings/theme/*" -o -path "*/print-settings/utils/*" \
     -o -path "*/print-settings/template-library/*" \)

echo ""
echo "═══════════════════════════════════════════"
echo "  🖨️ Print Settings — Runtime"
echo "═══════════════════════════════════════════"
merge_section "03-print-runtime" "🖨️ Print Settings — Runtime (bridge, pipeline, resolver)" \
  \( -path "*/print-settings/runtime/*" \)

echo ""
echo "═══════════════════════════════════════════"
echo "  🖨️ Print Settings — API + Page + Tests"
echo "═══════════════════════════════════════════"
merge_section "04-print-page-tests" "🖨️ Print Settings — API + Page + Tests" \
  \( -path "*/print-settings/api/*" -o -path "*/print-settings/__tests__/*" \
     -o -name "PrintSettingsPage.tsx" -path "*/print-settings/*" \
     -o -name "index.ts" -path "*/print-settings/*" \
     -o -name "types.ts" -path "*/print-settings/*" \
     -o -name "ARCHITECTURE.md" -path "*/print-settings/*" \)

echo ""
echo "═══════════════════════════════════════════"
echo "  🖨️ Print Settings Adapter + POS Print"
echo "═══════════════════════════════════════════"
merge_files "05-pos-print-integration" "🖨️ Print Settings Adapter + POS Print Integration" \
  "resources/js/pages/settings/print-settings-adapter.tsx" \
  "resources/js/pos/hooks/usePrintSettings.ts" \
  "resources/js/pos/utils/printService.ts" \
  "resources/js/pos/utils/printUtils.ts" \
  "resources/js/pos/store/printStore.ts"

echo ""
echo "═══════════════════════════════════════════"
echo "  🖨️ Print Consumers"
echo "═══════════════════════════════════════════"
merge_section "06-print-consumers" "🖨️ Print Consumers (BatchPrintModal, ProfessionalReceipt)" \
  \( -path "*/documents/components/BatchPrintModal.tsx" \
     -o -path "*/pos/components/ProfessionalReceipt.tsx" \)

echo ""
echo "═══════════════════════════════════════════"
echo "  🖨️ Backend — Model + Controller"
echo "═══════════════════════════════════════════"
merge_section "07-backend-model-controller" "🖨️ Backend — Model + Controller" \
  \( -path "*/app/Models/PrintTemplate.php" \
     -o -path "*/app/Http/Controllers/Api/V1/PrintTemplateController.php" \)

echo ""
echo "═══════════════════════════════════════════"
echo "  🖨️ Backend — Migrations + Seeder"
echo "═══════════════════════════════════════════"
merge_section "08-backend-migrations-seeder" "🖨️ Backend — Migrations + Seeder" \
  \( -path "*/database/migrations/*print_templates*" \
     -o -path "*/database/seeders/PrintTemplateSeeder.php" \)

echo ""
echo "═══════════════════════════════════════════"
echo "  🖨️ Backend — Routes"
echo "═══════════════════════════════════════════"
merge_grep "09-backend-routes" "🖨️ Backend — Routes (print-templates section from api.php)" \
  "routes/api.php"

echo ""
echo "===================================================="
echo "✅ All sections exported to: $OUTDIR/"
echo "===================================================="
ls -la "$OUTDIR"/*.md 2>/dev/null || dir "$OUTDIR"\\*.md
