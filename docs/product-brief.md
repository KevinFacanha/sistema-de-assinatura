# ClinicalSign - Product Brief (MVP)

## 1. Visao Do Produto
ClinicalSign e um MVP de assinatura eletronica focado no fluxo real do nutricionista: criar solicitacao, assinar como profissional, compartilhar link do paciente e acompanhar status ate conclusao.

O produto deve transmitir:
- simplicidade operacional
- confianca juridico-operacional
- clareza de proximo passo
- acabamento profissional (legal-tech + health-tech premium)

## 2. Publico-Alvo
- Primario: nutricionistas autonomos e pequenas clinicas de nutricao.
- Secundario: equipe administrativa de clinicas pequenas (quando houver apoio operacional).
- Usuario final indireto: paciente que recebe o link e assina em fluxo curto, sem onboarding.

## 3. Problema Resolvido
Hoje o nutricionista perde tempo e confiabilidade ao coletar assinaturas por meios informais (PDF por mensagem, imagem de assinatura, ida e volta manual sem rastreio).

ClinicalSign resolve com:
- fluxo unico e guiado para coleta de assinatura
- comprovacao de integridade documental (hashes)
- trilha de auditoria simples e verificavel
- acompanhamento de status sem friccao

## 4. Proposta De Valor
Em poucos minutos, o nutricionista consegue:
1. subir o PDF correto
2. assinar como profissional
3. enviar um link unico ao paciente por WhatsApp
4. acompanhar em tempo real se a assinatura foi concluida

Sem linguagem tecnica, sem menu complexo, sem treinamento.

## 5. Escopo Funcional Do MVP

### Jornada Do Nutricionista
1. Login
2. Dashboard operacional
3. Nova solicitacao
4. Upload de PDF e revisao
5. Assinatura profissional
6. Geracao/copia do link do paciente
7. Acompanhamento de status

### Jornada Do Paciente
1. Acesso por link unico
2. Validacao OTP
3. Aceite de termos
4. Assinatura
5. Confirmacao de conclusao

### Estados Auxiliares Obrigatorios
- link expirado
- indisponivel
- erro
- somente leitura/concluido

## 6. Requisitos De Confianca E Seguranca (MVP)
- hash do documento original no upload
- hash da versao submetida ao fluxo
- hash final do pacote concluido
- trilha de auditoria com eventos datados
- documento final imutavel apos conclusao
- operacoes criticas idempotentes (assinaturas, confirmacoes, conclusao)

Observacao: essas regras ficam na camada de negocio e auditoria, sem expor termos tecnicos na interface principal.

## 7. Fora Do Escopo Neste MVP
- automacao nativa de envio WhatsApp/e-mail
- multi-empresa/multi-tenant complexo
- editor de PDF dentro da plataforma
- certificados ICP-Brasil
- integracoes com prontuario/ERP

## 8. Indicadores De Sucesso Iniciais
- tempo medio de criacao de solicitacao < 3 minutos
- taxa de conclusao do paciente por link > 80%
- taxa de erro no fluxo do paciente < 5%
- zero perda de rastreabilidade por operacao critica

## 9. Premissas Iniciais
- projeto inicia em ambiente web responsivo (desktop primeiro, mobile funcional)
- linguagem da interface em portugues simples
- persistencia inicial local para validacao de fluxo (evoluivel para backend real)

