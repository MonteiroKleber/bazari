# Feature 04: Migrar Contas para Settings

## Objetivo

Mover todo o gerenciamento de contas do AccountsPage para o SettingsModal, mantendo TODA a funcionalidade existente.

## ATENCAO MAXIMA

O AccountsPage (818 linhas) contem logica CRITICA de seguranca:
- Geracao de mnemonic
- Criptografia AES-GCM com PIN
- Validacao de mnemonic
- Decriptografia para exportar
- SIWS session para trocar conta

**NAO ALTERAR NENHUMA LOGICA DE SEGURANCA**

## O Que Extrair do AccountsPage

### Arquivo Original
`apps/web/src/modules/wallet/pages/AccountsPage.tsx` (818 linhas)

### Estrutura do AccountsPage

```
AccountsPage
├── CreateAccountPanel (linhas ~50-200)
│   ├── generateMnemonic()
│   ├── confirmar mnemonic
│   ├── definir PIN
│   └── salvar conta criptografada
├── ImportAccountPanel (linhas ~200-350)
│   ├── input mnemonic
│   ├── validar mnemonic
│   ├── definir PIN
│   └── salvar conta
└── AccountsList (linhas ~350-818)
    ├── conta ativa badge
    ├── editar label
    ├── trocar conta (PIN + SIWS)
    ├── exportar (revelar seed)
    └── remover conta
```

## Estrategia: Criar AccountsSettings.tsx

### Passo 1: Copiar o AccountsPage INTEIRO

```typescript
// apps/web/src/modules/wallet/components/AccountsSettings.tsx

// COPIAR TODOS OS IMPORTS do AccountsPage
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  RefreshCcw,
  Trash2,
  Upload,
  Check,
  Star,
} from 'lucide-react';
// ... todos os outros imports

interface AccountsSettingsProps {
  onClose?: () => void; // Para fechar modal apos operacoes
}

export function AccountsSettings({ onClose }: AccountsSettingsProps) {
  // COPIAR TODO O CORPO do AccountsPage
  // ...
}
```

### Passo 2: Ajustes Minimos

1. **Layout**: Remover `<Card>` externo (ja esta em modal)
2. **Header**: Remover titulo (ja esta no modal)
3. **onClose**: Fechar modal apos criar/importar conta

```typescript
// Apos criar conta com sucesso:
if (onClose) {
  setTimeout(() => {
    window.location.reload(); // Manter reload existente
  }, 300);
}
```

## Estrutura do AccountsSettings

```typescript
// apps/web/src/modules/wallet/components/AccountsSettings.tsx

export function AccountsSettings({ onClose }: AccountsSettingsProps) {
  const { t } = useTranslation();

  // === TODOS OS ESTADOS do AccountsPage ===
  const { active, accounts, loading, refresh } = useVaultAccounts();
  const { props: chainProps } = useChainProps();

  // Create account states
  const [showCreate, setShowCreate] = useState(false);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [createLabel, setCreateLabel] = useState('');
  const [createPin, setCreatePin] = useState('');
  const [createPinConfirm, setCreatePinConfirm] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Import account states
  const [showImport, setShowImport] = useState(false);
  const [importMnemonic, setImportMnemonic] = useState('');
  const [importLabel, setImportLabel] = useState('');
  const [importPin, setImportPin] = useState('');
  const [importPinConfirm, setImportPinConfirm] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Export states
  const [exportingAddress, setExportingAddress] = useState<string | null>(null);
  const [exportPin, setExportPin] = useState('');
  const [exportedMnemonic, setExportedMnemonic] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Activate states
  const [activatingAddress, setActivatingAddress] = useState<string | null>(null);
  const [activatePin, setActivatePin] = useState('');
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activateLoading, setActivateLoading] = useState(false);

  // Remove states
  const [removingAddress, setRemovingAddress] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState('');

  // Edit label states
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  // === TODOS OS HANDLERS do AccountsPage ===

  // generateMnemonic - COPIAR EXATO
  const generateMnemonic = useCallback(() => {
    // ... copiar do AccountsPage
  }, []);

  // handleCreateAccount - COPIAR EXATO
  const handleCreateAccount = async () => {
    // ... copiar INTEIRO do AccountsPage
  };

  // handleImportAccount - COPIAR EXATO
  const handleImportAccount = async () => {
    // ... copiar INTEIRO do AccountsPage
  };

  // handleExport - COPIAR EXATO
  const handleExport = async (address: string) => {
    // ... copiar INTEIRO do AccountsPage
  };

  // handleActivate - COPIAR EXATO
  const handleActivate = async (address: string) => {
    // ... copiar INTEIRO do AccountsPage
    // NAO MUDAR: reload necessario para SIWS
  };

  // handleRemove - COPIAR EXATO
  const handleRemove = async (address: string) => {
    // ... copiar INTEIRO do AccountsPage
  };

  // handleUpdateLabel - COPIAR EXATO
  const handleUpdateLabel = async (address: string) => {
    // ... copiar INTEIRO do AccountsPage
  };

  // === JSX ===
  return (
    <div className="space-y-6">
      {/* Conta Ativa */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          {t('wallet.accounts.activeAccount')}
        </p>
        <p className="font-medium">{active?.label || t('wallet.accounts.noLabel')}</p>
        <code className="text-xs text-muted-foreground break-all">
          {displayAddress(active?.address)}
        </code>
      </div>

      {/* Criar Conta - Panel Colapsavel */}
      <div className="border rounded-lg">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="font-medium">{t('wallet.accounts.createTitle')}</span>
          </div>
          {showCreate ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showCreate && (
          <div className="p-4 pt-0 space-y-4">
            {/* COPIAR JSX do CreateAccountPanel do AccountsPage */}
          </div>
        )}
      </div>

      {/* Importar Conta - Panel Colapsavel */}
      <div className="border rounded-lg">
        <button
          onClick={() => setShowImport(!showImport)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="font-medium">{t('wallet.accounts.importTitle')}</span>
          </div>
          {showImport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showImport && (
          <div className="p-4 pt-0 space-y-4">
            {/* COPIAR JSX do ImportAccountPanel do AccountsPage */}
          </div>
        )}
      </div>

      {/* Lista de Contas */}
      <div className="space-y-4">
        <h3 className="font-medium">{t('wallet.accounts.listTitle')}</h3>

        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('wallet.accounts.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {accounts.map((account) => (
              <li key={account.address} className="border rounded-lg p-4">
                {/* COPIAR JSX de cada item de conta do AccountsPage */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

## Funcionalidades Criticas - NAO ALTERAR

### 1. Geracao de Mnemonic
```typescript
// Usa @polkadot/util-crypto
import { mnemonicGenerate, mnemonicValidate } from '@polkadot/util-crypto';

const generateMnemonic = useCallback(() => {
  const words = mnemonicGenerate(12).split(' ');
  setMnemonic(words);
}, []);
```

### 2. Criptografia com PIN
```typescript
// vault.ts - NAO MODIFICAR
export async function encryptVault(mnemonic: string, pin: string): Promise<string> {
  // AES-GCM encryption
}

export async function decryptVault(encrypted: string, pin: string): Promise<string> {
  // AES-GCM decryption
}
```

### 3. SIWS Session
```typescript
// Apos ativar conta - NAO MODIFICAR
const handleActivate = async (address: string) => {
  // 1. Validar PIN
  // 2. Decriptar mnemonic
  // 3. Criar keypair
  // 4. Assinar SIWS message
  // 5. Chamar API para criar sessao
  // 6. Reload pagina
};
```

## Checklist de Validacao - CRITICO

### Criar Conta
- [ ] Gerar mnemonic de 12 palavras
- [ ] Mostrar mnemonic indexado
- [ ] Copiar mnemonic funciona
- [ ] Regenerar mnemonic funciona
- [ ] Step de confirmacao exige digitar mnemonic
- [ ] Validacao de mnemonic funciona
- [ ] Campo de label funciona
- [ ] PIN minimo 6 digitos
- [ ] Confirmacao de PIN funciona
- [ ] Erro se PINs diferentes
- [ ] Conta salva no vault
- [ ] Conta aparece na lista
- [ ] Mnemonic limpo da memoria apos salvar

### Importar Conta
- [ ] Campo de mnemonic funciona
- [ ] Validacao de mnemonic (12/24 palavras)
- [ ] Erro se mnemonic invalido
- [ ] Label funciona
- [ ] PIN funciona
- [ ] Conta importada aparece na lista
- [ ] Detecta conta duplicada

### Exportar Conta
- [ ] Solicita PIN
- [ ] Valida PIN corretamente
- [ ] Erro se PIN errado
- [ ] Mostra mnemonic se PIN correto
- [ ] Botao copiar funciona
- [ ] Botao fechar limpa mnemonic

### Trocar Conta Ativa
- [ ] Solicita PIN
- [ ] Valida PIN
- [ ] Cria SIWS session
- [ ] Reload da pagina funciona
- [ ] Nova conta fica ativa

### Remover Conta
- [ ] Exige confirmacao (digitar endereco)
- [ ] Nao permite remover se unica conta
- [ ] Remove do vault
- [ ] Atualiza lista

### Editar Label
- [ ] Click no label abre edicao
- [ ] Salvar atualiza vault
- [ ] Cancelar restaura valor

## Traducoes Necessarias

```json
{
  "wallet": {
    "accounts": {
      "activeAccount": "Conta Ativa",
      "noLabel": "Sem nome",
      "createTitle": "Criar Nova Conta",
      "importTitle": "Importar Conta",
      "listTitle": "Suas Contas",
      "empty": "Nenhuma conta cadastrada"
    }
  }
}
```

## Dependencias - NAO MODIFICAR

- `useVaultAccounts` hook
- `vault.ts` (encryptVault, decryptVault)
- `@polkadot/util-crypto` (mnemonicGenerate, mnemonicValidate)
- `@polkadot/keyring` (Keyring)
- API de SIWS session

## Ordem de Implementacao

1. Criar `AccountsSettings.tsx` copiando AccountsPage
2. Ajustar layout (remover Card externo)
3. Integrar no WalletSettingsModal
4. Testar TODAS as funcionalidades
5. Somente apos 100% funcionando: remover AccountsPage

## Nao Fazer

- NAO simplificar fluxo de criacao
- NAO remover confirmacao de mnemonic
- NAO mudar requisitos de PIN
- NAO alterar vault.ts
- NAO alterar fluxo de SIWS
- NAO remover reload apos trocar conta
