#!/bin/bash

set -e

OUTPUT="PAYMENT_MODULE_FULL_CODE.txt"

FILES=(
# =========================================================
# Backend - Models
# =========================================================
"app/Models/Payment.php"
"app/Models/PaymentMode.php"
"app/Models/DocumentPayment.php"
"app/Models/PosSessionPayment.php"

# =========================================================
# Backend - Controllers
# =========================================================
"app/Http/Controllers/Api/V1/PaymentController.php"
"app/Http/Controllers/Api/V1/PaymentModeController.php"

# =========================================================
# Backend - Services
# =========================================================
"app/Services/PaymentService.php"
"app/Services/PaymentModeService.php"
"app/Services/AdvancePaymentService.php"
"app/Services/BankReconciliationService.php"
"app/Services/TreasuryBalanceService.php"
"app/Services/ReportService.php"

# =========================================================
# Backend - Requests
# =========================================================
"app/Http/Requests/StorePaymentRequest.php"
"app/Http/Requests/UpdatePaymentRequest.php"
"app/Http/Requests/StorePaymentModeRequest.php"
"app/Http/Requests/UpdatePaymentModeRequest.php"
"app/Http/Requests/PaymentModeRequest.php"

# =========================================================
# Backend - Resources
# =========================================================
"app/Http/Resources/PaymentResource.php"
"app/Http/Resources/PaymentModeResource.php"

# =========================================================
# Backend - Policies
# =========================================================
"app/Policies/PaymentPolicy.php"
"app/Policies/PaymentModePolicy.php"
"app/Policies/DocumentPaymentPolicy.php"

# =========================================================
# Backend - Migrations
# =========================================================
"database/migrations/2025_10_15_094115_create_payments_table.php"
"database/migrations/2025_10_15_094120_create_document_payment_table.php"
"database/migrations/2025_10_15_094104_create_payment_modes_table.php"

# =========================================================
# Backend - Seeders
# =========================================================
"database/seeders/PaymentModeSeeder.php"

# =========================================================
# Frontend - API
# =========================================================
"resources/js/lib/api/endpoints/payments.ts"
"resources/js/lib/api/core/types.ts"
"resources/js/lib/api/core/queryKeys.ts"

# =========================================================
# POS
# =========================================================
"resources/js/pos/components/ProfessionalPaymentModal.tsx"
"resources/js/pos/utils/useCartStore.ts"
"resources/js/pos/hooks/usePOSStore.ts"
"resources/js/pos/hooks/usePOS.ts"

# =========================================================
# Documents
# =========================================================
"resources/js/pages/documents/CommercialDocumentModal/DocumentPaymentsSection.tsx"
"resources/js/pages/documents/components/PaymentTermsTable.tsx"
"resources/js/pages/documents/components/AdvancePaymentsPanel.tsx"
"resources/js/pages/documents/hooks/useAdvancePayments.ts"

# =========================================================
# Settings
# =========================================================
"resources/js/pages/settings/PaymentMethodsPage.tsx"
"resources/js/pages/settings/print-settings/sections/PaymentsSection.tsx"
"resources/js/pages/settings/print-settings/components/preview/PaymentsSection.tsx"

# =========================================================
# Template
# =========================================================
"app/Services/TemplateLibraryService.php"
)

echo "=====================================================" > "$OUTPUT"
echo " PAYMENT MODULE COMPLETE EXPORT" >> "$OUTPUT"
echo " Generated: $(date)" >> "$OUTPUT"
echo "=====================================================" >> "$OUTPUT"
echo "" >> "$OUTPUT"

COUNT=0
FOUND=0

for file in "${FILES[@]}"; do
    COUNT=$((COUNT+1))

    if [ -f "$file" ]; then
        FOUND=$((FOUND+1))

        echo "Processing: $file"

        {
            echo ""
            echo "################################################################################"
            echo "# FILE $FOUND"
            echo "# PATH: $file"
            echo "################################################################################"
            echo ""
            cat "$file"
            echo ""
            echo ""
        } >> "$OUTPUT"

    else
        echo "Missing: $file"

        {
            echo ""
            echo "################################################################################"
            echo "# MISSING FILE"
            echo "# PATH: $file"
            echo "################################################################################"
            echo ""
        } >> "$OUTPUT"
    fi
done

echo ""
echo "====================================================="
echo "Done."
echo "Files listed : $COUNT"
echo "Files found  : $FOUND"
echo "Output       : $OUTPUT"
echo "====================================================="
