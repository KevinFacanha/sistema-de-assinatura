import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export type SupportedUploadKind = 'pdf' | 'excel' | 'word' | 'legacyWord';

export const SUPPORTED_DOCUMENT_ACCEPT = [
  'application/pdf',
  '.pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xlsx',
  'application/vnd.ms-excel',
  '.xls',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.docx',
  'application/msword',
  '.doc',
].join(',');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XLS_MIME = 'application/vnd.ms-excel';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_MIME = 'application/msword';

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 32;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CELL_FONT_SIZE = 8;
const HEADER_FONT_SIZE = 10;
const TITLE_FONT_SIZE = 13;
const LINE_HEIGHT = 10;
const CELL_PADDING_X = 4;
const CELL_PADDING_Y = 4;
const MIN_COLUMN_WIDTH = 54;
const MAX_COLUMN_WIDTH = 180;
const MIN_ROW_HEIGHT = 20;
const MAX_CELL_LINES = 4;
const TABLE_TOP_Y = PAGE_HEIGHT - 92;
const TABLE_BOTTOM_Y = MARGIN + 16;
const WORD_PAGE_WIDTH = 595.28;
const WORD_PAGE_HEIGHT = 841.89;
const WORD_MARGIN = 48;
const WORD_CONTENT_WIDTH = WORD_PAGE_WIDTH - WORD_MARGIN * 2;
const WORD_BODY_FONT_SIZE = 10.5;
const WORD_LINE_HEIGHT = 14;
const WORD_TOP_Y = WORD_PAGE_HEIGHT - 104;
const WORD_BOTTOM_Y = WORD_MARGIN + 12;

function getFileExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const lastDotIndex = normalized.lastIndexOf('.');
  return lastDotIndex >= 0 ? normalized.slice(lastDotIndex + 1) : '';
}

export function getSupportedUploadKind(file: File): SupportedUploadKind | null {
  const mimeType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return 'pdf';
  }

  if (mimeType === XLSX_MIME || mimeType === XLS_MIME || extension === 'xlsx' || extension === 'xls') {
    return 'excel';
  }

  if (mimeType === DOCX_MIME || extension === 'docx') {
    return 'word';
  }

  if (mimeType === DOC_MIME || extension === 'doc') {
    return 'legacyWord';
  }

  return null;
}

function replaceFileExtensionWithPdf(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) return 'documento.pdf';
  const lastDotIndex = trimmed.lastIndexOf('.');
  const baseName = lastDotIndex > 0 ? trimmed.slice(0, lastDotIndex) : trimmed;
  return `${baseName}.pdf`;
}

function toPdfSafeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFC')
    .replace(/\t/g, '    ')
    .replace(/\r\n/g, '\n')
    .replace(/[^\n\u0020-\u007e\u00a0-\u00ff]/g, '?');
}

function splitLongTokenByWidth(token: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!token) return [''];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const char of token) {
    const candidate = currentChunk + char;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentChunk = candidate;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = char;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks.length > 0 ? chunks : [''];
}

function truncateToWidth(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
  const ellipsis = '...';
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && font.widthOfTextAtSize(`${truncated}${ellipsis}`, fontSize) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated ? `${truncated}${ellipsis}` : ellipsis;
}

function wrapTextByWidth(
  value: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  maxLines = MAX_CELL_LINES,
): string[] {
  const text = toPdfSafeText(value);
  if (!text) return [''];

  const wrappedLines: string[] = [];
  for (const sourceLine of text.split('\n')) {
    const words = sourceLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      wrappedLines.push('');
      continue;
    }

    let currentLine = '';
    for (const word of words) {
      const segments =
        font.widthOfTextAtSize(word, fontSize) <= maxWidth
          ? [word]
          : splitLongTokenByWidth(word, font, fontSize, maxWidth);

      for (const segment of segments) {
        const candidate = currentLine ? `${currentLine} ${segment}` : segment;
        if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
          currentLine = candidate;
        } else {
          if (currentLine) wrappedLines.push(currentLine);
          currentLine = segment;
        }
      }
    }

    if (currentLine) wrappedLines.push(currentLine);
  }

  if (wrappedLines.length <= maxLines) {
    return wrappedLines.length > 0 ? wrappedLines : [''];
  }

  const visibleLines = wrappedLines.slice(0, maxLines);
  visibleLines[maxLines - 1] = truncateToWidth(visibleLines[maxLines - 1], font, fontSize, maxWidth);
  return visibleLines;
}

function worksheetToRows(worksheet: XLSX.WorkSheet): string[][] {
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  }) as unknown[][];

  return rawRows.map((row) => (Array.isArray(row) ? row.map(toPdfSafeText) : []));
}

function getVisibleColumnRange(rows: string[][]): number[] {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  let firstVisible = -1;
  let lastVisible = -1;

  for (let columnIndex = 0; columnIndex < maxColumns; columnIndex += 1) {
    const hasValue = rows.some((row) => (row[columnIndex] ?? '').trim().length > 0);
    if (hasValue) {
      if (firstVisible < 0) firstVisible = columnIndex;
      lastVisible = columnIndex;
    }
  }

  if (firstVisible < 0 || lastVisible < 0) {
    return [];
  }

  return Array.from({ length: lastVisible - firstVisible + 1 }, (_, index) => firstVisible + index);
}

function measureColumnWidths(rows: string[][], columns: number[], font: PDFFont): Map<number, number> {
  const widths = new Map<number, number>();
  const sampleRows = rows.slice(0, 80);

  for (const columnIndex of columns) {
    const columnLabel = XLSX.utils.encode_col(columnIndex);
    let measuredWidth = font.widthOfTextAtSize(columnLabel, CELL_FONT_SIZE);

    for (const row of sampleRows) {
      const cellText = (row[columnIndex] ?? '').slice(0, 48);
      measuredWidth = Math.max(measuredWidth, font.widthOfTextAtSize(cellText, CELL_FONT_SIZE));
    }

    widths.set(columnIndex, Math.min(Math.max(measuredWidth + CELL_PADDING_X * 2 + 10, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH));
  }

  return widths;
}

function createColumnBlocks(columns: number[], widths: Map<number, number>): number[][] {
  const blocks: number[][] = [];
  let currentBlock: number[] = [];
  let currentWidth = 0;

  for (const columnIndex of columns) {
    const columnWidth = Math.min(widths.get(columnIndex) ?? MIN_COLUMN_WIDTH, CONTENT_WIDTH);
    if (currentBlock.length > 0 && currentWidth + columnWidth > CONTENT_WIDTH) {
      blocks.push(currentBlock);
      currentBlock = [];
      currentWidth = 0;
    }

    currentBlock.push(columnIndex);
    currentWidth += columnWidth;
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function drawPageHeader(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  sourceFileName: string,
  sheetName: string,
  columnRange: string,
  pageNumber: number,
) {
  page.drawText('Arquivo Excel convertido para PDF', {
    x: MARGIN,
    y: PAGE_HEIGHT - 36,
    size: TITLE_FONT_SIZE,
    font: bold,
    color: rgb(0.1, 0.17, 0.24),
  });

  const subtitle = `Arquivo: ${sourceFileName} | Aba: ${sheetName} | Colunas: ${columnRange}`;
  const subtitleLines = wrapTextByWidth(subtitle, font, HEADER_FONT_SIZE, CONTENT_WIDTH, 2);
  subtitleLines.forEach((line, index) => {
    page.drawText(line, {
      x: MARGIN,
      y: PAGE_HEIGHT - 56 - index * 12,
      size: HEADER_FONT_SIZE,
      font,
      color: rgb(0.28, 0.34, 0.41),
    });
  });

  page.drawText(`Página ${pageNumber}`, {
    x: PAGE_WIDTH - MARGIN - 54,
    y: MARGIN - 10,
    size: 8,
    font,
    color: rgb(0.42, 0.48, 0.56),
  });
}

function drawCell(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  textLines: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  isFirstRow: boolean,
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.86, 0.89, 0.93),
    borderWidth: 0.5,
    ...(isFirstRow ? { color: rgb(0.95, 0.97, 0.99) } : {}),
  });

  const textFont = isFirstRow ? bold : font;
  textLines.forEach((line, index) => {
    page.drawText(line, {
      x: x + CELL_PADDING_X,
      y: y + height - CELL_PADDING_Y - CELL_FONT_SIZE - index * LINE_HEIGHT,
      size: CELL_FONT_SIZE,
      font: textFont,
      color: rgb(0.1, 0.17, 0.24),
    });
  });
}

function drawEmptySheetMessage(page: PDFPage, font: PDFFont) {
  page.drawText('Nenhum dado visível nesta planilha.', {
    x: MARGIN,
    y: TABLE_TOP_Y,
    size: 10,
    font,
    color: rgb(0.28, 0.34, 0.41),
  });
}

function renderSheetBlock(
  pdfDoc: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  rows: string[][],
  sourceFileName: string,
  sheetName: string,
  blockColumns: number[],
  widths: Map<number, number>,
) {
  const firstColumn = blockColumns[0] ?? 0;
  const lastColumn = blockColumns[blockColumns.length - 1] ?? firstColumn;
  const columnRange = `${XLSX.utils.encode_col(firstColumn)}-${XLSX.utils.encode_col(lastColumn)}`;
  let pageNumber = 1;
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageHeader(page, font, bold, sourceFileName, sheetName, columnRange, pageNumber);
  let cursorY = TABLE_TOP_Y;

  if (rows.length === 0) {
    drawEmptySheetMessage(page, font);
    return;
  }

  for (const [rowIndex, row] of rows.entries()) {
    const wrappedCells = blockColumns.map((columnIndex) => {
      const columnWidth = Math.min(widths.get(columnIndex) ?? MIN_COLUMN_WIDTH, CONTENT_WIDTH);
      return wrapTextByWidth(row[columnIndex] ?? '', font, CELL_FONT_SIZE, columnWidth - CELL_PADDING_X * 2);
    });
    const rowLineCount = Math.max(...wrappedCells.map((lines) => lines.length), 1);
    const rowHeight = Math.max(MIN_ROW_HEIGHT, rowLineCount * LINE_HEIGHT + CELL_PADDING_Y * 2);

    if (cursorY - rowHeight < TABLE_BOTTOM_Y) {
      pageNumber += 1;
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawPageHeader(page, font, bold, sourceFileName, sheetName, columnRange, pageNumber);
      cursorY = TABLE_TOP_Y;
    }

    let cursorX = MARGIN;
    for (const [cellIndex, columnIndex] of blockColumns.entries()) {
      const columnWidth = Math.min(widths.get(columnIndex) ?? MIN_COLUMN_WIDTH, CONTENT_WIDTH);
      drawCell(
        page,
        font,
        bold,
        wrappedCells[cellIndex],
        cursorX,
        cursorY - rowHeight,
        columnWidth,
        rowHeight,
        rowIndex === 0,
      );
      cursorX += columnWidth;
    }

    cursorY -= rowHeight;
  }
}

async function createPdfFromWorkbook(file: File): Promise<Uint8Array> {
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    cellDates: true,
  });
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const sheetNames = workbook.SheetNames.length > 0 ? workbook.SheetNames : ['Planilha'];
  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = worksheet ? worksheetToRows(worksheet) : [];
    const visibleColumns = getVisibleColumnRange(rows);

    if (visibleColumns.length === 0) {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawPageHeader(page, font, bold, file.name, sheetName, '-', 1);
      drawEmptySheetMessage(page, font);
      continue;
    }

    const widths = measureColumnWidths(rows, visibleColumns, font);
    const columnBlocks = createColumnBlocks(visibleColumns, widths);
    for (const blockColumns of columnBlocks) {
      renderSheetBlock(pdfDoc, font, bold, rows, file.name, sheetName, blockColumns, widths);
    }
  }

  return pdfDoc.save();
}

function drawWordPageHeader(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  sourceFileName: string,
  pageNumber: number,
) {
  page.drawText('Arquivo Word convertido para PDF', {
    x: WORD_MARGIN,
    y: WORD_PAGE_HEIGHT - 48,
    size: 14,
    font: bold,
    color: rgb(0.1, 0.17, 0.24),
  });

  const subtitleLines = wrapTextByWidth(`Arquivo: ${sourceFileName}`, font, 10, WORD_CONTENT_WIDTH, 2);
  subtitleLines.forEach((line, index) => {
    page.drawText(line, {
      x: WORD_MARGIN,
      y: WORD_PAGE_HEIGHT - 68 - index * 12,
      size: 10,
      font,
      color: rgb(0.28, 0.34, 0.41),
    });
  });

  page.drawText(`Página ${pageNumber}`, {
    x: WORD_PAGE_WIDTH - WORD_MARGIN - 54,
    y: WORD_MARGIN - 18,
    size: 8,
    font,
    color: rgb(0.42, 0.48, 0.56),
  });
}

async function createPdfFromDocx(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const conversionErrors = result.messages
    .filter((message) => message.type === 'error')
    .map((message) => message.message);

  if (conversionErrors.length > 0) {
    throw new Error(conversionErrors.join(' '));
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const textLines = toPdfSafeText(result.value).trim()
    ? toPdfSafeText(result.value).split('\n')
    : ['Nenhum texto visível foi encontrado neste documento Word.'];

  let pageNumber = 1;
  let page = pdfDoc.addPage([WORD_PAGE_WIDTH, WORD_PAGE_HEIGHT]);
  drawWordPageHeader(page, font, bold, file.name, pageNumber);
  let cursorY = WORD_TOP_Y;

  for (const sourceLine of textLines) {
    if (!sourceLine.trim()) {
      cursorY -= WORD_LINE_HEIGHT;
      continue;
    }

    const wrappedLines = wrapTextByWidth(sourceLine, font, WORD_BODY_FONT_SIZE, WORD_CONTENT_WIDTH, 20);
    for (const line of wrappedLines) {
      if (cursorY - WORD_LINE_HEIGHT < WORD_BOTTOM_Y) {
        pageNumber += 1;
        page = pdfDoc.addPage([WORD_PAGE_WIDTH, WORD_PAGE_HEIGHT]);
        drawWordPageHeader(page, font, bold, file.name, pageNumber);
        cursorY = WORD_TOP_Y;
      }

      page.drawText(line, {
        x: WORD_MARGIN,
        y: cursorY,
        size: WORD_BODY_FONT_SIZE,
        font,
        color: rgb(0.1, 0.17, 0.24),
      });
      cursorY -= WORD_LINE_HEIGHT;
    }

    cursorY -= 4;
  }

  return pdfDoc.save();
}

function createPdfFileFromBytes(pdfBytes: Uint8Array, sourceFile: File): File {
  const pdfArrayBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfArrayBuffer).set(pdfBytes);
  const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  return new File([pdfBlob], replaceFileExtensionWithPdf(sourceFile.name), {
    type: 'application/pdf',
    lastModified: sourceFile.lastModified || Date.now(),
  });
}

export async function ensurePdfFileForSigning(file: File): Promise<File> {
  const kind = getSupportedUploadKind(file);
  if (kind === 'pdf') {
    return file;
  }

  if (kind === 'legacyWord') {
    throw new Error('O formato DOC legado não pode ser convertido com segurança no navegador. Salve o arquivo como DOCX ou PDF e envie novamente.');
  }

  if (kind !== 'excel' && kind !== 'word') {
    throw new Error('Formato não suportado. Envie um arquivo PDF, XLSX, XLS, DOCX ou DOC.');
  }

  try {
    const pdfBytes = kind === 'word' ? await createPdfFromDocx(file) : await createPdfFromWorkbook(file);
    return createPdfFileFromBytes(pdfBytes, file);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido';
    const sourceLabel = kind === 'word' ? 'Word' : 'Excel';
    throw new Error(`Não foi possível converter o ${sourceLabel} para PDF: ${message}`);
  }
}
