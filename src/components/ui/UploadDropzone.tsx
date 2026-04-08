import { useId, useState, type ChangeEvent } from 'react';

import { cn } from '../../lib/cn';

type UploadDropzoneProps = {
  label?: string;
  helperText?: string;
  accept?: string;
  className?: string;
  onFileSelect?: (file: File | null) => void;
};

export function UploadDropzone({
  label = 'Documento PDF',
  helperText = 'Arraste o arquivo ou clique para selecionar.',
  accept = 'application/pdf',
  className,
  onFileSelect,
}: UploadDropzoneProps) {
  const inputId = useId();
  const [fileName, setFileName] = useState<string>('Nenhum arquivo selecionado');

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFileName(file?.name ?? 'Nenhum arquivo selecionado');
    onFileSelect?.(file);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <span className="text-sm font-medium text-text-strong">{label}</span>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-soft bg-surface-1 p-6 text-center transition duration-150 ease-smooth hover:border-brand-secondary hover:bg-white"
      >
        <span className="text-sm font-medium text-text-strong">Selecionar PDF</span>
        <span className="text-xs text-text-muted">{helperText}</span>
        <span className="mt-2 rounded-md bg-white px-2 py-1 text-xs text-text-muted">{fileName}</span>
      </label>
      <input id={inputId} type="file" accept={accept} className="sr-only" onChange={handleChange} />
    </div>
  );
}
