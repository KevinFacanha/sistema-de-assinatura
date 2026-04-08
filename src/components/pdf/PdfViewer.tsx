import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { Button, Card } from '../ui';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

type PdfViewerProps = {
  fileUrl: string;
  title?: string;
};

export function PdfViewer({ fileUrl, title = 'Documento PDF' }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <Card className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-text-strong">{title}</p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
          >
            Anterior
          </Button>
          <span className="text-xs text-text-muted">
            Página {pageNumber} de {numPages || 1}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPageNumber((prev) => Math.min(numPages || 1, prev + 1))}
            disabled={numPages === 0 || pageNumber >= numPages}
          >
            Próxima
          </Button>
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}

      <div className="overflow-x-auto rounded-md border border-border-soft bg-surface-1 p-2">
        <Document
          file={fileUrl}
          loading={<p className="px-3 py-2 text-sm text-text-muted">Carregando PDF...</p>}
          onLoadSuccess={({ numPages: pages }) => {
            setNumPages(pages);
            setPageNumber(1);
            setErrorMessage(null);
          }}
          onLoadError={(error) => {
            setErrorMessage(`Falha ao carregar PDF: ${error.message}`);
          }}
        >
          <Page pageNumber={pageNumber} width={760} />
        </Document>
      </div>
    </Card>
  );
}
