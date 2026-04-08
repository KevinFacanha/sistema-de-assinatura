# ClinicalSign - Evolucao PDF Real (Fase 2)

## O Que Muda Nesta Etapa
- o documento principal deixa de ser resumo textual
- o fluxo passa a usar o PDF real anexado pelo nutricionista
- sao geradas versoes progressivas do PDF:
  - original
  - assinado pelo profissional
  - final assinado pelo paciente

## Storage Utilizado
- bucket: `clinicalsign-documents` (privado)
- padrao de paths:
  - `requests/<sign_token>/original/<request_id>-<arquivo>.pdf`
  - `requests/<sign_token>/professional/<request_id>-professional-signed.pdf`
  - `requests/<sign_token>/final/<request_id>-final-signed.pdf`

## Banco (novos campos em sign_requests)
- `storage_path`
- `file_name`
- `file_size`
- `mime_type`
- `original_pdf_hash`
- `signed_professional_pdf_path`
- `signed_final_pdf_path`

## Fluxo Tecnico
1. Nutricionista faz upload do PDF original.
2. Arquivo sobe para Supabase Storage.
3. Sistema grava metadados e hash do PDF original.
4. Assinatura profissional gera novo PDF com pagina de assinatura adicionada ao final.
5. Paciente visualiza essa versao assinada pelo profissional no fluxo publico.
6. Apos aceite + assinatura do paciente, nova pagina final e adicionada.
7. PDF final e salvo no storage e caminho final registrado no banco.

## Biblioteca Open Source
- visualizacao: `react-pdf` + `pdfjs-dist`
- geracao/edicao: `pdf-lib`

## SQL Necessario
Executar no Supabase SQL Editor:
- `supabase/migrations/20260406190000_pdf_real_storage_flow.sql`
- `supabase/migrations/20260406201500_fix_storage_rls_request_creation.sql` (correcao de RLS no upload inicial)
