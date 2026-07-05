$OutputFile = "payment-system-merged.txt"

$Files = @(
"resources/js/pos/components/ProfessionalPaymentModal.tsx",
"resources/js/pages/pos/POSPage.tsx",
"resources/js/pages/pos/POSKiosx.tsx",
"resources/js/pos/utils/useCartStore.ts",
"resources/js/pos/utils/calculations.ts",
"resources/js/pos/hooks/useKeyboardMap.ts",
"resources/js/pos/hooks/usePOSStore.ts",

"resources/js/pages/documents/CommercialDocumentModal/DocumentPaymentsSection.tsx",
"resources/js/pages/documents/CommercialDocumentModal/ExistingPaymentsTable.tsx",
"resources/js/pages/documents/CommercialDocumentModal/DocumentTotalsSection.tsx",
"resources/js/pages/documents/hooks/useDocumentForm.ts",
"resources/js/pages/documents/hooks/useAdvancePayments.ts",

"resources/js/pages/finance/FinancePage.tsx",
"resources/js/pages/documents/QuickSaleModal.tsx",

"resources/js/lib/api/endpoints/payments.ts",
"resources/js/lib/api/endpoints/documents.ts",
"resources/js/lib/api/endpoints/lookips.ts",
"resources/js/lib/api/endpoints/partyBalances.ts",

"app/Http/Controllers/Api/V1/PaymentController.php",
"app/Http/Controllers/Api/V1/PaymentModeController.php",
"app/Http/Controllers/Api/V1/CommercialDocumentController.php",

"app/Services/PaymentService.php",
"app/Services/CommercialDocumentService.php",

"app/Models/Payment.php",
"app/Models/PaymentMode.php",
"app/Models/DocumentPayment.php",

"database/migrations/2025_10_15_094115_create_payments_table.php",
"database/migrations/2025_10_15_094104_create_payment_modes_table.php",
"database/migrations/2025_10_15_094120_create_document_payment_table.php",
"database/migrations/2026_07_05_075508_add_client_ref_to_payments_table.php",

"database/seeders/PaymentModeSeeder.php",

"app/Policies/PaymentPolicy.php",

"app/Http/Requests/StorePaymentRequest.php",
"app/Http/Requests/Paymentrequest.php",

"app/Http/Resources/PaymentResource.php"
)

"" | Set-Content $OutputFile -Encoding UTF8

foreach ($file in $Files) {

    Add-Content $OutputFile ""
    Add-Content $OutputFile "================================================================================"
    Add-Content $OutputFile "FILE: $file"
    Add-Content $OutputFile "================================================================================"
    Add-Content $OutputFile ""

    if (Test-Path $file) {
        Get-Content $file -Encoding UTF8 | Add-Content $OutputFile
    }
    else {
        Add-Content $OutputFile "***** FILE NOT FOUND *****"
    }

    Add-Content $OutputFile ""
    Add-Content $OutputFile ""
}

Write-Host ""
Write-Host "Done."
Write-Host "Output: $OutputFile"
