# ClinicalSign

Sistema web de assinatura eletrônica para profissionais da saúde, com fluxo de envio manual por link, validação por código de acesso e acompanhamento do status da solicitação.

## Visão geral

O ClinicalSign foi desenvolvido para simplificar o envio e a assinatura de documentos clínicos entre profissional e paciente.

O fluxo principal funciona assim:
- o profissional faz login
- cria uma nova solicitação
- adiciona um ou mais documentos em PDF
- assina como profissional
- o sistema gera link + código de acesso
- o paciente acessa o link, valida o código, aceita os documentos e assina
- o sistema conclui o fluxo e registra os documentos assinados

## Principais funcionalidades

- Autenticação de profissionais com Supabase Auth
- Perfil do profissional com nome exibido corretamente no sistema
- Criação de solicitações com dados do paciente
- Upload de um ou mais documentos PDF
- Assinatura profissional
- Geração de link único + código de acesso
- Fluxo público para o paciente
- Aceite individual por documento
- Assinatura final do paciente
- Geração de PDFs assinados
- Dashboard com acompanhamento das solicitações
- Integração com Supabase Storage e banco de dados
- Registro de eventos e integridade do documento via hash

## Stack utilizada

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- pdf-lib
- react-pdf

## Estrutura do projeto

``bash
src/
  app/
  components/
  layouts/
  lib/
  pages/
  styles/

public/
docs/
supabase/migrations/
