export type {
  PrintTemplate,
  PaperSize,
  AlignOption,
  BorderStyle,
  PriceMode,
  PageOrientation,
  FontFamily,
  ColumnKey,
  DocTypeCode,
  SectionTarget,
  ReportRule,
  PrintTemplateApiResponse,
  TemplateLiveData,
  CompanyData,
  DetectedPrinter,
  DocumentPrintConfig,
  ReceiptTemplate80mm,
  CompanyPreviewData,
} from '../types';

export {
  DOC_TYPE_LIST,
  createDefaultTemplate,
  defaultTemplate,
} from '../types';

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
} from './data/UniversalDocumentData';

export {
  fromLegacyLiveData,
  emptyDocumentData,
} from './data/UniversalDocumentData';

export { DocumentDataBuilder } from './data/DocumentDataBuilder';
export type { POSSaleSnapshot } from './data/DocumentDataBuilder';
