import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type SignaturePageInput = {
  title: string;
  lines: string[];
};

type WidthMeasurableFont = {
  widthOfTextAtSize: (text: string, size: number) => number;
};

function normalizePdfBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  return new Uint8Array(input);
}

function splitLongTokenByWidth(
  token: string,
  font: WidthMeasurableFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  if (!token) return [''];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const char of token) {
    const candidate = currentChunk + char;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentChunk = candidate;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = char;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [token];
}

function wrapLineByWidth(line: string, font: WidthMeasurableFont, fontSize: number, maxWidth: number): string[] {
  if (!line) return [''];

  const words = line.split(' ');
  const wrappedLines: string[] = [];
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
        if (currentLine) {
          wrappedLines.push(currentLine);
        }
        currentLine = segment;
      }
    }
  }

  if (currentLine) {
    wrappedLines.push(currentLine);
  }

  return wrappedLines.length > 0 ? wrappedLines : [''];
}

export async function appendSignaturePage(
  basePdfBytes: ArrayBuffer | Uint8Array,
  signaturePage: SignaturePageInput,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(normalizePdfBytes(basePdfBytes));
  const page = pdfDoc.addPage([595.28, 841.89]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x: 32,
    y: 32,
    width: page.getWidth() - 64,
    height: page.getHeight() - 64,
    borderColor: rgb(0.88, 0.91, 0.94),
    borderWidth: 1,
  });

  page.drawText(signaturePage.title, {
    x: 48,
    y: page.getHeight() - 72,
    size: 18,
    font: bold,
    color: rgb(0.1, 0.17, 0.24),
  });

  page.drawText('Registro de assinaturas do documento', {
    x: 48,
    y: page.getHeight() - 94,
    size: 10,
    font,
    color: rgb(0.28, 0.34, 0.41),
  });

  const bodyFontSize = 11;
  const maxTextWidth = page.getWidth() - 96;
  const lineHeight = 14;
  let cursorY = page.getHeight() - 130;

  for (const line of signaturePage.lines) {
    const wrappedLines = wrapLineByWidth(line, font, bodyFontSize, maxTextWidth);

    for (const wrappedLine of wrappedLines) {
      page.drawText(wrappedLine, {
        x: 48,
        y: cursorY,
        size: bodyFontSize,
        font,
        color: rgb(0.1, 0.17, 0.24),
      });
      cursorY -= lineHeight;
    }

    cursorY -= 6;
  }

  const footerText = `Gerado em ${new Date().toLocaleString('pt-BR')}`;
  page.drawText(footerText, {
    x: 48,
    y: 48,
    size: 9,
    font,
    color: rgb(0.28, 0.34, 0.41),
  });

  return pdfDoc.save();
}
