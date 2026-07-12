import type { AlignOption, BorderStyle, PaperSize } from '../../../types';
import { LOGO_SIZE_A4, LOGO_SIZE_A5, COLOR_PRIMARY } from '../constants';

export interface HeaderConfig {
  showLogo: boolean;
  logoSize: number;
  logoAlign: AlignOption;
  logoBorderRadius: number;
  showCompanyName: boolean;
  companyNameSize: number;
  companyNameBold: boolean;
  companyNameAlign: AlignOption;
  companyNameColor: string;
  showAddress: boolean;
  showPhone: boolean;
  showTaxId: boolean;
  showRc: boolean;
  showNis: boolean;
  showArticle: boolean;
  companyInfoAlign: AlignOption;
  companyInfoSize: number;
  headerSeparator: BorderStyle;
}

export function headerConfig(size: PaperSize): HeaderConfig {
  const isA4 = size === 'A4';
  return {
    showLogo: true,
    logoSize: isA4 ? LOGO_SIZE_A4 : LOGO_SIZE_A5,
    logoAlign: 'left',
    logoBorderRadius: 0,
    showCompanyName: true,
    companyNameSize: isA4 ? 16 : 13,
    companyNameBold: true,
    companyNameAlign: 'right',
    companyNameColor: COLOR_PRIMARY,
    showAddress: false,
    showPhone: false,
    showTaxId: false,
    showRc: false,
    showNis: false,
    showArticle: false,
    companyInfoAlign: 'right',
    companyInfoSize: isA4 ? 8.5 : 7.5,
    headerSeparator: 'solid',
  };
}
