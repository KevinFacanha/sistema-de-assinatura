# ClinicalSign - Design System Base

## Conceito Visual
**The Digital Curator**

Direcao:
- legal-tech + health-tech premium
- clean, confiavel, maduro
- editorial e objetivo
- sem estetica generica de template

## Tipografia
- Headline/Display: `Manrope`
- Body/Label: `Inter`

Escala recomendada:
- Display: 36/44 semibold
- H1: 28/36 semibold
- H2: 22/30 semibold
- H3: 18/26 semibold
- Body: 14/22 regular
- Label: 13/18 medium
- Caption: 12/16 regular

## Paleta Base
- Primary: `#1A2B3C`
- Secondary: `#2563EB`
- Tertiary: `#059669`
- Neutral: `#475569`

Neutros de suporte (UI):
- Surface-0: `#F8FAFC`
- Surface-1: `#F1F5F9`
- Surface-2: `#E2E8F0`
- Text-strong: `#0F172A`
- Text-muted: `#475569`
- Border-soft: `#CBD5E1`

Gradiente CTA principal:
- `linear-gradient(135deg, #1A2B3C 0%, #243B53 100%)`

## Tokens De Interface (base)
- Radius-sm: 8px
- Radius-md: 10px
- Radius-lg: 12px
- Shadow-sm: `0 1px 2px rgba(15, 23, 42, 0.06)`
- Shadow-md: `0 6px 20px rgba(15, 23, 42, 0.10)`
- Focus-ring: `0 0 0 3px rgba(37, 99, 235, 0.25)`

## Diretrizes De Layout
- App Shell em 3 blocos: cabecalho, conteudo, rodape contextual opcional.
- Densidade media: evitar telas "vazias" com espaco excessivo.
- Usar superfícies tonais em vez de grade pesada de linhas.
- Limite de largura para formularios longos: 880px.
- Dashboard com cards compactos e tabela/lista operacional.

## Componentes Do MVP

### Fundacionais
- `Button`: primary, secondary, ghost, danger.
- `Input`: texto, e-mail, mascara simples.
- `Checkbox`
- `Select`
- `Textarea`

### Estruturais
- `Card`
- `Alert`
- `Badge`
- `StatusPill`
- `UploadDropzone`
- `Stepper`
- `PageHeader`
- `SectionHeader`
- `SummaryCard` (read-only)
- `AppShell`

### Regras De Componente
- Estados obrigatorios: default, hover, focus, disabled, error.
- CTA primario usa gradiente navy.
- StatusPill padrao:
  - aguardando paciente -> azul suave
  - em andamento -> teal
  - concluida -> verde
  - erro/expirado -> vermelho suave
- UploadDropzone com feedback de arquivo selecionado e validacao de PDF.

## Motion E Microinteracoes
- transicoes curtas: 120-180ms
- easing suave: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- usar animacao apenas para:
  - entrada de etapas (stagger leve)
  - feedback de sucesso/erro
  - transicao entre estados do Stepper

## Voz Visual (Do/Don't)

### Fazer
- foco em tela de produto em uso
- hierarquia tipografica clara
- contraste robusto para leitura
- copy curta e orientada a tarefa

### Evitar
- visual de landing page
- icones e decoracao em excesso
- blocos institucionais longos
- aparencia de prototipo tecnico

## Base Tecnica De Estilo (Tailwind)
- `tailwind.config` com tokens da paleta e tipografia.
- variaveis CSS para cores semanticas (`--color-primary`, `--status-success`).
- componentes com classes utilitarias + camadas semanticas (`btn-primary`, `status-pill`).

