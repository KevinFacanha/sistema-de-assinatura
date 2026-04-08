# ClinicalSign - Fase 1 (Fundacao) - Registro

## Escopo Implementado
- bootstrap do projeto com React + TypeScript + Vite + Tailwind
- estrutura de pastas modular e enxuta
- layouts base:
  - autenticacao (`/login`)
  - interno autenticado (`/dashboard` e `/requests/*`)
  - publico de assinatura (`/sign/:token*`)
- shell visual interno com topbar, sidebar e conteudo
- design system base com tokens e componentes essenciais
- placeholders de telas principais conectados por navegacao real

## Rotas Implementadas
- `/login`
- `/dashboard`
- `/requests/new`
- `/requests/:id`
- `/requests/:id/sign`
- `/sign/:token`
- `/sign/:token/otp`
- `/sign/:token/review`
- `/sign/:token/completed`

## Fora Do Escopo Nesta Fase
- regras de negocio completas de assinatura
- pipeline de hash (original/submetido/final)
- trilha de auditoria persistida
- OTP real com expiracao/tentativas/single-use
- idempotencia ponta a ponta em operacoes criticas

## Objetivo Da Proxima Fase
- implementar jornada funcional do nutricionista:
  - login funcional basico
  - criacao de solicitacao com estado local
  - assinatura profissional
  - geracao/copia de link com fluxo consistente

