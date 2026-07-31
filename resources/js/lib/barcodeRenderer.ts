interface BarcodeBar { x: number; width: number; }

// ── Code 39 ──
const CODE39_REF = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%'.split('');
const CODE39_PATTERNS = [
  '101000111011101','111010001010111','101110001010111','111011100010101',
  '101000111010111','111010001110101','101110001110101','101000101110111',
  '111010001011101','101110001011101','111010100010111','101110100010111',
  '111011101000101','101011100010111','111010111000101','101110111000101',
  '101010001110111','111010100011101','101110100011101','101011100011101',
  '111010101000111','101110101000111','111011101010001','101011101000111',
  '111010111010001','101110111010001','101010111000111','111010101110001',
  '101110101110001','101011101110001','111000101010111','100011101010111',
  '111000111010101','100010111010111','111000101110101','100011101110101',
  '100010101110111','111000101011101','100011101011101','100010001000101',
  '100010001010001','100010100010001','101000100010001',
];
const CODE39_EDGE = '100010111011101';
const CODE39_MAP: Record<string, string> = {};
CODE39_REF.forEach((ch, i) => { CODE39_MAP[ch] = CODE39_PATTERNS[i]; });

function encodeCode39(raw: string): string {
  const code = String(raw ?? '').toUpperCase();
  const parts: string[] = [CODE39_EDGE];
  for (const ch of code) { if (CODE39_MAP[ch]) parts.push(CODE39_MAP[ch]); }
  parts.push(CODE39_EDGE);
  return parts.join('0');
}

// ── EAN-13 ──
const EAN13_A: Record<string, string> = {
  '0': '0001101','1':'0011001','2':'0010011','3':'0111101',
  '4':'0100011','5':'0110001','6':'0101111','7':'0111011',
  '8':'0110111','9':'0001011',
};
const EAN13_B: Record<string, string> = {
  '0':'0100111','1':'0110011','2':'0011011','3':'0100001',
  '4':'0011101','5':'0111001','6':'0000101','7':'0010001',
  '8':'0001001','9':'0010111',
};
const EAN13_C: Record<string, string> = {
  '0':'1110010','1':'1100110','2':'1101100','3':'1000010',
  '4':'1011100','5':'1001110','6':'1010000','7':'1000100',
  '8':'1001000','9':'1110100',
};
const EAN13_PARITY: Record<string, string> = {
  '0':'AAAAAA','1':'AABABB','2':'AABBAB','3':'AABBBA',
  '4':'ABAABB','5':'ABBAAB','6':'ABBBAA','7':'ABABAB',
  '8':'ABABBA','9':'ABBABA',
};

function encodeEAN13(raw: string): string | null {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 13) return null;
  if (digits.length === 12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
    digits += (10 - (sum % 10)) % 10;
  }
  const first = digits[0];
  const parity = EAN13_PARITY[first];
  if (!parity) return null;
  let pattern = '101';
  for (let i = 0; i < 6; i++) pattern += parity[i] === 'A' ? EAN13_A[digits[i + 1]] : EAN13_B[digits[i + 1]];
  pattern += '01010';
  for (let i = 7; i < 13; i++) pattern += EAN13_C[digits[i]];
  pattern += '101';
  return pattern;
}

function encodeEAN8(raw: string): string | null {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 8) return null;
  if (digits.length === 7) {
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += parseInt(digits[i]) * (i % 2 === 0 ? 3 : 1);
    digits += (10 - (sum % 10)) % 10;
  }
  let pattern = '101';
  for (let i = 0; i < 4; i++) pattern += EAN13_A[digits[i]];
  pattern += '01010';
  for (let i = 4; i < 8; i++) pattern += EAN13_C[digits[i]];
  pattern += '101';
  return pattern;
}

function patternToBars(pattern: string, barWidth = 1.0): { bars: BarcodeBar[]; totalWidth: number } {
  const bars: BarcodeBar[] = [];
  let x = 0;
  let i = 0;
  while (i < pattern.length) {
    const bit = pattern[i];
    const start = i;
    while (i < pattern.length && pattern[i] === bit) i++;
    const w = (i - start) * barWidth;
    if (bit === '1') bars.push({ x, width: w });
    x += w;
  }
  return { bars, totalWidth: x };
}

export function buildBarcode(value: string, format: string, barWidth = 1.0, maxWidth?: number): { bars: BarcodeBar[]; totalWidth: number } | null {
  if (!value) return null;
  let pattern = '';
  if (format === 'code39') pattern = encodeCode39(value);
  else if (format === 'ean13') {
    const digits = String(value).replace(/\D/g, '');
    pattern = digits.length <= 8 ? (encodeEAN8(digits) ?? '') : (encodeEAN13(digits) ?? '');
  }
  else return null;
  if (!pattern) return null;
  const fitted = patternToBars(pattern, barWidth);
  if (maxWidth && maxWidth > 0 && fitted.totalWidth > maxWidth) {
    return patternToBars(pattern, barWidth * (maxWidth / fitted.totalWidth));
  }
  return fitted;
}

export function renderBarcodeSvg(bc: { bars: BarcodeBar[]; totalWidth: number }, height: number) {
  return { bars: bc.bars, totalWidth: bc.totalWidth, height };
}

export { encodeCode39, encodeEAN13, encodeEAN8 };
