# ClinicalSign - Sitemap (Orientado Ao Fluxo)

## Mapa Geral
O sistema e dividido por jornada real de uso:
- Jornada do nutricionista (autenticada)
- Jornada do paciente (link publico)

Nao existem "zonas" ou estruturas abstratas na interface.

## Rotas Da Jornada Do Nutricionista

| Rota | Tela | Objetivo | Acao Principal |
|---|---|---|---|
| `/login` | Login | Entrar no sistema | `Entrar` |
| `/app/dashboard` | Dashboard | Ver solicitacoes e status | `Nova solicitacao` |
| `/app/solicitacoes/nova` | Nova solicitacao | Cadastrar paciente + subir documento | `Revisar e assinar` |
| `/app/solicitacoes/:requestId/assinatura-profissional` | Assinatura profissional | Confirmar dados e assinar como profissional | `Assinar e gerar link` |
| `/app/solicitacoes/:requestId/link` | Link do paciente | Copiar link unico de assinatura | `Copiar link` |
| `/app/solicitacoes/:requestId` | Detalhe da solicitacao | Acompanhar progresso e trilha | `Atualizar status` (acao passiva/reload) |

## Rotas Da Jornada Do Paciente

| Rota | Tela | Objetivo | Acao Principal |
|---|---|---|---|
| `/s/:token` | Acesso por link | Validar disponibilidade do link | `Continuar` |
| `/s/:token/otp` | Validacao OTP | Confirmar identidade de acesso | `Validar codigo` |
| `/s/:token/termos` | Aceite de termos | Registrar consentimento | `Aceitar e continuar` |
| `/s/:token/assinar` | Assinatura do paciente | Formalizar assinatura | `Assinar documento` |
| `/s/:token/concluido` | Concluido | Confirmar finalizacao | `Fechar` |

## Estados Auxiliares Publicos

| Rota | Estado | Mensagem Central | Acao |
|---|---|---|---|
| `/s/:token/expirado` | Link expirado | "Este link nao esta mais disponivel." | `Voltar` |
| `/s/:token/indisponivel` | Indisponivel | "Nao foi possivel abrir esta solicitacao." | `Tentar novamente` |
| `/s/:token/erro` | Erro | "Ocorreu um erro no processamento." | `Recarregar` |
| `/s/:token/somente-leitura` | Somente leitura/concluido | "Esta assinatura ja foi concluida." | `Visualizar resumo` |

## Regras De Navegacao
- Sempre 1 CTA principal por tela.
- Breadcrumbs apenas no fluxo autenticado quando agregarem contexto.
- Fluxo do paciente sem menu, sem distrações e sem navegação lateral.
- Redirecionamentos automáticos para estados validos (ex.: token invalido -> indisponivel).

