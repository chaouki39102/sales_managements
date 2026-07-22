// ════════════════════════════════════════════════════════════════════════════
// أضف داخل PRINT_FIELDS في services/PrintFieldRegistry.ts (مجموعة company/customer)
// مؤكّدة الآن مقابل UniversalDocumentData.ts الحقيقي — CompanyInfo.mobile/capital
// و PartyInfo.code موجودة فعليًا في الـ contract.
// ════════════════════════════════════════════════════════════════════════════

import type { PrintFieldDefinition } from '../services/PrintFieldRegistry';

export const PENDING_FIELDS: PrintFieldDefinition[] = [
  { id: 'company.mobile',  label: 'الهاتف المحمول',   group: 'company',  type: 'string', sourcePath: 'company.mobile',  align: 'center', visibleByDefault: false },
  { id: 'company.capital', label: 'رأس مال الشركة',   group: 'company',  type: 'string', sourcePath: 'company.capital', align: 'center', visibleByDefault: false },
  { id: 'customer.code',   label: 'رمز الزبون',       group: 'customer', type: 'string', sourcePath: 'party.code',      align: 'right',  visibleByDefault: false },
];
