# NGINX Governance Routes Fix

## Problema Identificado

O NGINX estava configurado para fazer proxy de **todas** as rotas `/governance/*` para o backend API:

```nginx
# ANTES (INCORRETO)
location ~ ^/(auth|...|governance) {
    proxy_pass http://127.0.0.1:3000;
}
```

Isso causava conflito porque:
- Rotas React SPA: `/app/governance/*` (frontend)
- Rotas API: `/governance/stats`, `/governance/treasury/*`, etc. (backend)

Resultado: Ambas iam para o backend, causando 404 para as rotas SPA.

## Solução Implementada

Criado um `location` específico apenas para as rotas de API de governance:

```nginx
# DEPOIS (CORRETO)
# Governance API routes (específicas, não /app/governance que é SPA)
location ~ ^/governance/(treasury|democracy|council|tech-committee|stats|multisig|events) {
    proxy_pass http://127.0.0.1:3000;
    # ... headers e timeouts
}
```

## Mapeamento de Rotas

### Rotas de API (Backend) - `/governance/*`
- `/governance/stats` → Estatísticas gerais
- `/governance/treasury/proposals` → Propostas do tesouro
- `/governance/treasury/approvals` → Aprovações pendentes
- `/governance/democracy/referendums` → Referendos
- `/governance/democracy/proposals` → Propostas de democracia
- `/governance/council/members` → Membros do conselho
- `/governance/council/proposals` → Propostas do conselho
- `/governance/tech-committee/members` → Membros do comitê técnico
- `/governance/tech-committee/proposals` → Propostas do comitê
- `/governance/multisig/:address` → Dados de multisig (futuro)
- `/governance/events` → WebSocket de eventos (futuro)

### Rotas SPA (Frontend) - `/app/governance/*`
- `/app/governance` → Dashboard de governança
- `/app/governance/proposals` → Lista de propostas
- `/app/governance/proposals/new` → Criar proposta
- `/app/governance/proposals/:type/:id` → Detalhes de proposta
- `/app/governance/treasury` → Página do tesouro
- `/app/governance/council` → Página do conselho
- `/app/governance/multisig` → Página de multisig

## Verificação

```bash
# Rota de API deve retornar JSON
curl https://bazari.libervia.xyz/governance/stats
# {"success":true,"data":{...}}

# Rota SPA deve retornar HTML
curl https://bazari.libervia.xyz/app/governance
# <!DOCTYPE html>...

# Browser deve carregar sem erro
# https://bazari.libervia.xyz/app/governance
```

## Referência

- Arquivo: `/etc/nginx/sites-available/bazari.conf`
- Commit: [hash]
- Data: 2025-10-29
