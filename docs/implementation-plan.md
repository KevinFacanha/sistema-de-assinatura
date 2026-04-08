# ClinicalSign - Implementation Plan (MVP)

## Objetivo
Executar o MVP em fases curtas, com entregas validaveis e foco em fluxo real do usuario final.

## Decisoes Iniciais
- Stack: React + TypeScript + Vite + Tailwind CSS.
- Navegacao: React Router com rotas por jornada.
- Persistencia inicial: repositorio local (LocalStorage) com interface de dominio para migracao futura.
- Documento: armazenamento de metadados + hash; upload inicial via arquivo local.
- OTP em dev: codigo exibido em modo de teste, com expiracao, limite de tentativas e single-use.

## Fase 0 - Documentacao Estrutural
Escopo:
- product brief
- sitemap
- user flows
- ux principles
- design system base
- plano de implementacao

Saida esperada:
- alinhamento de produto e UX antes de codigo.

Criterio de saida:
- documentos aprovados para iniciar estrutura tecnica.

## Fase 1 - Fundacao De Projeto
Escopo:
- bootstrap Vite React TS
- configuracao Tailwind e tokens visuais
- estrutura de pastas modular (sem overengineering)
- rotas base
- AppShell e layout principal
- biblioteca inicial de componentes base

Saida esperada:
- aplicacao navegavel com estrutura visual consistente.

Criterio de saida:
- telas base renderizando com design system aplicado.

## Fase 2 - Jornada Do Nutricionista
Escopo:
- Login
- Dashboard operacional
- Nova solicitacao (formulario + upload PDF + revisao)
- Assinatura profissional
- Geracao/copia do link do paciente
- Status de solicitacoes no dashboard e detalhe

Saida esperada:
- fluxo autenticado completo ate gerar link.

Criterio de saida:
- nutricionista consegue criar solicitacao e copiar link funcional.

## Fase 3 - Jornada Do Paciente
Escopo:
- abertura por link unico
- validacao OTP
- aceite de termos
- assinatura do paciente
- tela de concluido
- estados auxiliares (expirado, indisponivel, erro, somente leitura)

Saida esperada:
- fluxo publico de assinatura ponta a ponta.

Criterio de saida:
- paciente conclui assinatura em sequencia linear sem suporte externo.

## Fase 4 - Persistencia Minima Real
Escopo:
- persistencia local robusta para testes reais
- URL estavel por token
- idempotencia de operacoes criticas
- trilha de auditoria (eventos)
- hashes de integridade (original, submetido, final)

Saida esperada:
- consistencia de dados entre recargas e reabertura por link.

Criterio de saida:
- fluxo completo repetivel com integridade tecnica minima.

## Fase 5 - Polish Comercial
Escopo:
- refinamento visual final
- ajustes de copy e microinteracoes
- estados vazios, loading, erro e sucesso
- melhoria de responsividade
- preparo de demo/deploy

Saida esperada:
- MVP com apresentacao comercial profissional.

Criterio de saida:
- demonstracao fluida para usuario real e stakeholders.

## Riscos Iniciais E Mitigacoes

### 1. Complexidade Prematura
Risco:
- tentar antecipar arquitetura enterprise e travar evolucao.
Mitigacao:
- interface por tarefas e infraestrutura minima evolutiva.

### 2. UX Poluida Por Termos Tecnicos
Risco:
- reduzir entendimento do usuario final.
Mitigacao:
- separar linguagem de negocio (UI) de linguagem tecnica (auditoria).

### 3. Fluxo Do Paciente Com Friccao
Risco:
- queda na taxa de conclusao.
Mitigacao:
- fluxo linear curto, CTA unico, validacoes objetivas.

### 4. Persistencia Fragil No MVP
Risco:
- perda de dados em testes.
Mitigacao:
- repositorio local com versionamento simples e backups de estado.

### 5. Assinatura Duplicada
Risco:
- inconsistencias juridico-operacionais.
Mitigacao:
- operacoes idempotentes e bloqueio de reprocessamento.

## Ordem De Execucao Das Fases
1. Fase 0 - Documentacao estrutural
2. Fase 1 - Fundacao de projeto
3. Fase 2 - Jornada do nutricionista
4. Fase 3 - Jornada do paciente
5. Fase 4 - Persistencia minima real
6. Fase 5 - Polish comercial

