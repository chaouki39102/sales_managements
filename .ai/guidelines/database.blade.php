{{--
┌─────────────────────────────────────────────────────────────────────┐
│  Database & Migrations                                              │
│  File: .ai/guidelines/database.blade.php                           │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
DATABASE ENGINE
═══════════════════════════════════════════════════════════

Production: MySQL / MariaDB
Local dev:  MySQL via XAMPP (switched from SQLite — do NOT use SQLite)

❌ Do NOT write SQLite-compatible migrations (no IF/ELSEIF blocks in triggers, no UPDATE aliases)
✅ MySQL trigger syntax only: DELIMITER, BEGIN/END, IF/ELSEIF/END IF
✅ MySQL UPDATE with alias: UPDATE table AS t SET ... (not supported in SQLite)


═══════════════════════════════════════════════════════════
KEY TABLES — FIELD REFERENCE
═══════════════════════════════════════════════════════════

units(id, company_id, name, symbol, active, display_order, ...)
currencies(id, name, code, symbol, decimal_places, is_base_currency, active)
brands(id, company_id, name, slug, website, active, display_order)
families(id, company_id, name, slug, parent_id, active, display_order)
warehouses(id, company_id, name, code, address, commune_id, wilaya_id, phone, manager_name, rc, nif, nis, ai, active)
price_levels(id, company_id, name, is_percentage, value, active, display_order)
tvas(id, company_id, name, rate, is_default, active, display_order)
wilayas(id, name, arabic_name, code)
communes(id, wilaya_id, name, arabic_name, code)
parties(id, company_id, name, nif, nis, rc, ai, party_type_id, price_level_id, ...)
products(id, company_id, name, product_type_id, family_id, brand_id, unit_id, tva_id, current_stock_cached, min_margin_percentage, ...)
product_prices(id, product_id, company_id, price_level_id, price_ht, fiscal_year_id)
product_packagings(id, product_id, company_id, unit_id, pack_quantity, barcode)
quantity_discounts(id, product_id, company_id, price_level_id, min_qty, discount_percentage)
commercial_documents(id, company_id, fiscal_year_id, document_type_id, document_status_id,
                     party_id, numbering_series_id, reference, date, due_date,
                     total_ht, total_tva, total_ttc, timbre_fiscal,
                     validated_at, locked_at, cancelled_at, notes, ...)
  NOTE: is_proforma column was DROPPED (migration 2026_06_21_201646)
commercial_document_lines(id, document_id, company_id, product_id, packaging_id,
                           quantity, unit_price_ht, tva_rate, discount_percentage,
                           total_ht, total_tva, total_ttc, ...)
document_type_conversions(id, company_id, from_document_type_id, to_document_type_id,
                           is_active, requires_validation, ...)
stock_movements(id, company_id, fiscal_year_id, product_id, warehouse_id,
                movement_type_id, quantity, unit_cost, reference, date, ...)
treasury_accounts(id, company_id, name, code, treasury_account_type_id, active, ...)
payments(id, company_id, fiscal_year_id, party_id, treasury_account_id,
         payment_mode_id, amount, date, reference, ...)
checks(id, company_id, payment_id, check_number, bank_name, due_date, status, ...)
fiscal_years(id, company_id, name, start_date, end_date, is_current, is_closed)
fiscal_stamps(id, company_id, min_amount, max_amount, rate, is_active)
approval_thresholds(id, company_id, document_type_id, amount, approver_role_id)
user_alerts(id, company_id, user_id, alert_type, message, is_read, data)


═══════════════════════════════════════════════════════════
MIGRATION CONVENTIONS
═══════════════════════════════════════════════════════════

Naming: YYYY_MM_DD_HHMMSS_description.php
Fix migrations: merge back into original migration, do NOT stack fix migrations in production
New feature migrations: always new file

Indexes added (reference):
  2026_06_14_000001: payment indexes
  2026_06_14_000002: commercial_documents balance index
  2026_06_14_000003: opening_balances lookup indexes
  2026_06_14_000004: current_stock_cached trigger fix
  2026_06_20_000003: document indexes
  2026_05_21: slug unique constraints fix

Algerian-specific columns on parties/warehouses:
  nif (Numéro d'Identification Fiscale — 15 digits)
  nis (Numéro d'Identification Statistique)
  rc  (Registre du Commerce)
  ai  (Article d'Imposition)


═══════════════════════════════════════════════════════════
TRIGGERS
═══════════════════════════════════════════════════════════

current_stock_cached on products table:
  Updated by MySQL trigger on stock_movements INSERT/UPDATE/DELETE
  Trigger defined in Migration_CurrentStockCached.php
  Fixed in 2026_06_14_000004_fix_current_stock_cached_triggers.php

❌ Do NOT manually update current_stock_cached in PHP code
✅ Insert/update stock_movements → trigger handles the rest
--}}
