import type { FontFamily, AlignOption } from '../../../core/domain/PrintTemplate';
import {
  TITLE_SIZE_A4, TITLE_SIZE_A5,
  COMPANY_NAME_SIZE_A4, COMPANY_NAME_SIZE_A5,
  COMPANY_INFO_SIZE_A4, COMPANY_INFO_SIZE_A5,
  BASE_FONT_SIZE_A4, BASE_FONT_SIZE_A5,
  ITEMS_FONT_SIZE_A4, ITEMS_FONT_SIZE_A5,
  TOTALS_FONT_SIZE, TOTALS_FONT_SIZE_A5,
  TOTAL_TTC_FONT_SIZE, TOTAL_TTC_FONT_SIZE_A5,
  THANK_YOU_SIZE, THANK_YOU_SIZE_A5,
} from '../constants';
import type { PaperSize } from '../../../core/domain/PrintTemplate';

export interface TypographyConfig {
  fontFamily: FontFamily;
  baseFontSize: number;
  titleSize: number;
  titleBold: boolean;
  titleAlign: AlignOption;
  companyNameSize: number;
  companyNameBold: boolean;
  companyInfoSize: number;
  itemsFontSize: number;
  totalsFontSize: number;
  totalTtcFontSize: number;
  thankYouSize: number;
}

export function typographyConfig(size: PaperSize): TypographyConfig {
  const isA4 = size === 'A4';
  const isA5 = size === 'A5';
  return {
    fontFamily: 'tajawal',
    baseFontSize: isA4 ? BASE_FONT_SIZE_A4 : isA5 ? BASE_FONT_SIZE_A5 : 9,
    titleSize: isA4 ? TITLE_SIZE_A4 : isA5 ? TITLE_SIZE_A5 : 13,
    titleBold: true,
    titleAlign: 'center',
    companyNameSize: isA4 ? COMPANY_NAME_SIZE_A4 : isA5 ? COMPANY_NAME_SIZE_A5 : 14,
    companyNameBold: true,
    companyInfoSize: isA4 ? COMPANY_INFO_SIZE_A4 : isA5 ? COMPANY_INFO_SIZE_A5 : 8,
    itemsFontSize: isA4 ? ITEMS_FONT_SIZE_A4 : isA5 ? ITEMS_FONT_SIZE_A5 : 9,
    totalsFontSize: isA5 ? TOTALS_FONT_SIZE_A5 : TOTALS_FONT_SIZE,
    totalTtcFontSize: isA5 ? TOTAL_TTC_FONT_SIZE_A5 : TOTAL_TTC_FONT_SIZE,
    thankYouSize: isA5 ? THANK_YOU_SIZE_A5 : THANK_YOU_SIZE,
  };
}
