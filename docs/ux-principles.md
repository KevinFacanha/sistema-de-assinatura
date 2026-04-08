# ClinicalSign - UX Principles

## Objetivo De UX
Entregar um produto que qualquer nutricionista consiga usar sem treinamento, com foco em produtividade e conclusao rapida do fluxo de assinatura.

## Principios Norteadores

### 1. Fluxo Antes De Arquitetura
- A interface segue tarefas reais do usuario.
- Nao exibir termos tecnicos, camadas de sistema ou organizacao interna.
- Navegacao baseada em "o que fazer agora".

### 2. Uma Decisao Principal Por Tela
- Cada tela tem 1 CTA principal.
- Acoes secundarias ficam discretas.
- Evitar sobrecarga cognitiva e bifurcacoes desnecessarias.

### 3. Clareza Imediata
Toda tela responde:
1. onde estou
2. o que faco agora
3. o que acontece depois

Padrao:
- titulo objetivo
- subtitulo curto de contexto
- CTA claro com verbo de acao

### 4. Linguagem Simples E Direta
- Sem jargao tecnico (hash, runtime, token, idempotencia) na UI principal.
- Texto orientado a tarefa: "Assinar documento", "Copiar link", "Validar codigo".
- Mensagens de erro com orientacao de recuperacao.

### 5. Confianca Sem Ruido
- Sinais de seguranca e rastreio aparecem como garantia, nao como burocracia.
- Mostrar status e historico de forma limpa e resumida.
- Expor detalhes tecnicos apenas em areas de auditoria/read-only quando necessario.

### 6. Continuidade De Estado
- Usuario nunca perde contexto ao voltar para dashboard.
- Status visiveis e consistentes em lista e detalhe.
- Fluxo do paciente nao depende de login ou navegacao paralela.

### 7. Velocidade Percebida
- Feedback imediato em operacoes (upload, validacao OTP, assinatura).
- Skeletons/estados de carregamento curtos e discretos.
- Evitar bloqueios longos sem retorno visual.

### 8. Acessibilidade E Inclusao Minimas De MVP
- Contraste adequado para texto e status.
- Campos com labels sempre visiveis.
- Estados de erro e sucesso nao dependem apenas de cor.
- Navegacao funcional por teclado nas telas principais.

## Regras Por Tipo De Tela

### Login
- foco em concluir acesso rapido
- sem copy institucional longa
- CTA unico: `Entrar`

### Dashboard
- leitura operacional imediata
- cards uteis (contagens por status)
- lista recente com proximas acoes

### Nova Solicitacao
- formulario em blocos curtos
- validacoes in-line
- revisao rapida antes da assinatura profissional

### Assinatura Profissional
- resumo objetivo do documento/paciente
- confirmacao explicita
- saida clara: geracao de link

### Fluxo Publico Do Paciente
- sem menu e sem distrações
- progressao linear por etapas
- mensagens curtas e tranquilizadoras

## Erros E Recuperacao
- Expirado: informar causa e bloquear continuidade.
- Indisponivel: orientar tentativa posterior.
- OTP invalido: informar tentativas restantes.
- Falha tecnica: manter dados e oferecer `Tentar novamente`.

## Heuristica De Revisao (Checklist)
- Esta claro em 3 segundos o objetivo da tela?
- O CTA principal e inequívoco?
- O proximo passo e compreensivel sem ajuda externa?
- Existe uma rota de recuperacao em caso de erro?
- A interface parece software real em operacao, nao prototipo?

