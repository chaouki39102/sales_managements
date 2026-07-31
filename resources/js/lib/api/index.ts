// ════════════════════════════════════════════════════════════════════════════
// lib/api/index.ts — تصدير كامل لطبقة الـ API
// ✅ مصحح: اسم الملف document.ts وليس documents.ts
// ════════════════════════════════════════════════════════════════════════════

// Core
export * from './core/client';
export * from './core/queryClient';
export * from './core/queryKeys';
// Don't use export type * — too many ambiguous re-exports
export type {
  PaginationMeta, PaginationLinks, PaginatedResponse,
  BaseModel, ListParams,
  User, ActiveCompany, Company, FiscalYear,
  Permission, Role,
  Currency, Tva, LegalForm, FiscalStamp, InventoryValuationMethod,
  Wilaya, Commune, DocumentStatus, DocumentType, DocumentBaseOperation,
  StockMovementType, ProductType, PartyType, TreasuryAccountType,
  Unit, Warehouse, PriceLevel, PaymentMode,
  NumberingSeries, TreasuryAccount, ExpenseCategory, Brand, Family,
  Party, Product, ProductVariant, ProductVariantPrice, QuantityDiscount, ProductLot, ProductPackaging, ProductPrice, Barcode,
  CommercialDocument, CommercialDocumentLine,
  Payment, PaymentStatus, Check,
  StockMovement,
  Expense, ExpenseStatus,
  Employee,
  DashboardStats,
  CartItem, CartTotals, HeldCart,
  Setting,
  SeedKey, SeedResult, Gender, ExchangeRate,
  CompanyMember,
  PartyBalance, PartyTransaction, PartyBalanceHistory,
  DetailedLine, DetailedTransaction, DetailedBalanceHistory,
  ProductRecapItem, ProductRecapSummary, ProductRecapResponse,
} from './core/types';

// Store
export * from '../store/appStore';

// Endpoints
export * from './endpoints/auth';
export * from './endpoints/companies';
export * from './endpoints/fiscalYears';
export * from './endpoints/inventory';
export * from './endpoints/lookups';
export * from './endpoints/seeds';
export * from './endpoints/documents';
export * from './endpoints/parties';
export * from './endpoints/products';
export * from './endpoints/payments';
export * from './endpoints/checks';
export * from './endpoints/expenses';
export * from './endpoints/users';
export * as settings from './endpoints/settings';
export * from './endpoints/dashboard';
export * from './endpoints/reports';
export type {
  // taxManagement types
};
export {
  taxManagementApi,
  useTaxConfig, useTaxConfigHistory,
  useRegulatedProducts, useSubsidizedSummary, useSubsidizedViolations,
  useG50Declaration, useG50History, useIFUDeclaration, useIFUSettings,
  useIFUHistory, useTaxManagementMutations,
} from './endpoints/taxManagement';
export * from './endpoints/approvals';
export * from './endpoints/audits';
export * from './endpoints/reconciliation';
export * from './endpoints/attachments';

