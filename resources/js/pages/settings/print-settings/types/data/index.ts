export type {
  UniversalDocumentData,
  DocumentInfo,
  CompanyInfo,
  PartyInfo,
  WarehouseInfo,
  SessionInfo,
  DocumentLine,
  TaxRate,
  DocumentTotals,
  Payment,
  BalanceInfo,
  CurrencyInfo,
  LegacyLiveDataShape,
} from './UniversalDocumentData';

export {
  fromLegacyLiveData,
  emptyDocumentData,
} from './UniversalDocumentData';

export { DocumentDataBuilder } from './DocumentDataBuilder';
export type { POSSaleSnapshot } from './DocumentDataBuilder';
