# ClinicalSign - Fase 2 (Supabase MVP Compartilhado)

## Objetivo Desta Fase
- trocar persistencia local por persistencia compartilhada no Supabase Free
- manter fluxo real entre nutricionista e paciente em dispositivos diferentes
- manter envio manual por WhatsApp (sem e-mail automatico e sem SMS)

## O Que Foi Implementado
- integracao Supabase no front-end (`@supabase/supabase-js`)
- login do nutricionista por Supabase Auth (email + senha)
- persistencia compartilhada de solicitacoes
- status reais: `draft`, `awaiting_patient`, `opened`, `completed` (+ `cancelled` e `expired` preparados)
- geracao de `sign_token` e `access_code` no cliente
- hash SHA-256 do snapshot do documento via Web Crypto API
- eventos minimos de auditoria
- fluxo publico validado por token + codigo usando RPCs no banco

## Sem Provedores Pagos
- paciente recebe link e codigo manualmente via WhatsApp
- nenhum envio automatico por e-mail
- nenhum envio por SMS

## Setup Local (Supabase)
1. Criar projeto no Supabase (plano Free).
2. Em `SQL Editor`, executar o arquivo:
   - `supabase/migrations/20260406142000_phase2_shared_signature.sql`
3. Em `Authentication > Users`, criar usuario do nutricionista (email/senha).
4. Criar `.env` na raiz com:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
5. Instalar dependencias:
   - `npm install`
6. Rodar:
   - `npm run dev`

## Fluxo De Teste Rapido
1. Login com usuario criado no Supabase Auth.
2. Criar nova solicitacao.
3. Assinar como profissional.
4. Copiar link e codigo.
5. Abrir link em outro navegador/dispositivo.
6. Validar codigo, aceitar termos e assinar.
7. Voltar ao dashboard/detalhe do nutricionista e ver status atualizado.

## Limites Deliberados Desta Fase
- sem ICP-Brasil
- sem assinatura qualificada
- sem coleta de IP via backend proprio
- sem envio automatico de mensagens
- trilha juridica avancada fica para fases futuras

