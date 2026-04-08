# ClinicalSign - User Flows

## 1. Fluxo Principal Do Nutricionista

### Visao Rapida
1. Login
2. Dashboard
3. Nova solicitacao
4. Assinatura profissional
5. Copiar link do paciente
6. Acompanhar status

### Passo A Passo
| Passo | Tela | O que o usuario faz | Resultado |
|---|---|---|---|
| 1 | Login | Informa e-mail e senha | Sessao autenticada |
| 2 | Dashboard | Clica em `Nova solicitacao` | Abertura do formulario |
| 3 | Nova solicitacao | Preenche paciente, tipo de documento, upload PDF, observacoes | Solicitacao em revisao |
| 4 | Assinatura profissional | Revisa resumo e confirma assinatura profissional | Link do paciente gerado |
| 5 | Link do paciente | Clica em `Copiar link` e envia por WhatsApp | Paciente pode iniciar |
| 6 | Detalhe/Dashboard | Acompanha status (`Aguardando paciente`, `Em andamento`, `Concluida`) | Controle operacional |

### Estados Da Solicitacao (interno)
- `DRAFT`: criada e ainda nao assinada pelo profissional.
- `WAITING_PATIENT`: profissional assinou e link foi emitido.
- `IN_PROGRESS`: paciente iniciou e esta no meio do fluxo.
- `COMPLETED`: paciente concluiu assinatura.
- `EXPIRED` / `UNAVAILABLE`: nao pode seguir no fluxo.

## 2. Fluxo Principal Do Paciente

### Visao Rapida
1. Abrir link
2. Validar OTP
3. Aceitar termos
4. Assinar
5. Concluir

### Passo A Passo
| Passo | Tela | O que o paciente faz | Resultado |
|---|---|---|---|
| 1 | Acesso por link | Abre URL recebida | Token validado ou redirecionado para estado auxiliar |
| 2 | OTP | Recebe codigo (modo dev: exibido em teste), informa codigo | Acesso aprovado |
| 3 | Termos | Le e aceita os termos | Consentimento registrado |
| 4 | Assinatura | Confirma assinatura | Documento finalizado |
| 5 | Concluido | Visualiza confirmacao | Fluxo encerrado |

## 3. Fluxos Auxiliares E Excecoes

### Link Expirado
1. Paciente abre link apos validade
2. Sistema mostra tela `Link expirado`
3. Usuario nao segue no fluxo

### Link Indisponivel
1. Token invalido ou solicitacao removida
2. Sistema mostra `Indisponivel`
3. Opcao de tentar novamente

### Erro Operacional
1. Falha temporaria em operacao critica
2. Sistema mostra erro claro e acao de recarregar
3. Operacao reaplicada com idempotencia

### Somente Leitura / Concluido
1. Paciente acessa link ja finalizado
2. Sistema mostra status concluido sem permitir nova assinatura

## 4. Pontos De Controle De Confianca
- Upload: gerar `hash_documento_original`.
- Inicio do fluxo de assinatura: gerar `hash_submetido`.
- Conclusao: gerar `hash_final`.
- Cada etapa gera evento em trilha de auditoria com timestamp.
- Assinatura profissional/paciente e conclusao devem ser idempotentes.

## 5. Regras De Clareza Em Cada Tela
Cada tela deve responder explicitamente:
1. Onde estou?
2. O que preciso fazer agora?
3. O que acontece depois?

Implementacao de UX:
- titulo de etapa visivel
- CTA primario unico
- texto de proximo passo curto abaixo do CTA

