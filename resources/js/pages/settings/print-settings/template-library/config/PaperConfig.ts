import type { PaperSize, PageOrientation } from '../../types';
import {
  A4_MARGIN_TOP, A4_MARGIN_BOTTOM, A4_MARGIN_SIDES,
  A5_MARGIN_TOP, A5_MARGIN_BOTTOM, A5_MARGIN_SIDES,
  THERMAL_MARGIN,
} from '../constants';

export interface PaperConfig {
  paperSize: PaperSize;
  pageOrientation: PageOrientation;
  marginTop: number;
  marginBottom: number;
  marginSides: number;
  paperWidthMm: number;
}

export function paperConfig(size: PaperSize): PaperConfig {
  switch (size) {
    case 'A4':
      return {
        paperSize: 'A4',
        pageOrientation: 'portrait',
        marginTop: A4_MARGIN_TOP,
        marginBottom: A4_MARGIN_BOTTOM,
        marginSides: A4_MARGIN_SIDES,
        paperWidthMm: 80,
      };
    case 'A5':
      return {
        paperSize: 'A5',
        pageOrientation: 'portrait',
        marginTop: A5_MARGIN_TOP,
        marginBottom: A5_MARGIN_BOTTOM,
        marginSides: A5_MARGIN_SIDES,
        paperWidthMm: 80,
      };
    case '40x20mm':
      return {
        paperSize: '40x20mm',
        pageOrientation: 'portrait',
        marginTop: 1,
        marginBottom: 1,
        marginSides: 2,
        paperWidthMm: 40,
      };
    default:
      return {
        paperSize: size,
        pageOrientation: 'portrait',
        marginTop: THERMAL_MARGIN,
        marginBottom: THERMAL_MARGIN,
        marginSides: THERMAL_MARGIN,
        paperWidthMm: size === '58mm' ? 58 : 80,
      };
  }
}
