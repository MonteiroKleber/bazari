# 🚀 Bazari - Configuração de Pré-Produção

## ✅ Status da Implementação

**Data de Deploy:** 2025-10-20
**Domínio:** https://bazari.libervia.xyz
**IP Fixo:** 191.252.179.192

---

## 📊 Arquitetura Implementada

```
┌─────────────────────────────────────────────────────────────┐
│  nginx (443/80) - bazari.libervia.xyz (SSL/HTTPS)           │
│  ├─ /           → Frontend React (servido pelo nginx)       │
│  ├─ /api        → Proxy para API Backend (porta 3000)       │
│  ├─ /rpc        → WebSocket BazariChain (porta 9944)        │
│  └─ /ipfs       → Proxy IPFS Gateway (porta 8081)           │
└─────────────────────────────────────────────────────────────┘

Serviços Backend:
├─ bazari-api:       localhost:3000  (Systemd)
├─ bazari-chain:     localhost:9944  (Systemd)
├─ ai-gateway:       localhost:3002  (Manual)
├─ ipfs-gateway:     localhost:8081  (Configurado)
├─ postgresql:       localhost:5432  ✅
├─ redis:            localhost:6379  ✅
└─ opensearch:       localhost:9200  ✅
```

---

## 🔧 Serviços Configurados

### **1. Nginx**
- **Arquivo:** `/etc/nginx/sites-available/bazari.conf`
- **Status:** ✅ Ativo e Configurado
- **SSL:** Certbot (Let's Encrypt)
- **Certificados:** `/etc/letsencrypt/live/bazari.libervia.xyz/`

**Configuração:**
- Frontend estático servido de: `/root/bazari/apps/web/dist`
- Cache de 1 ano para assets estáticos
- Proxy reverso para API e Chain
- Headers de segurança habilitados

### **2. Bazari API (Backend)**
- **Serviço Systemd:** `/etc/systemd/system/bazari-api.service`
- **Status:** ✅ Rodando
- **Porta:** 3000
- **WorkDir:** `/root/bazari/apps/api`
- **Env File:** `/root/bazari/apps/api/.env.production`
- **Comando:** `pnpm dev:nowatch` (tsx)

**Iniciar/Parar/Reiniciar:**
```bash
systemctl start bazari-api
systemctl stop bazari-api
systemctl restart bazari-api
systemctl status bazari-api
journalctl -u bazari-api -f
```

### **3. Bazari Chain (Substrate)**
- **Serviço Systemd:** `/etc/systemd/system/bazari-chain.service`
- **Status:** ✅ Rodando
- **Porta WebSocket:** 9944
- **Porta Prometheus:** 9616
- **WorkDir:** `/root/bazari-chain`

**Iniciar/Parar/Reiniciar:**
```bash
systemctl start bazari-chain
systemctl stop bazari-chain
systemctl restart bazari-chain
systemctl status bazari-chain
journalctl -u bazari-chain -f
```

---

## 📁 Arquivos de Configuração

### **Variáveis de Ambiente - API**
**Arquivo:** `/root/bazari/apps/api/.env.production`

```bash
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://bazari:bazari@localhost:5432/bazari_db
STORAGE_PROVIDER=fs

# Blockchain
BAZARICHAIN_WS=wss://bazari.libervia.xyz/rpc
BAZARICHAIN_GENESIS_HASH=0x8f55068572c4510a833743969d7a0dc627eba1fa49bac38c172cd83f95cdcd98

# IPFS
IPFS_API_URL=http://127.0.0.1:5001
IPFS_GATEWAY_URL=https://bazari.libervia.xyz/ipfs/
STORES_REGISTRY_ENABLED=1

# OpenSearch
USE_OPENSEARCH=true
OPENSEARCH_NODE=http://localhost:9200
OPENSEARCH_INDEX_STORES=bazari_stores

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=[GERADO_AUTOMATICAMENTE]
AUTH_DOMAIN=bazari.libervia.xyz
AUTH_URI=https://bazari.libervia.xyz/login

# Pagamentos
ESCROW_ACCOUNT=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
MARKETPLACE_FEE_BPS=250

# Features
STORE_ONCHAIN_V1=1
CORS_ORIGINS=https://bazari.libervia.xyz
AI_GATEWAY_URL=http://localhost:3002
```

### **Variáveis de Ambiente - Frontend**
**Arquivo:** `/root/bazari/apps/web/.env.production`

```bash
VITE_API_URL=https://bazari.libervia.xyz/api
VITE_BAZARICHAIN_WS=wss://bazari.libervia.xyz/rpc
VITE_FF_SELLER_PANEL=true
VITE_FF_PUBLIC_EXPLORE=true
VITE_FLAG_STORE_ONCHAIN_V1=true
```

---

## 🔐 Segurança

### **Portas Expostas Externamente:**
- **80 (HTTP):** Redireciona para HTTPS
- **443 (HTTPS):** SSL/TLS ativo

### **Portas Internas (localhost only):**
- **3000:** API Backend
- **9944:** Blockchain WebSocket (via proxy /rpc)
- **5432:** PostgreSQL
- **6379:** Redis
- **9200:** OpenSearch
- **8081:** IPFS Gateway (via proxy /ipfs)

### **JWT Secret:**
Gerado automaticamente com 64 caracteres usando:
```bash
openssl rand -hex 32
```

### **IPFS Gateway:**
Porta alterada de 8080 → 8081 para evitar conflito com aplicação.
```bash
ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8081
```

---

## 🛠️ Comandos Úteis

### **Verificar Status Completo:**
```bash
/root/bazari-status.sh
```

### **Rebuild do Frontend:**
```bash
cd ~/bazari/apps/web
pnpm build
systemctl reload nginx
```

### **Rebuild da API (não necessário - usa tsx):**
```bash
cd ~/bazari/apps/api
pnpm prisma:generate
systemctl restart bazari-api
```

### **Atualizar Código do Git:**
```bash
cd ~/bazari
git pull origin main
cd apps/web && pnpm build
systemctl restart bazari-api
systemctl reload nginx
```

### **Ver Logs:**
```bash
# API
journalctl -u bazari-api -f

# Chain
journalctl -u bazari-chain -f

# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### **Reiniciar Tudo:**
```bash
systemctl restart bazari-chain bazari-api nginx
```

---

## 🌐 URLs de Acesso

| Recurso | URL |
|---------|-----|
| **Frontend** | https://bazari.libervia.xyz |
| **API Backend** | https://bazari.libervia.xyz/api |
| **API Health Check** | https://bazari.libervia.xyz/api/health |
| **Chain WebSocket** | wss://bazari.libervia.xyz/rpc |
| **IPFS Gateway** | https://bazari.libervia.xyz/ipfs/[CID] |

---

## 📦 Build e Deploy

### **Processo de Build Executado:**

1. ✅ Instalação de dependências
2. ✅ Geração do Prisma Client
3. ✅ Execução das migrations do banco
4. ✅ Build dos packages (`siws-utils`, `shared-types`)
5. ✅ Build do frontend React (Vite)
6. ✅ Configuração do nginx
7. ✅ Criação de serviços systemd
8. ✅ Inicialização dos serviços

### **Diretórios de Build:**
- Frontend: `/root/bazari/apps/web/dist/` (servido pelo nginx)
- API: Roda diretamente com `tsx` (TypeScript runtime)
- Packages: `/root/bazari/packages/*/dist/`

---

## ⚙️ Ajustes Realizados

### **1. Configuração IPFS**
- Porta do Gateway alterada: 8080 → 8081
- Evita conflito com aplicação web

### **2. Build Frontend**
- Target ajustado para `esnext` (suportar top-level await)
- PWA configurado com limite de cache de 5MB
- Corrigida chave duplicada `votePoll` → `votePollPost`

### **3. API Backend**
- Usa `tsx` ao invés de build compilado
- Serviço systemd configurado com `pnpm dev:nowatch`
- EnvironmentFile aponta para `.env.production`

### **4. Nginx**
- Configuração completa com proxy reverso
- Cache agressivo para assets estáticos (1 ano)
- Timeouts apropriados para WebSockets (7 dias)
- Security headers habilitados

---

## 🔄 Próximos Passos Sugeridos

### **Opcional - Melhorias Futuras:**

1. **Monitoramento:**
   - Configurar Prometheus para métricas
   - Logs centralizados (Loki/Grafana)

2. **Backups:**
   - Backup automático do PostgreSQL
   - Backup dos uploads (`/root/bazari/apps/api/uploads`)

3. **CI/CD:**
   - GitHub Actions para deploy automático
   - Testes automatizados antes do deploy

4. **Performance:**
   - Configurar Redis como cache da API
   - CDN para assets estáticos

5. **Segurança:**
   - Fail2ban para proteção contra ataques
   - Rate limiting mais rigoroso no nginx
   - Firewall (ufw/iptables) configurado

---

## 🆘 Troubleshooting

### **API não inicia:**
```bash
journalctl -u bazari-api -n 50
systemctl status bazari-api
```

### **Frontend não carrega:**
```bash
# Verificar se dist existe
ls -la /root/bazari/apps/web/dist/

# Rebuild
cd ~/bazari/apps/web && pnpm build
```

### **Chain não conecta:**
```bash
# Verificar logs
journalctl -u bazari-chain -f

# Testar WebSocket local
wscat -c ws://localhost:9944
```

### **Nginx retorna 502:**
```bash
# Verificar se API está rodando
curl http://localhost:3000/api/health

# Ver logs nginx
tail -f /var/log/nginx/error.log
```

---

## ✅ Checklist de Deploy Completo

- [x] Node.js 18+ instalado
- [x] PNPM instalado
- [x] PostgreSQL ativo
- [x] Redis ativo
- [x] OpenSearch instalado
- [x] IPFS configurado (porta 8081)
- [x] nginx com SSL ativo
- [x] Arquivos `.env.production` criados
- [x] Build do frontend concluído
- [x] Packages buildados
- [x] Serviços systemd criados
- [x] Serviços iniciados e rodando
- [x] nginx recarregado
- [x] Health checks passando

---

## 📞 Informações Técnicas

**Servidor:** vps62205
**Sistema:** Linux 5.4.0-216-generic
**Node:** v20.19.5
**PNPM:** 9.15.9
**PostgreSQL:** 15
**Redis:** 6.x

---

**Deploy realizado em:** 2025-10-20
**Status:** ✅ PRÉ-PRODUÇÃO ATIVO
