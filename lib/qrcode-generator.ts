/**
 * QR Code Generator — Pure TypeScript, zero dependencies.
 * Generates a QR code matrix from a string. Supports byte mode,
 * error correction level L, versions 1-10.
 * Renders to a canvas via the drawSVG/canvas helper.
 */

// ─── Galois Field GF(256) arithmetic for Reed-Solomon ───
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsMul(p1: number[], p2: number[]): number[] {
  const coeff = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      coeff[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return coeff;
}

function rsMod(divident: number[], divisor: number[]): number[] {
  let result = divident.slice();
  while (result.length - divisor.length >= 0) {
    const coeff = result[0];
    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= gfMul(divisor[i], coeff);
    }
    let offset = 0;
    while (offset < result.length && result[offset] === 0) offset++;
    result = result.slice(offset);
  }
  return result;
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    poly = rsMul(poly, [1, EXP[i]]);
  }
  return poly;
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGeneratorPoly(ecLen);
  const paddedData = data.concat(new Array(ecLen).fill(0));
  const remainder = rsMod(paddedData, gen);
  const start = ecLen - remainder.length;
  if (start > 0) {
    const buff = new Array(ecLen).fill(0);
    for (let i = 0; i < remainder.length; i++) buff[start + i] = remainder[i];
    return buff;
  }
  return remainder;
}

// ─── QR capacity & version data (byte mode, EC level L) ───
interface VersionInfo {
  version: number;
  size: number;
  totalCodewords: number;
  ecCodewordsPerBlock: number;
  group1Blocks: number;
  group1DataCW: number;
  group2Blocks: number;
  group2DataCW: number;
  alignmentPatterns: number[];
}

const VERSION_DATA: VersionInfo[] = [
  { version: 1, size: 21, totalCodewords: 26, ecCodewordsPerBlock: 7, group1Blocks: 1, group1DataCW: 19, group2Blocks: 0, group2DataCW: 0, alignmentPatterns: [] },
  { version: 2, size: 25, totalCodewords: 44, ecCodewordsPerBlock: 10, group1Blocks: 1, group1DataCW: 34, group2Blocks: 0, group2DataCW: 0, alignmentPatterns: [6, 18] },
  { version: 3, size: 29, totalCodewords: 70, ecCodewordsPerBlock: 15, group1Blocks: 1, group1DataCW: 55, group2Blocks: 0, group2DataCW: 0, alignmentPatterns: [6, 22] },
  { version: 4, size: 33, totalCodewords: 100, ecCodewordsPerBlock: 20, group1Blocks: 1, group1DataCW: 80, group2Blocks: 0, group2DataCW: 0, alignmentPatterns: [6, 26] },
  { version: 5, size: 37, totalCodewords: 134, ecCodewordsPerBlock: 26, group1Blocks: 1, group1DataCW: 108, group2Blocks: 0, group2DataCW: 0, alignmentPatterns: [6, 30] },
  { version: 6, size: 41, totalCodewords: 172, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCW: 68, group2Blocks: 0, group2DataCW: 0, alignmentPatterns: [6, 34] },
  { version: 7, size: 45, totalCodewords: 196, ecCodewordsPerBlock: 20, group1Blocks: 2, group1DataCW: 78, group2Blocks: 0, group2DataCW: 0, alignmentPatterns: [6, 22, 38] },
  { version: 8, size: 49, totalCodewords: 242, ecCodewordsPerBlock: 24, group1Blocks: 2, group1DataCW: 97, group2Blocks: 0, group2DataCW: 0, alignmentPatterns: [6, 24, 42] },
  { version: 9, size: 53, totalCodewords: 292, ecCodewordsPerBlock: 30, group1Blocks: 2, group1DataCW: 116, group2Blocks: 0, group2DataCW: 0, alignmentPatterns: [6, 26, 46] },
  { version: 10, size: 57, totalCodewords: 346, ecCodewordsPerBlock: 18, group1Blocks: 2, group1DataCW: 68, group2Blocks: 2, group2DataCW: 69, alignmentPatterns: [6, 28, 50] },
];

function getVersionInfo(version: number): VersionInfo {
  return VERSION_DATA[version - 1];
}

function getMinVersion(data: string): number {
  const bytes = new TextEncoder().encode(data);
  const len = bytes.length;
  for (let v = 1; v <= 10; v++) {
    const info = getVersionInfo(v);
    let totalData = info.group1Blocks * info.group1DataCW + info.group2Blocks * info.group2DataCW;
    // byte mode: 4 bits mode + length bits + data
    const lenBits = v <= 9 ? 8 : 16;
    const availableBits = totalData * 8 - 4 - lenBits;
    if (len * 8 <= availableBits) return v;
  }
  return 10;
}

// ─── Encode data ───
function encodeData(data: string, version: number): number[] {
  const bytes = new TextEncoder().encode(data);
  const info = getVersionInfo(version);
  const lenBits = version <= 9 ? 8 : 16;

  // Build bit stream
  const bits: number[] = [];
  const pushBits = (val: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  // Mode indicator: byte = 0100
  pushBits(0b0100, 4);
  // Character count
  pushBits(bytes.length, lenBits);
  // Data
  for (const b of bytes) pushBits(b, 8);
  // Terminator
  const totalData = info.group1Blocks * info.group1DataCW + info.group2Blocks * info.group2DataCW;
  const totalBits = totalData * 8;
  const termLen = Math.min(4, totalBits - bits.length);
  pushBits(0, termLen);
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);
  // Pad bytes
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert to codewords
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] || 0);
    codewords.push(byte);
  }
  return codewords;
}

// ─── Build matrix ───
function createMatrix(size: number): (number | null)[][] {
  return Array.from({ length: size }, () => new Array(size).fill(null));
}

function setModule(matrix: (number | null)[][], row: number, col: number, val: number) {
  if (row >= 0 && row < matrix.length && col >= 0 && col < matrix.length) {
    matrix[row][col] = val;
  }
}

function addFinderPattern(matrix: (number | null)[][], row: number, col: number) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r, cc = col + c;
      if (rr < 0 || rr >= matrix.length || cc < 0 || cc >= matrix.length) continue;
      const isBlack =
        (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      matrix[rr][cc] = isBlack ? 1 : 0;
    }
  }
}

function addAlignmentPattern(matrix: (number | null)[][], row: number, col: number) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const rr = row + r, cc = col + c;
      if (matrix[rr][cc] !== null) continue;
      const isBlack = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      matrix[rr][cc] = isBlack ? 1 : 0;
    }
  }
}

function addTimingPatterns(matrix: (number | null)[][]) {
  const size = matrix.length;
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0 ? 1 : 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }
}

function reserveFormatInfo(matrix: (number | null)[][]) {
  const size = matrix.length;
  // Around top-left finder
  for (let i = 0; i <= 8; i++) {
    if (matrix[8][i] === null) matrix[8][i] = 0;
    if (matrix[i][8] === null) matrix[i][8] = 0;
  }
  // Around top-right finder
  for (let i = 0; i <= 7; i++) {
    if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = 0;
  }
  // Around bottom-left finder
  for (let i = 0; i <= 7; i++) {
    if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = 0;
  }
  // Dark module
  matrix[size - 8][8] = 1;
}

function reserveVersionInfo(matrix: (number | null)[][], version: number) {
  if (version < 7) return;
  const size = matrix.length;
  const bits = version << 12;
  let rem = bits;
  const genPoly = 0x1f25;
  for (let i = 0; i < 12; i++) {
    if ((rem >> (11 - i)) & 1) rem ^= genPoly << (11 - i);
  }
  const versionBits = (version << 12) | rem;
  for (let i = 0; i < 18; i++) {
    const bit = (versionBits >> i) & 1;
    const row = Math.floor(i / 3);
    const col = size - 11 + (i % 3);
    matrix[row][col] = bit;
    matrix[col][row] = bit;
  }
}

function placeData(matrix: (number | null)[][], codewords: number[]) {
  const size = matrix.length;
  let bitIdx = 0;
  const totalBits = codewords.length * 8;

  let col = size - 1;
  while (col >= 0) {
    if (col === 6) col--; // skip timing column
    const upward = ((col + 1) & 2) === 0; // alterna por par de columnas
    for (let row = 0; row < size; row++) {
      const actualRow = upward ? size - 1 - row : row;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (cc < 0) continue;
        if (matrix[actualRow][cc] === null) {
          if (bitIdx < totalBits) {
            const byteIdx = Math.floor(bitIdx / 8);
            const bitPos = 7 - (bitIdx % 8);
            matrix[actualRow][cc] = (codewords[byteIdx] >> bitPos) & 1;
          } else {
            matrix[actualRow][cc] = 0;
          }
          bitIdx++;
        }
      }
    }
    col -= 2;
  }
}

function applyMask(matrix: (number | null)[][], reserved: (number | null)[][], maskNum: number): (number | null)[][] {
  const size = matrix.length;
  const result = matrix.map(row => [...row]);
  const maskFn = getMaskFunction(maskNum);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c] !== null) continue;
      if (maskFn(r, c)) result[r][c] = result[r][c] === 1 ? 0 : 1;
    }
  }
  return result;
}

function getMaskFunction(num: number): (row: number, col: number) => boolean {
  switch (num) {
    case 0: return (r, c) => (r + c) % 2 === 0;
    case 1: return (r) => r % 2 === 0;
    case 2: return (_, c) => c % 3 === 0;
    case 3: return (r, c) => (r + c) % 3 === 0;
    case 4: return (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return (r, c) => ((r * c) % 2 + (r * c) % 3) === 0;
    case 6: return (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0;
    case 7: return (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0;
  }
  return (r, c) => (r + c) % 2 === 0;
}

// Format info: 32 valores (4 niveles EC x 8 máscaras).
// EC bits: M=00, L=01, H=10, Q=11. Índice = (ecLevel << 3) | maskNum
const FORMAT_INFO_STRINGS: number[] = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0, // M
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976, // L
  0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b, // H
  0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed, // Q
];

function addFormatInfo(matrix: (number | null)[][], ecLevel: number, maskNum: number) {
  const size = matrix.length;
  const formatBits = FORMAT_INFO_STRINGS[(ecLevel << 3) | maskNum];

  // Positions around top-left
  const positions1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  // Positions around other finders
  const positions2 = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1],
  ];

  for (let i = 0; i < 15; i++) {
    const bit = (formatBits >> (14 - i)) & 1;
    if (i < positions1.length) {
      const [r, c] = positions1[i];
      matrix[r][c] = bit;
    }
    if (i < positions2.length) {
      const [r, c] = positions2[i];
      matrix[r][c] = bit;
    }
  }
}

function computePenalty(matrix: number[][]): number {
  const size = matrix.length;
  let penalty = 0;

  // Rule 1: consecutive same-color modules in row/col
  for (let r = 0; r < size; r++) {
    let count = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) {
        count++;
        if (count === 5) penalty += 3;
        else if (count > 5) penalty += 1;
      } else count = 1;
    }
  }
  for (let c = 0; c < size; c++) {
    let count = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) {
        count++;
        if (count === 5) penalty += 3;
        else if (count > 5) penalty += 1;
      } else count = 1;
    }
  }

  // Rule 2: 2x2 blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = matrix[r][c];
      if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  return penalty;
}

export function generateQR(data: string): { matrix: number[][]; size: number } {
  const version = getMinVersion(data);
  const info = getVersionInfo(version);
  const size = info.size;

  // Encode
  const codewords = encodeData(data, version);

  // Split into blocks and compute EC
  const blocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;
  for (let g = 0; g < info.group1Blocks; g++) {
    const block = codewords.slice(offset, offset + info.group1DataCW);
    blocks.push(block);
    ecBlocks.push(rsEncode(block, info.ecCodewordsPerBlock));
    offset += info.group1DataCW;
  }
  for (let g = 0; g < info.group2Blocks; g++) {
    const block = codewords.slice(offset, offset + info.group2DataCW);
    blocks.push(block);
    ecBlocks.push(rsEncode(block, info.ecCodewordsPerBlock));
    offset += info.group2DataCW;
  }

  // Interleave data
  const finalCodewords: number[] = [];
  const maxDataLen = Math.max(info.group1DataCW, info.group2DataCW);
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of blocks) {
      if (i < block.length) finalCodewords.push(block[i]);
    }
  }
  for (let i = 0; i < info.ecCodewordsPerBlock; i++) {
    for (const ec of ecBlocks) {
      if (i < ec.length) finalCodewords.push(ec[i]);
    }
  }

  // Build matrix
  const matrix = createMatrix(size);

  // Finder patterns
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, 0, size - 7);
  addFinderPattern(matrix, size - 7, 0);

  // Alignment patterns
  const ap = info.alignmentPatterns;
  for (const r of ap) {
    for (const c of ap) {
      // Skip if overlapping with finder
      if (r <= 8 && c <= 8) continue;
      if (r <= 8 && c >= size - 8) continue;
      if (r >= size - 8 && c <= 8) continue;
      addAlignmentPattern(matrix, r, c);
    }
  }

  // Timing
  addTimingPatterns(matrix);

  // Reserve format/version areas
  reserveFormatInfo(matrix);
  reserveVersionInfo(matrix, version);

  // Build reserved mask
  const reserved = matrix.map(row => row.map(v => v !== null ? v : null));

  // Place data
  placeData(matrix, finalCodewords);

  // Try all masks, pick lowest penalty
  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let m = 0; m < 8; m++) {
    const masked = applyMask(matrix, reserved, m);
    const penalty = computePenalty(masked.map(row => row.map(v => v ?? 0)));
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = m;
    }
  }

  // Apply best mask and format info
  const finalMatrix = applyMask(matrix, reserved, bestMask);
  addFormatInfo(finalMatrix, 1, bestMask); // EC level L = 1

  return {
    matrix: finalMatrix.map(row => row.map(v => v ?? 0)),
    size,
  };
}

/**
 * Render QR matrix to a canvas context.
 */
export function drawQRToCanvas(
  ctx: CanvasRenderingContext2D,
  matrix: number[][],
  size: number,
  canvasSize: number,
  options?: { moduleSize?: number; quietZone?: number; color?: string; bgColor?: string }
) {
  const quietZone = options?.quietZone ?? 4;
  const color = options?.color || '#000000';
  const bgColor = options?.bgColor || '#ffffff';
  const totalModules = size + quietZone * 2;
  const moduleSize = canvasSize / totalModules;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  ctx.fillStyle = color;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        ctx.fillRect(
          (c + quietZone) * moduleSize,
          (r + quietZone) * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    }
  }
}

/**
 * Generate QR as SVG string (for print/preview).
 */
export function generateQRSVG(data: string, size: number): string {
  const { matrix, size: qrSize } = generateQR(data);
  const quietZone = 4;
  const totalModules = qrSize + quietZone * 2;
  const moduleSize = size / totalModules;

  let paths = '';
  for (let r = 0; r < qrSize; r++) {
    for (let c = 0; c < qrSize; c++) {
      if (matrix[r][c] === 1) {
        const x = (c + quietZone) * moduleSize;
        const y = (r + quietZone) * moduleSize;
        paths += `M${x},${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#fff"/><path d="${paths}" fill="#000"/></svg>`;
}

/**
 * Generate QR as data URL (PNG) for embedding in images.
 */
export function generateQRDataURL(data: string, size: number, quietZone = 4): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const { matrix, size: qrSize } = generateQR(data);
  drawQRToCanvas(ctx, matrix, qrSize, size, { quietZone });
  return canvas.toDataURL('image/png');
}
