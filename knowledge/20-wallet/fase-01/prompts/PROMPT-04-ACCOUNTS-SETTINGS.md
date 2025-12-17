# PROMPT 04: Implementar AccountsSettings

## Contexto

Voce vai implementar o componente `AccountsSettings.tsx`, extraindo toda a logica do `AccountsPage.tsx` existente.

## ATENCAO MAXIMA - CODIGO CRITICO

O AccountsPage contem logica de SEGURANCA:
- Geracao de mnemonic
- Criptografia AES-GCM
- Validacao de PIN
- SIWS session

**COPIAR CODIGO EXATAMENTE - NAO MODIFICAR LOGICA**

## Arquivos de Referencia

LER PRIMEIRO E COM ATENCAO:
- `apps/web/src/modules/wallet/pages/AccountsPage.tsx` - Fonte COMPLETA
- `apps/web/src/modules/wallet/hooks/useVaultAccounts.ts` - Hook de contas
- `apps/web/src/modules/wallet/vault.ts` - Criptografia (se existir)

## Tarefa

### Passo 1: Copiar AccountsPage INTEIRO para AccountsSettings

O arquivo tem ~818 linhas. Copiar TODO o conteudo.

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
  AlertTriangle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVaultAccounts } from '../hooks/useVaultAccounts';
import { useChainProps } from '../hooks/useChainProps';
import { normaliseAddress, shortenAddress } from '../utils/format';
// ... TODOS os outros imports do AccountsPage

interface AccountsSettingsProps {
  onClose?: () => void;
}

export function AccountsSettings({ onClose }: AccountsSettingsProps) {
  const { t } = useTranslation();

  // =====================================================
  // COPIAR TODOS OS HOOKS E ESTADOS do AccountsPage
  // =====================================================

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

  // Copied state
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);

  // =====================================================
  // COPIAR displayAddress MEMO
  // =====================================================
  const displayAddress = useCallback(
    (address: string | undefined) => {
      // COPIAR EXATO do AccountsPage
    },
    [chainProps]
  );

  // =====================================================
  // COPIAR TODOS OS HANDLERS - NAO MODIFICAR
  // =====================================================

  // generateMnemonic - COPIAR EXATO
  const generateMnemonic = useCallback(() => {
    // COPIAR INTEIRO - usa mnemonicGenerate do @polkadot/util-crypto
  }, []);

  // handleCopyMnemonic - COPIAR EXATO
  const handleCopyMnemonic = useCallback(() => {
    // COPIAR INTEIRO
  }, [mnemonic]);

  // handleCreateAccount - COPIAR EXATO
  const handleCreateAccount = async () => {
    // COPIAR INTEIRO - logica critica de criptografia
  };

  // handleImportAccount - COPIAR EXATO
  const handleImportAccount = async () => {
    // COPIAR INTEIRO - logica critica de validacao e criptografia
  };

  // handleExport - COPIAR EXATO
  const handleExport = async (address: string) => {
    // COPIAR INTEIRO - logica critica de decriptografia
  };

  // handleActivate - COPIAR EXATO
  const handleActivate = async (address: string) => {
    // COPIAR INTEIRO - logica critica de SIWS
    // MANTER o window.location.reload()
  };

  // handleRemove - COPIAR EXATO
  const handleRemove = async (address: string) => {
    // COPIAR INTEIRO
  };

  // handleUpdateLabel - COPIAR EXATO
  const handleUpdateLabel = async (address: string) => {
    // COPIAR INTEIRO
  };

  // handleCopyAddress - COPIAR EXATO
  const handleCopyAddress = useCallback((address: string) => {
    // COPIAR INTEIRO
  }, []);

  // resetCreateForm - COPIAR EXATO
  const resetCreateForm = useCallback(() => {
    // COPIAR INTEIRO
  }, []);

  // resetImportForm - COPIAR EXATO
  const resetImportForm = useCallback(() => {
    // COPIAR INTEIRO
  }, []);

  // =====================================================
  // JSX - ADAPTAR LAYOUT (remover Card externo)
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Conta Ativa */}
      {active && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-xs text-primary uppercase tracking-wide font-medium">
              {t('wallet.accounts.activeAccount', { defaultValue: 'Conta Ativa' })}
            </span>
          </div>
          <p className="font-medium">{active.label || t('wallet.accounts.noLabel', { defaultValue: 'Sem nome' })}</p>
          <code className="text-xs text-muted-foreground break-all">
            {displayAddress(active.address)}
          </code>
        </div>
      )}

      {/* Criar Conta - Panel Colapsavel */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => {
            setShowCreate(!showCreate);
            if (!showCreate && mnemonic.length === 0) {
              generateMnemonic();
            }
          }}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="font-medium">
              {t('wallet.accounts.createTitle', { defaultValue: 'Criar Nova Conta' })}
            </span>
          </div>
          {showCreate ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showCreate && (
          <div className="p-4 pt-0 border-t space-y-4">
            {/* COPIAR JSX do CreateAccountPanel do AccountsPage */}
            {/* Incluir: mnemonic display, confirmacao, PIN, botoes */}
          </div>
        )}
      </div>

      {/* Importar Conta - Panel Colapsavel */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setShowImport(!showImport)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="font-medium">
              {t('wallet.accounts.importTitle', { defaultValue: 'Importar Conta' })}
            </span>
          </div>
          {showImport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showImport && (
          <div className="p-4 pt-0 border-t space-y-4">
            {/* COPIAR JSX do ImportAccountPanel do AccountsPage */}
            {/* Incluir: textarea mnemonic, PIN, botoes */}
          </div>
        )}
      </div>

      {/* Lista de Contas */}
      <div className="space-y-4">
        <h3 className="font-medium">
          {t('wallet.accounts.listTitle', { defaultValue: 'Suas Contas' })}
          <span className="text-xs text-muted-foreground ml-2">({accounts.length})</span>
        </h3>

        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('wallet.accounts.empty', { defaultValue: 'Nenhuma conta cadastrada' })}
          </p>
        ) : (
          <ul className="space-y-3">
            {accounts.map((account) => (
              <li
                key={account.address}
                className="border rounded-lg p-4 space-y-3"
              >
                {/* COPIAR JSX de cada item de conta do AccountsPage */}
                {/* Incluir: label, endereco, badges, acoes */}

                {/* Header da conta */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Label editavel */}
                    {editingAddress === account.address ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="h-8 text-sm"
                          placeholder={t('wallet.accounts.labelPlaceholder', { defaultValue: 'Nome da conta' })}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateLabel(account.address)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingAddress(account.address);
                          setEditLabel(account.label || '');
                        }}
                        className="text-left"
                      >
                        <p className="font-medium">
                          {account.label || t('wallet.accounts.noLabel', { defaultValue: 'Sem nome' })}
                        </p>
                      </button>
                    )}

                    {/* Endereco */}
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-muted-foreground">
                        {displayAddress(account.address)}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleCopyAddress(account.address)}
                      >
                        {copiedAddress === account.address ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Badge ativa */}
                  {active?.address === account.address && (
                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                      Ativa
                    </span>
                  )}
                </div>

                {/* Acoes */}
                <div className="flex flex-wrap gap-2">
                  {/* Ativar (se nao eh a ativa) */}
                  {active?.address !== account.address && (
                    <>
                      {activatingAddress === account.address ? (
                        <div className="flex items-center gap-2 w-full">
                          <Input
                            type="password"
                            inputMode="numeric"
                            value={activatePin}
                            onChange={(e) => setActivatePin(e.target.value)}
                            placeholder="PIN"
                            className="h-8 w-24"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleActivate(account.address)}
                            disabled={activateLoading}
                          >
                            {activateLoading ? '...' : 'Confirmar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setActivatingAddress(null);
                              setActivatePin('');
                              setActivateError(null);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActivatingAddress(account.address)}
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Ativar
                        </Button>
                      )}
                      {activateError && activatingAddress === account.address && (
                        <p className="text-xs text-destructive w-full">{activateError}</p>
                      )}
                    </>
                  )}

                  {/* Exportar */}
                  {exportingAddress === account.address ? (
                    exportedMnemonic ? (
                      <div className="w-full space-y-2">
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {t('wallet.accounts.seedWarning', {
                              defaultValue: 'Guarde esta frase em local seguro!',
                            })}
                          </AlertDescription>
                        </Alert>
                        <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
                          {exportedMnemonic}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(exportedMnemonic);
                              setCopiedMnemonic(true);
                              setTimeout(() => setCopiedMnemonic(false), 2000);
                            }}
                          >
                            {copiedMnemonic ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            Copiar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setExportingAddress(null);
                              setExportedMnemonic(null);
                              setExportPin('');
                            }}
                          >
                            Fechar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full">
                        <Input
                          type="password"
                          inputMode="numeric"
                          value={exportPin}
                          onChange={(e) => setExportPin(e.target.value)}
                          placeholder="PIN"
                          className="h-8 w-24"
                        />
                        <Button size="sm" onClick={() => handleExport(account.address)}>
                          Revelar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setExportingAddress(null);
                            setExportPin('');
                            setExportError(null);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExportingAddress(account.address)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Exportar
                    </Button>
                  )}
                  {exportError && exportingAddress === account.address && (
                    <p className="text-xs text-destructive w-full">{exportError}</p>
                  )}

                  {/* Remover (se nao eh a unica) */}
                  {accounts.length > 1 && (
                    <>
                      {removingAddress === account.address ? (
                        <div className="flex items-center gap-2 w-full">
                          <Input
                            value={removeConfirm}
                            onChange={(e) => setRemoveConfirm(e.target.value)}
                            placeholder={t('wallet.accounts.confirmAddress', {
                              defaultValue: 'Digite o endereco para confirmar',
                            })}
                            className="h-8 flex-1 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemove(account.address)}
                            disabled={removeConfirm !== account.address}
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRemovingAddress(null);
                              setRemoveConfirm('');
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRemovingAddress(account.address)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remover
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

## Checklist de Validacao - CRITICO

### Criar Conta
- [ ] Gerar mnemonic de 12 palavras funciona
- [ ] Mnemonic mostra indexado (1. word, 2. word, ...)
- [ ] Copiar mnemonic funciona
- [ ] Regenerar mnemonic funciona
- [ ] Step de confirmacao exige digitar mnemonic
- [ ] Erro se mnemonic incorreto na confirmacao
- [ ] Campo de label funciona
- [ ] PIN minimo 6 digitos validado
- [ ] Confirmacao de PIN funciona
- [ ] Erro se PINs diferentes
- [ ] Conta salva corretamente
- [ ] Conta aparece na lista
- [ ] Mnemonic limpo da memoria apos salvar

### Importar Conta
- [ ] Campo de mnemonic funciona
- [ ] Aceita 12 e 24 palavras
- [ ] Erro se mnemonic invalido
- [ ] Label funciona
- [ ] PIN funciona
- [ ] Conta importada aparece na lista
- [ ] Detecta conta duplicada

### Exportar Conta
- [ ] Clique em Exportar pede PIN
- [ ] PIN incorreto mostra erro
- [ ] PIN correto revela mnemonic
- [ ] Botao copiar funciona
- [ ] Botao fechar limpa mnemonic da tela

### Trocar Conta Ativa
- [ ] Clique em Ativar pede PIN
- [ ] PIN validado corretamente
- [ ] Sessao SIWS criada
- [ ] Pagina recarrega
- [ ] Nova conta fica ativa

### Remover Conta
- [ ] Nao mostra para conta unica
- [ ] Exige digitar endereco completo
- [ ] Remove do vault
- [ ] Atualiza lista

### Editar Label
- [ ] Click no label abre edicao
- [ ] Salvar atualiza vault
- [ ] ESC ou click fora cancela

## NAO FAZER

- NAO simplificar nenhum fluxo
- NAO remover validacoes
- NAO alterar criptografia
- NAO alterar SIWS
- NAO remover reload
- NAO modificar vault.ts ou hooks
