# 📚 Bazari IPFS Multi-Node Runbook

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Configuração](#configuração)
4. [Operações do Dia-a-Dia](#operações-do-dia-a-dia)
5. [Monitoramento](#monitoramento)
6. [Troubleshooting](#troubleshooting)
7. [Escalabilidade](#escalabilidade)

---

## 🎯 Visão Geral

O Bazari utiliza um sistema de **IPFS Multi-Node com Failover Automático** para garantir alta disponibilidade no armazenamento descentralizado de arquivos.

### Características Principais

- ✅ **Failover Automático** - Se um nó falhar, tenta automaticamente o próximo
- ✅ **Retry Configurável** - 3 tentativas por nó com backoff exponencial
- ✅ **Timeout Configurável** - 30 segundos por operação
- ✅ **Logs Estruturados** - Rastreamento completo de todas as operações
- ✅ **Health Check** - Endpoint dedicado para monitoramento
- ✅ **Zero Downtime** - Adicionar/remover nós sem reiniciar a aplicação

---

## 🏗️ Arquitetura

### Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     Bazari API                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │          IpfsClientPool (Singleton)                │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │    │
│  │  │  Node 1  │  │  Node 2  │  │  Node 3  │  ...   │    │
│  │  │  Active  │  │  Standby │  │  Standby │        │    │
│  │  └──────────┘  └──────────┘  └──────────┘        │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
         ↓              ↓              ↓
    ┌────────┐    ┌────────┐    ┌────────┐
    │ IPFS 1 │    │ IPFS 2 │    │ IPFS 3 │
    │ :5001  │    │ :5001  │    │ :5001  │
    └────────┘    └────────┘    └────────┘
```

### Fluxo de Upload

```
1. Cliente → API → IpfsClientPool
2. Pool tenta Node 1 (tentativa 1)
   ├─ ✅ Sucesso → Retorna CID
   └─ ❌ Falha → Aguarda 1s → tentativa 2
       ├─ ✅ Sucesso → Retorna CID
       └─ ❌ Falha → Aguarda 2s → tentativa 3
           ├─ ✅ Sucesso → Retorna CID
           └─ ❌ Falha → Tenta Node 2
               └─ (repete processo)
```

---

## ⚙️ Configuração

### Arquivo de Configuração

**Localização:** `/root/bazari/apps/api/.env`

```bash
# IPFS Multi-Node Configuration
IPFS_API_URLS=http://127.0.0.1:5001,http://192.168.1.10:5001,http://backup:5001
IPFS_GATEWAY_URL=http://127.0.0.1:8080/ipfs/
IPFS_TIMEOUT_MS=30000
IPFS_RETRY_ATTEMPTS=3
```

### Variáveis de Ambiente

| Variável | Descrição | Padrão | Exemplo |
|----------|-----------|--------|---------|
| `IPFS_API_URLS` | URLs dos nós IPFS (CSV) | - | `http://node1:5001,http://node2:5001` |
| `IPFS_GATEWAY_URL` | URL do gateway HTTP | `https://ipfs.io/ipfs/` | `http://127.0.0.1:8080/ipfs/` |
| `IPFS_TIMEOUT_MS` | Timeout por operação (ms) | `30000` | `60000` |
| `IPFS_RETRY_ATTEMPTS` | Tentativas por nó | `3` | `5` |

---

## 🔧 Operações do Dia-a-Dia

### 1. Adicionar Novo Nó IPFS

#### Passo 1: Setup do servidor

```bash
# No novo servidor
ssh usuario@novo-servidor

# Instalar IPFS
wget https://dist.ipfs.tech/kubo/v0.24.0/kubo_v0.24.0_linux-amd64.tar.gz
tar -xvzf kubo_v0.24.0_linux-amd64.tar.gz
cd kubo
sudo bash install.sh

# Inicializar
ipfs init

# Configurar para aceitar conexões externas (se necessário)
ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001

# Iniciar daemon
ipfs daemon &
```

#### Passo 2: Atualizar configuração da API

```bash
# No servidor da API
vim /root/bazari/apps/api/.env

# Adicionar novo nó (CSV)
# ANTES:
IPFS_API_URLS=http://127.0.0.1:5001

# DEPOIS:
IPFS_API_URLS=http://127.0.0.1:5001,http://192.168.1.10:5001

# Reiniciar API
systemctl restart bazari-api

# Verificar logs
journalctl -u bazari-api -n 50 | grep IPFS
# Deve mostrar: [IPFS] ✅ Initialized with 2 node(s)
```

#### Passo 3: Validar

```bash
# Testar health check
curl https://bazari.libervia.xyz/api/health/ipfs | jq '.'

# Deve retornar:
# {
#   "status": "ok",
#   "nodeCount": 2,
#   "healthyNodes": 2,
#   "nodes": [
#     {"url": "http://127.0.0.1:5001", "healthy": true, "latency": 5},
#     {"url": "http://192.168.1.10:5001", "healthy": true, "latency": 12}
#   ]
# }
```

### 2. Remover Nó IPFS

```bash
# Editar .env
vim /root/bazari/apps/api/.env

# Remover nó da lista
IPFS_API_URLS=http://127.0.0.1:5001

# Reiniciar
systemctl restart bazari-api
```

### 3. Manutenção de Nó (Sem Downtime)

```bash
# Cenário: Precisa fazer manutenção no nó 2
# Sistema tem 3 nós: node1, node2, node3

# 1. Remover node2 temporariamente
vim /root/bazari/apps/api/.env
# IPFS_API_URLS=http://node1:5001,http://node3:5001  # removeu node2
systemctl restart bazari-api

# 2. Fazer manutenção no node2
ssh node2
# ... manutenção ...

# 3. Readicionar node2
vim /root/bazari/apps/api/.env
# IPFS_API_URLS=http://node1:5001,http://node2:5001,http://node3:5001
systemctl restart bazari-api
```

---

## 📊 Monitoramento

### 1. Health Check Manual

```bash
# Verificar status
curl https://bazari.libervia.xyz/api/health/ipfs | jq '.'

# Ver apenas nós não-saudáveis
curl https://bazari.libervia.xyz/api/health/ipfs | jq '.nodes[] | select(.healthy == false)'
```

### 2. Script de Monitoramento Automático

```bash
# Executar uma vez
/root/bazari-ipfs-monitor.sh

# Monitorar continuamente (a cada 60s)
/root/bazari-ipfs-monitor.sh --watch

# Monitorar com intervalo personalizado (30s)
/root/bazari-ipfs-monitor.sh --watch --interval 30
```

### 3. Logs da API

```bash
# Ver logs do IPFS em tempo real
journalctl -u bazari-api -f | grep IPFS

# Ver últimos 100 logs do IPFS
journalctl -u bazari-api -n 100 | grep IPFS

# Ver logs de uploads
journalctl -u bazari-api | grep "IPFS.*Upload"

# Ver logs de erros
journalctl -u bazari-api | grep "IPFS.*❌"
```

### 4. Métricas via Logs

```bash
# Contar uploads bem-sucedidos
journalctl -u bazari-api --since "1 hour ago" | grep -c "IPFS.*✅.*uploaded"

# Ver latência média
journalctl -u bazari-api --since "1 hour ago" | grep "IPFS.*✅.*uploaded" | grep -oP '\(\d+ms\)' | grep -oP '\d+' | awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'

# Ver nós que falharam
journalctl -u bazari-api --since "1 hour ago" | grep "IPFS.*❌" | grep -oP 'Node [^ ]+' | sort | uniq -c
```

---

## 🔍 Troubleshooting

### Problema: "All IPFS nodes failed"

**Sintomas:**
```
[IPFS] ❌ Node http://127.0.0.1:5001 attempt 3 failed
[IPFS] All 1 node(s) failed after 3 attempts each
```

**Causas Possíveis:**

1. **IPFS daemon não está rodando**
   ```bash
   # Verificar
   systemctl status ipfs
   # ou
   ps aux | grep ipfs

   # Solução
   ipfs daemon &
   # ou
   systemctl start ipfs
   ```

2. **Firewall bloqueando porta 5001**
   ```bash
   # Verificar
   netstat -tlnp | grep 5001

   # Testar conectividade
   curl http://127.0.0.1:5001/api/v0/id

   # Solução: Abrir porta
   ufw allow 5001
   ```

3. **Timeout muito baixo**
   ```bash
   # Aumentar timeout no .env
   IPFS_TIMEOUT_MS=60000  # 60 segundos
   ```

### Problema: "Health check shows degraded"

**Sintomas:**
```json
{
  "status": "degraded",
  "healthyNodes": 1,
  "totalNodes": 2
}
```

**Ações:**

1. **Identificar nó problemático**
   ```bash
   curl https://bazari.libervia.xyz/api/health/ipfs | jq '.nodes[] | select(.healthy == false)'
   ```

2. **Verificar logs do nó**
   ```bash
   ssh node2
   journalctl -u ipfs -n 100
   ```

3. **Remover nó temporariamente** (se necessário)
   ```bash
   vim /root/bazari/apps/api/.env
   # Remover URL do nó problemático
   systemctl restart bazari-api
   ```

### Problema: Upload muito lento

**Sintomas:**
```
[IPFS] ✅ Successfully uploaded to http://127.0.0.1:5001: Qm... (15234ms)
```

**Diagnóstico:**

```bash
# 1. Verificar latência de rede
ping -c 5 127.0.0.1

# 2. Verificar carga do servidor IPFS
ipfs stats repo

# 3. Verificar espaço em disco
df -h

# 4. Verificar I/O
iostat -x 1 5
```

**Soluções:**

- Aumentar recursos do servidor IPFS
- Adicionar mais nós para balanceamento
- Otimizar configuração do IPFS:
  ```bash
  ipfs config Datastore.StorageMax "100GB"
  ipfs config Swarm.ConnMgr.HighWater 900
  ```

### Problema: "TypeError: Failed to fetch"

**Sintomas (Frontend):**
```
[IPFS] ❌ Upload failed: TypeError: Failed to fetch
```

**Causa:** Frontend tentando acessar IPFS diretamente (127.0.0.1 do navegador)

**Solução:** Garantir que frontend chama endpoint da API:
```typescript
// ❌ ERRADO
fetch('http://127.0.0.1:5001/api/v0/add', ...)

// ✅ CORRETO
fetch(`${API_BASE_URL}/api/media/upload`, ...)
```

---

## 📈 Escalabilidade

### Recomendações por Carga

| Usuários Ativos | Uploads/min | Nós Recomendados | Configuração |
|-----------------|-------------|------------------|--------------|
| < 100 | < 10 | 1 | Local, timeout 30s |
| 100-1000 | 10-100 | 2 | 1 local + 1 remoto |
| 1000-10000 | 100-1000 | 3-5 | Load balancing, timeout 60s |
| > 10000 | > 1000 | 5+ | Cluster IPFS + CDN |

### Setup Recomendado para Produção

```bash
# .env (Produção)
IPFS_API_URLS=http://ipfs-primary:5001,http://ipfs-secondary:5001,http://ipfs-backup:5001
IPFS_GATEWAY_URL=https://ipfs.bazari.com/ipfs/
IPFS_TIMEOUT_MS=45000
IPFS_RETRY_ATTEMPTS=2
```

### Monitoramento Contínuo

```bash
# Adicionar ao cron para executar a cada 5 minutos
crontab -e

# Adicionar linha:
*/5 * * * * /root/bazari-ipfs-monitor.sh >> /var/log/bazari-ipfs-monitor.log 2>&1
```

### Alertas (Integração Slack)

Editar `/root/bazari-ipfs-monitor.sh`:

```bash
send_alert() {
    local status="$1"
    local details="$2"

    # Slack Webhook
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"🚨 IPFS Alert: $status\n\`\`\`$details\`\`\`\"}" \
      https://hooks.slack.com/services/YOUR/WEBHOOK/URL
}
```

---

## 📞 Contatos de Emergência

- **Equipe DevOps:** devops@bazari.com
- **On-Call:** +55 11 9999-9999
- **Documentação:** https://docs.bazari.com/ipfs

---

## 📝 Changelog

### 2025-10-21
- ✅ Implementado IpfsClientPool com failover automático
- ✅ Adicionado health check endpoint `/api/health/ipfs`
- ✅ Criado script de monitoramento `bazari-ipfs-monitor.sh`
- ✅ Migrado todos os clientes IPFS para usar pool único
- ✅ Documentado runbook completo

---

**Última atualização:** 2025-10-21
**Versão:** 1.0.0
**Mantido por:** Equipe Bazari
