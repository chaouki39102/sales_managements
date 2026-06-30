export type LayoutMode = 'flow' | 'flex' | 'absolute';

export interface LayoutElement {
  id: string;
  type: 'text' | 'table' | 'image' | 'barcode' | 'qr' | 'line' | 'spacer';
  mode: LayoutMode;
  width: number;
  height: number;
  order: number;
  flexBasis?: number;
  grow?: number;
  minHeight?: number;
  x?: number;
  y?: number;
}

export interface ComputedLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  consumedSpace: number;
}

export interface LayoutResult {
  elements: Map<string, ComputedLayout>;
  totalHeight: number;
  pageCount: number;
}

export class LayoutEngine {
  private getDefaultHeight(type: LayoutElement['type']): number {
    switch (type) {
      case 'text':
        return 5;
      case 'table':
        return 20;
      case 'image':
        return 20;
      case 'barcode':
        return 15;
      case 'qr':
        return 15;
      case 'line':
        return 1;
      case 'spacer':
        return 5;
    }
  }

  private resolveHeight(el: LayoutElement): number {
    const base = el.height > 0 ? el.height : this.getDefaultHeight(el.type);
    return el.minHeight != null ? Math.max(base, el.minHeight) : base;
  }

  estimateTableHeight(
    rowCount: number,
    rowHeight: number,
    headerHeight: number,
  ): number {
    return headerHeight + rowCount * rowHeight;
  }

  compute(
    elements: LayoutElement[],
    paperWidth: number,
    startY: number = 0,
    maxHeight: number = 0,
  ): LayoutResult {
    const sorted = [...elements].sort((a, b) => a.order - b.order);
    const result = new Map<string, ComputedLayout>();
    let currentY = startY;
    let currentPage = 1;
    let totalContentHeight = 0;

    let i = 0;
    while (i < sorted.length) {
      const el = sorted[i];

      if (el.mode === 'absolute') {
        const h = this.resolveHeight(el);
        result.set(el.id, {
          x: el.x ?? 0,
          y: el.y ?? 0,
          width: el.width,
          height: h,
          consumedSpace: 0,
        });
        i++;
        continue;
      }

      if (el.mode === 'flow') {
        const h = this.resolveHeight(el);

        if (maxHeight > 0 && currentY - startY + h > maxHeight) {
          currentPage++;
          currentY = startY;
        }

        result.set(el.id, {
          x: 0,
          y: currentY,
          width: paperWidth,
          height: h,
          consumedSpace: h,
        });

        currentY += h;
        totalContentHeight += h;
        i++;
        continue;
      }

      if (el.mode === 'flex') {
        const flexRow: LayoutElement[] = [];
        while (i < sorted.length && sorted[i].mode === 'flex') {
          flexRow.push(sorted[i]);
          i++;
        }

        const totalFlexBasis = flexRow.reduce(
          (sum, fel) => sum + (fel.flexBasis ?? fel.width),
          0,
        );
        const totalGrow = flexRow.reduce(
          (sum, fel) => sum + (fel.grow ?? 0),
          0,
        );
        const remaining = Math.max(0, paperWidth - totalFlexBasis);

        let rowHeight = 0;
        const baseWidths: number[] = [];

        for (const fel of flexRow) {
          baseWidths.push(fel.flexBasis ?? fel.width);
          const h = this.resolveHeight(fel);
          if (h > rowHeight) rowHeight = h;
        }

        if (maxHeight > 0 && currentY - startY + rowHeight > maxHeight) {
          currentPage++;
          currentY = startY;
        }

        let accX = 0;
        for (let j = 0; j < flexRow.length; j++) {
          const fel = flexRow[j];
          const grow = fel.grow ?? 0;
          let w = baseWidths[j];
          if (totalGrow > 0 && grow > 0) {
            w += remaining * (grow / totalGrow);
          }
          const h = this.resolveHeight(fel);

          result.set(fel.id, {
            x: accX,
            y: currentY,
            width: w,
            height: h,
            consumedSpace: w,
          });
          accX += w;
        }

        currentY += rowHeight;
        totalContentHeight += rowHeight;
      }
    }

    return {
      elements: result,
      totalHeight: totalContentHeight,
      pageCount: currentPage,
    };
  }
}

export const layoutEngine = new LayoutEngine();
