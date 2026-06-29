export function numberToArabicWords(n: number): string {
  if (n === 0) return 'صفر';
  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens  = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مئة', 'مئتان', 'ثلاث مئة', 'أربع مئة', 'خمس مئة', 'ست مئة', 'سبع مئة', 'ثمان مئة', 'تسع مئة'];

  const intPart = Math.floor(n);
  if (intPart === 0) return 'صفر';

  let result = '';

  const thousands = Math.floor(intPart / 1000);
  const remainder = intPart % 1000;

  if (thousands > 0) {
    if (thousands === 1) result += 'ألف';
    else if (thousands === 2) result += 'ألفان';
    else result += units[thousands] + ' آلاف';
  }

  if (remainder > 0) {
    if (result) result += ' و';
    const h = Math.floor(remainder / 100);
    const t = remainder % 100;

    if (h > 0) {
      result += hundreds[h];
    }

    if (t > 0) {
      if (h > 0) result += ' و';
      if (t < 10) {
        result += units[t];
      } else if (t < 20) {
        result += teens[t - 10];
      } else {
        const u = t % 10;
        const tIdx = Math.floor(t / 10);
        if (u > 0) result += units[u] + ' و';
        result += tens[tIdx];
      }
    }
  }

  return result;
}
