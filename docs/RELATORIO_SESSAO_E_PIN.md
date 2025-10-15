# Relatório: Análise de Sessão e Pedido de PIN do Cofre

**Data:** 2025-10-13
**Autor:** Análise Técnica do Sistema Bazari

---

## 1. RESUMO EXECUTIVO

O aplicativo Bazari possui dois sistemas de autenticação distintos que podem causar confusão ao usuário:

1. **Sessão HTTP (JWT)**: Autenticação baseada em tokens JWT para acesso às APIs
2. **Cofre (Vault)**: Sistema de armazenamento criptografado da seed/mnemonic da carteira blockchain, protegido por PIN

**Problema Reportado:** Usuário está logado no sistema (sessão HTTP ativa), mas ao acessar algumas páginas, é solicitado "Desbloquear cofre" com PIN.

**Causa Raiz:** Este comportamento é **intencional e esperado** - páginas que realizam transações blockchain necessitam descriptografar a seed da carteira usando o PIN, independentemente da sessão HTTP estar ativa.

---

## 2. ARQUITETURA DOS SISTEMAS DE AUTENTICAÇÃO

### 2.1 Sistema de Sessão HTTP (JWT)

**Objetivo:** Autenticar usuário para acesso às APIs REST do backend

**Fluxo:**
```
1. Login SIWS (Sign-In with Substrate)
   ├─ Usuário assina mensagem com chave privada da carteira
   ├─ Backend valida assinatura
   └─ Backend emite access token (JWT) + refresh token (HTTP-only cookie)

2. Acesso às APIs
   ├─ Access token enviado no header Authorization: Bearer <token>
   ├─ Token expira após tempo configurado (accessTokenExpiresIn)
   └─ Refresh automático via cookie HTTP-only

3. Sessão em memória (state)
   ├─ Armazenada em apps/web/src/modules/auth/session.ts
   ├─ Contém: { accessToken, user: { id, address }, expiresAt }
   └─ Perdida ao recarregar a página (apenas em memória)
```

**Arquivos principais:**
- `apps/web/src/modules/auth/session.ts` - Gerenciamento de estado da sessão
- `apps/web/src/modules/auth/api.ts` - APIs de login/logout/refresh
- `apps/web/src/components/auth/RequireAuth.tsx` - Guard de rotas protegidas
- `apps/web/src/components/auth/SessionBoundary.tsx` - Overlay de sessão expirada

**Verificações:**
```typescript
isSessionActive()      // Retorna true se existe sessão em memória
getSessionUser()       // Retorna dados do usuário logado
getAccessToken()       // Retorna JWT para chamadas API
refreshSession()       // Tenta renovar sessão via refresh token
```

### 2.2 Sistema de Cofre (Vault) com PIN

**Objetivo:** Proteger a seed/mnemonic da carteira blockchain com criptografia AES

**Fluxo:**
```
1. Criação da conta (Create/Import)
   ├─ Seed gerada ou importada
   ├─ Usuário define PIN (4-6 dígitos)
   ├─ Seed cifrada com AES-256-GCM usando PIN como senha
   └─ Armazenada em IndexedDB (banco 'bazari-auth')

2. Estrutura do Cofre
   ├─ DB: IndexedDB 'bazari-auth' v2
   ├─ Store 'vault_accounts': lista de contas cifradas
   │  └─ VaultAccountRecord {
   │       id: string (address)
   │       address: string
   │       cipher: string (seed cifrada em base64)
   │       iv: string (initialization vector)
   │       salt: string
   │       iterations: number (PBKDF2)
   │       createdAt: string
   │     }
   └─ Store 'vault_meta': metadados (conta ativa)

3. Uso da Seed (Assinatura de Transações)
   ├─ Aplicação pede PIN via PinService.getPin()
   ├─ Modal "Desbloquear cofre" é exibido
   ├─ Usuário digita PIN
   ├─ decryptMnemonic(cipher, iv, salt, pin, iterations)
   ├─ Seed descriptografada temporariamente em memória
   ├─ Transação assinada com Keyring do Polkadot.js
   └─ Seed descartada da memória imediatamente
```

**Arquivos principais:**
- `apps/web/src/modules/auth/crypto.store.ts` - Gerenciamento do cofre (IndexedDB)
- `apps/web/src/modules/wallet/pin/PinService.ts` - Serviço global para solicitar PIN
- `apps/web/src/modules/wallet/pin/PinProvider.tsx` - Componente que renderiza modal de PIN
- `apps/web/src/pages/auth/Unlock.tsx` - Página de desbloqueio do cofre

**APIs principais:**
```typescript
// Cofre
getActiveAccount()           // Pega conta ativa do IndexedDB
decryptMnemonic(cipher, iv, salt, pin, iterations) // Descriptografa seed

// PinService (Singleton global)
PinService.getPin(config)    // Solicita PIN do usuário
PinService.isOpen()          // Verifica se modal está aberto
PinService.confirm(pin)      // Confirma PIN digitado
PinService.cancel()          // Cancela solicitação
```

---

## 3. QUANDO O PIN É SOLICITADO

O PIN do cofre é solicitado **apenas** quando a aplicação precisa assinar uma transação blockchain. Identificamos os seguintes casos:

### 3.1 Páginas que Solicitam PIN

| Página | Rota | Motivo |
|--------|------|--------|
| **SendPage** | `/app/wallet/send` | Assinar transferência de tokens |
| **OrderPayPage** | `/app/orders/:orderId/pay` | Assinar pagamento de pedido |
| **SellerSetupPage** | `/app/sellers/setup` | Assinar transações on-chain da loja |
| **SellersListPage** | `/app/sellers` | Aceitar transferência de loja |
| **P2POrderRoomPage** | `/app/p2p/orders/:id` | Travar fundos em escrow P2P |
| **AccountsPage** | `/app/wallet/accounts` | Trocar conta ativa (requer SIWS) |

### 3.2 Exemplo de Código (SendPage)

```typescript
// apps/web/src/modules/wallet/pages/SendPage.tsx

const handleSend = async (values: FormValues) => {
  // 1. Verifica se tem conta no cofre
  const acct = await getActiveAccount();
  if (!acct) {
    setErrorMessage('Nenhum cofre encontrado');
    return;
  }

  // 2. SOLICITA PIN AO USUÁRIO
  const pin = await PinService.getPin({
    title: 'Confirmar com PIN',
    description: 'Digite o PIN do cofre para assinar a transação',
    validate: async (p) => {
      try {
        // Valida PIN tentando descriptografar
        await decryptMnemonic(acct.cipher, acct.iv, acct.salt, p, acct.iterations);
        return null; // PIN correto
      } catch {
        return 'PIN inválido'; // Mostra erro e mantém modal aberto
      }
    },
  });

  // 3. Descriptografa seed com PIN validado
  const mnemonic = await decryptMnemonic(
    acct.cipher, acct.iv, acct.salt, pin, acct.iterations
  );

  // 4. Assina e envia transação
  const keyring = new Keyring({ type: 'sr25519' });
  const pair = keyring.addFromMnemonic(mnemonic);
  const tx = api.tx.balances.transfer(recipient, amount);
  await tx.signAndSend(pair);
};
```

---

## 4. POR QUE ISSO ACONTECE MESMO ESTANDO LOGADO

### 4.1 Separação de Responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│                    USUÁRIO LOGADO                            │
│  (Sessão HTTP ativa com JWT)                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       │                               │
       ▼                               ▼
┌──────────────┐              ┌────────────────┐
│  APIs REST   │              │  Transações    │
│  (Backend)   │              │  Blockchain    │
├──────────────┤              ├────────────────┤
│ Autenticado  │              │ Requer PIN     │
│ com JWT      │              │ para assinar   │
└──────────────┘              └────────────────┘
```

### 4.2 Razões de Segurança

**Por que não manter a seed descriptografada?**
- ❌ **Vazamento de memória:** Se a seed ficasse descriptografada, um ataque de memory dump poderia roubar a carteira
- ❌ **XSS:** Ataques de Cross-Site Scripting poderiam acessar a seed em memória
- ❌ **Persistência:** Seed descriptografada em localStorage seria facilmente roubada

**Por que pedir PIN mesmo com JWT válido?**
- ✅ **Princípio do Menor Privilégio:** JWT só dá acesso às APIs, não à carteira
- ✅ **2FA Implícito:** PIN é uma segunda camada de autenticação para operações críticas
- ✅ **Proteção contra Session Hijacking:** Mesmo que alguém roube o JWT, não consegue assinar transações sem o PIN

### 4.3 Fluxo Completo de Uso

```
1. Usuário abre app
   └─ App.tsx chama refreshSession()
      ├─ Tenta renovar JWT via refresh token (HTTP-only cookie)
      └─ Se sucesso: sessão ativa, acesso às rotas /app/*

2. Usuário navega para /app/wallet/send
   └─ RequireAuth verifica sessão HTTP
      ├─ Sessão ativa? ✓ Renderiza página
      └─ Sessão expirada? → Redireciona para /auth/unlock

3. Usuário preenche formulário de envio e clica "Enviar"
   └─ SendPage.handleSend()
      ├─ PinService.getPin() → Modal "Desbloquear cofre" aparece
      ├─ Usuário digita PIN
      ├─ Validação: decryptMnemonic() tenta descriptografar
      ├─ PIN correto? → Seed descriptografada temporariamente
      ├─ Transação assinada com seed
      ├─ Seed descartada da memória
      └─ Transação enviada à blockchain
```

---

## 5. PROBLEMAS IDENTIFICADOS

### 5.1 Confusão de UX (User Experience)

**Problema:** Usuário está logado (JWT válido) mas recebe mensagem "Desbloquear cofre / Informe seu PIN" ao acessar certas páginas.

**Causa:** Falta de contexto para o usuário sobre a diferença entre:
- Login no app (sessão HTTP) vs.
- Desbloqueio do cofre (acesso à carteira blockchain)

**Exemplos de cenários confusos:**
1. Usuário faz login → vai para /app/sellers/setup → aparece modal de PIN imediatamente
2. Usuário está navegando há 10 minutos → vai enviar tokens → aparece modal de PIN
3. Usuário recarrega página → sessão restaurada → vai pagar pedido → aparece modal de PIN

### 5.2 Fluxo de Reautenticação

**Problema:** Se a sessão HTTP expirar, o usuário é redirecionado para `/auth/unlock`, que:
1. Solicita PIN
2. Descriptografa seed
3. Faz SIWS (assina mensagem de login)
4. Restaura sessão HTTP

**Confusão:** `/auth/unlock` é usado tanto para:
- Restaurar sessão HTTP expirada (faz SIWS)
- Desbloquear cofre para transações (apenas descriptografa)

### 5.3 Estado da Sessão Perdido ao Recarregar

**Problema:** Sessão HTTP é armazenada apenas em memória (variável `state` em `session.ts`).

**Impacto:**
- Ao recarregar a página: `state = null`
- `App.tsx` tenta `refreshSession()` via refresh token
- Se refresh token expirou ou inválido: usuário precisa fazer Unlock novamente

**Código atual (App.tsx):**
```typescript
useEffect(() => {
  const initializeApp = async () => {
    if (!isSessionActive()) {
      // Sessão em memória perdida
      const refreshed = await refreshSession();
      if (!refreshed) {
        // Refresh token expirou
        console.log('Session refresh failed, user needs to login');
        return;
      }
    }
    // ... inicializa chat
  };
  initializeApp();
}, []);
```

**Problema:** Se refresh falhar, o usuário NÃO é redirecionado automaticamente para `/auth/unlock`. Apenas quando tentar acessar uma rota com `<RequireAuth>`.

---

## 6. SOLUÇÃO GLOBAL PROPOSTA

### 6.1 Melhorias de UX (Curto Prazo)

#### A. Mensagens Contextuais no Modal de PIN

**Antes:**
```
Desbloquear cofre
Informe seu PIN
```

**Depois:**
```
[Ícone de carteira]
Confirmar Transação

Para assinar esta transação na blockchain, digite o PIN da sua carteira.

[Campo de PIN]

[Cancelar] [Confirmar]
```

**Implementação:**
```typescript
// Em cada página que usa PinService.getPin()
await PinService.getPin({
  title: 'Confirmar Transação',
  description: 'Para assinar esta transação de envio de 10 BZR para 5FHneW..., digite o PIN da sua carteira.',
  label: 'PIN da Carteira',
  confirmText: 'Assinar Transação',
  cancelText: 'Cancelar',
});
```

#### B. Indicador de Sessão vs Cofre

**Adicionar no Header:**
```
┌────────────────────────────────────────┐
│  [Logo Bazari]           [Status]  👤  │
│                                        │
│  Status:                               │
│  🟢 Sessão ativa                       │
│  🔒 Cofre bloqueado (PIN necessário)   │
└────────────────────────────────────────┘
```

**Estado possível:**
- 🟢 Sessão ativa + 🔒 Cofre bloqueado (estado atual)
- 🟢 Sessão ativa + 🔓 Cofre desbloqueado (se implementar desbloqueio temporário)
- 🔴 Sessão expirada

#### C. Onboarding / Tutorial

**Primeira vez que PIN é solicitado:**
```
┌──────────────────────────────────────────────┐
│  💡 Sobre o PIN da Carteira                  │
│                                              │
│  Você está logado no Bazari, mas para       │
│  assinar transações blockchain, precisamos  │
│  descriptografar sua carteira com o PIN.     │
│                                              │
│  Isso garante que apenas você pode mover    │
│  seus fundos, mesmo se alguém acessar sua   │
│  conta.                                      │
│                                              │
│  [Não mostrar novamente]  [Entendi]          │
└──────────────────────────────────────────────┘
```

### 6.2 Melhorias de Arquitetura (Médio Prazo)

#### A. Desbloqueio Temporário do Cofre (Sessão de Vault)

**Conceito:** Manter a seed descriptografada em memória por um período após o usuário digitar o PIN.

**Implementação:**
```typescript
// apps/web/src/modules/auth/vault-session.ts
class VaultSession {
  private mnemonic: string | null = null;
  private expiresAt: number = 0;
  private timeout: NodeJS.Timeout | null = null;

  async unlock(pin: string, duration = 5 * 60 * 1000) { // 5 minutos padrão
    const acct = await getActiveAccount();
    if (!acct) throw new Error('No account');

    this.mnemonic = await decryptMnemonic(
      acct.cipher, acct.iv, acct.salt, pin, acct.iterations
    );

    this.expiresAt = Date.now() + duration;
    this.scheduleAutoLock(duration);
  }

  isUnlocked(): boolean {
    return this.mnemonic !== null && Date.now() < this.expiresAt;
  }

  getMnemonic(): string {
    if (!this.isUnlocked()) throw new Error('Vault locked');
    return this.mnemonic!;
  }

  lock() {
    this.mnemonic = null;
    this.expiresAt = 0;
    if (this.timeout) clearTimeout(this.timeout);
  }

  private scheduleAutoLock(duration: number) {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.lock(), duration);
  }
}

export const vaultSession = new VaultSession();
```

**Uso:**
```typescript
// Em SendPage, SellerSetupPage, etc.
if (!vaultSession.isUnlocked()) {
  const pin = await PinService.getPin({ ... });
  await vaultSession.unlock(pin);
}

const mnemonic = vaultSession.getMnemonic();
// Usar mnemonic para assinar transação
```

**Vantagens:**
- Usuário digita PIN uma vez
- Durante 5 minutos, pode fazer múltiplas transações sem redigitar PIN
- Timeout automático por segurança

**Desvantagens:**
- Seed fica em memória (aumenta superfície de ataque)
- Precisa implementar lock manual (botão "Bloquear Carteira")

#### B. Separar `/auth/unlock` de "Desbloqueio de Transação"

**Problema atual:** `/auth/unlock` faz duas coisas:
1. Restaura sessão HTTP (SIWS)
2. Descriptografa cofre

**Solução:**
- `/auth/unlock` → Apenas restaurar sessão HTTP (SIWS)
- Modal de PIN → Apenas descriptografar cofre para transações

**Implementação:**
```typescript
// RequireAuth.tsx
if (!isSessionActive() && !await fetchProfile()) {
  // Sessão expirada: redireciona para /auth/unlock
  navigate('/auth/unlock');
}

// SendPage.tsx
// Agora só pede PIN, não redireciona para /auth/unlock
const pin = await PinService.getPin({ ... });
```

#### C. Persistir Estado de Sessão HTTP

**Problema:** Sessão perdida ao recarregar página.

**Solução 1:** Armazenar em localStorage
```typescript
// session.ts
export function setSession(payload: SessionPayload) {
  state = { ...payload, expiresAt: Date.now() + payload.accessTokenExpiresIn * 1000 };
  localStorage.setItem('session', JSON.stringify(state));
}

export function loadSession() {
  const stored = localStorage.getItem('session');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.expiresAt > Date.now()) {
      state = parsed;
      return true;
    }
  }
  return false;
}
```

**Solução 2:** Usar apenas refresh token (mais seguro)
```typescript
// App.tsx
useEffect(() => {
  // Sempre tentar refresh ao iniciar
  refreshSession().then(success => {
    if (success) {
      // Sessão restaurada
    } else {
      // Redirecionar para /auth/unlock se em rota protegida
    }
  });
}, []);
```

### 6.3 Melhorias de Segurança (Longo Prazo)

#### A. Biometria (WebAuthn)

**Substituir PIN por impressão digital/Face ID:**
```typescript
// Usar WebAuthn API para autenticar
const credential = await navigator.credentials.get({
  publicKey: { ... }
});

// Descriptografar seed com credencial ao invés de PIN
```

#### B. Hardware Wallet (Ledger/Trezor)

**Mover assinatura para dispositivo externo:**
- Seed nunca sai do hardware wallet
- App envia transação → hardware wallet assina → app envia assinada

#### C. Multi-Signature / Social Recovery

**Dividir seed em múltiplos fragmentos (Shamir's Secret Sharing):**
- Seed dividida em 3 partes
- Precisa de 2 de 3 para reconstruir
- Partes armazenadas em: dispositivo + backup cloud + contato confiável

---

## 7. IMPLEMENTAÇÃO RECOMENDADA (ETAPAS)

### Fase 1: Melhorias Imediatas (1-2 dias)

1. **Mensagens contextuais no PinService**
   - Atualizar todas as chamadas `PinService.getPin()` com mensagens específicas
   - Exemplo: "Para enviar 10 BZR, digite seu PIN"

2. **Adicionar tooltip/ajuda no modal de PIN**
   - Ícone (?) ao lado do campo PIN
   - Tooltip: "O PIN protege sua carteira blockchain. Ele é necessário para assinar transações."

3. **Onboarding na primeira solicitação de PIN**
   - Usar localStorage: `localStorage.getItem('pin_tutorial_shown')`
   - Mostrar modal explicativo apenas uma vez

### Fase 2: Desbloqueio Temporário (3-5 dias)

1. **Implementar VaultSession**
   - Arquivo: `apps/web/src/modules/auth/vault-session.ts`
   - Singleton que mantém mnemonic em memória por 5 minutos
   - Auto-lock após timeout

2. **Adicionar indicador de cofre no Header**
   - Badge: "🔒 Cofre Bloqueado" ou "🔓 Cofre Desbloqueado (5:00)"
   - Countdown de tempo restante
   - Botão "Bloquear Agora" quando desbloqueado

3. **Atualizar páginas de transação**
   - Verificar `vaultSession.isUnlocked()` antes de pedir PIN
   - Pedir PIN apenas se bloqueado
   - Unificar lógica em um hook: `useVaultUnlock()`

### Fase 3: Refatoração de Autenticação (1-2 semanas)

1. **Separar fluxos de Unlock**
   - `/auth/unlock` → Apenas restaurar sessão HTTP
   - Modal PIN → Apenas descriptografar cofre

2. **Melhorar persistência de sessão**
   - Implementar strategy: sempre usar refresh token
   - Remover dependência de sessão em memória
   - Adicionar retry automático de refresh

3. **Testes E2E**
   - Cenário 1: Login → transação → sucesso
   - Cenário 2: Login → recarregar → transação → sucesso
   - Cenário 3: Sessão expirada → unlock → transação → sucesso
   - Cenário 4: Cofre bloqueado → PIN errado → erro → PIN correto → sucesso

---

## 8. CÓDIGO DE EXEMPLO (SOLUÇÃO RÁPIDA)

### 8.1 Hook Unificado de Vault Unlock

```typescript
// apps/web/src/modules/auth/hooks/useVaultUnlock.ts
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getActiveAccount, decryptMnemonic } from '@/modules/auth';
import { PinService } from '@/modules/wallet/pin/PinService';

interface UnlockConfig {
  title?: string;
  description?: string;
}

export function useVaultUnlock() {
  const { t } = useTranslation();

  const unlock = useCallback(async (config?: UnlockConfig): Promise<string> => {
    const acct = await getActiveAccount();
    if (!acct) {
      throw new Error(t('wallet.errors.noVault'));
    }

    const pin = await PinService.getPin({
      title: config?.title || t('wallet.pin.defaultTitle'),
      description: config?.description || t('wallet.pin.defaultDescription'),
      label: t('wallet.pin.label'),
      confirmText: t('wallet.pin.confirm'),
      cancelText: t('wallet.pin.cancel'),
      validate: async (p) => {
        try {
          await decryptMnemonic(acct.cipher, acct.iv, acct.salt, p, acct.iterations);
          return null;
        } catch {
          return t('wallet.pin.invalid') as string;
        }
      },
    });

    return await decryptMnemonic(acct.cipher, acct.iv, acct.salt, pin, acct.iterations);
  }, [t]);

  return { unlock };
}
```

**Uso:**
```typescript
// Em SendPage.tsx
import { useVaultUnlock } from '@/modules/auth/hooks/useVaultUnlock';

export function SendPage() {
  const { unlock } = useVaultUnlock();

  const handleSend = async (values) => {
    const mnemonic = await unlock({
      title: 'Confirmar Envio',
      description: `Para enviar ${values.amount} BZR para ${shortenAddress(values.recipient)}, digite o PIN da sua carteira.`,
    });

    // ... assinar e enviar transação
  };
}
```

### 8.2 Indicador de Status no Header

```typescript
// apps/web/src/components/header/SessionStatus.tsx
import { Lock, LockOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { vaultSession } from '@/modules/auth/vault-session';

export function SessionStatus() {
  const isVaultUnlocked = vaultSession.isUnlocked();

  return (
    <div className="flex items-center gap-2">
      <Badge variant={isVaultUnlocked ? 'default' : 'secondary'}>
        {isVaultUnlocked ? (
          <>
            <LockOpen className="h-3 w-3 mr-1" />
            Cofre Desbloqueado
          </>
        ) : (
          <>
            <Lock className="h-3 w-3 mr-1" />
            Cofre Bloqueado
          </>
        )}
      </Badge>
    </div>
  );
}
```

### 8.3 Traduções (i18n)

```json
// apps/web/src/i18n/pt.json
{
  "wallet": {
    "pin": {
      "defaultTitle": "Confirmar Transação",
      "defaultDescription": "Para assinar esta transação na blockchain, digite o PIN da sua carteira.",
      "label": "PIN da Carteira",
      "confirm": "Assinar Transação",
      "cancel": "Cancelar",
      "invalid": "PIN incorreto. Tente novamente.",
      "tutorial": {
        "title": "Sobre o PIN da Carteira",
        "description": "Você está logado no Bazari, mas para assinar transações blockchain, precisamos descriptografar sua carteira com o PIN. Isso garante que apenas você pode mover seus fundos, mesmo se alguém acessar sua conta.",
        "dontShowAgain": "Não mostrar novamente",
        "understood": "Entendi"
      }
    },
    "vault": {
      "locked": "Cofre Bloqueado",
      "unlocked": "Cofre Desbloqueado",
      "lockNow": "Bloquear Agora"
    }
  }
}
```

---

## 9. CONCLUSÃO

### Resposta à Pergunta Original

**Por que o sistema pede PIN mesmo estando logado?**

**Resposta:** Este comportamento é **intencional e correto do ponto de vista de segurança**. O sistema possui duas camadas de autenticação:

1. **Login (JWT)** → Acesso às APIs do backend
2. **PIN do Cofre** → Acesso à carteira blockchain para assinar transações

Estar logado (JWT) não é suficiente para assinar transações, pois a seed da carteira está criptografada no IndexedDB. O PIN é necessário para descriptografá-la temporariamente.

### Problema de UX vs Segurança

- **Problema de UX:** Usuário não entende por que precisa digitar PIN se já está logado
- **Solução de UX:** Mensagens contextuais, onboarding, indicadores visuais
- **Problema de Segurança:** Manter seed descriptografada seria vulnerável
- **Solução de Segurança:** Implementar "desbloqueio temporário" com timeout de 5 minutos

### Recomendação Final

**Implementar FASE 1 imediatamente** para melhorar a experiência do usuário sem comprometer a segurança:

1. ✅ Adicionar mensagens contextuais nos modais de PIN
2. ✅ Criar tutorial/onboarding sobre o PIN na primeira solicitação
3. ✅ Unificar lógica de unlock em hook reutilizável

**Planejar FASE 2 para próxima sprint** caso a demanda de UX seja alta:

4. ⏳ Implementar VaultSession com desbloqueio temporário (5 min)
5. ⏳ Adicionar indicador visual de status do cofre no Header

**FASE 3 é opcional** e deve ser considerada apenas se houver reclamações recorrentes de usuários.

---

**Documento criado em:** 2025-10-13
**Próxima revisão:** Após implementação da Fase 1
