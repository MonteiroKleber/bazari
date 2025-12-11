# PROMPT 08 - Editor de Smart Contracts (ink!)

## Contexto

O Bazari Studio precisa suportar desenvolvimento de smart contracts ink! para a bazari-chain.

## Pre-requisito

PROMPT-01 a PROMPT-07 devem estar implementados.

## Especificacao

Leia a especificacao completa em:
- `knowledge/40-bazari-os/fase-3/09-SMART-CONTRACTS.md`

## Tarefa

### 1. Criar Arquivos

```
apps/web/src/apps/studio/
├── components/
│   └── contracts/
│       ├── ContractEditor.tsx      // Editor especializado
│       ├── ContractExplorer.tsx    // Arvore de arquivos Rust
│       ├── ContractCompiler.tsx    // Painel de compilacao
│       └── ContractDeployer.tsx    // Deploy na chain
├── services/
│   └── contract.service.ts         // Compilacao e deploy
├── data/
│   └── templates/
│       └── contracts/
│           ├── basic.ts            // Template basico
│           ├── loyalty.ts          // Programa de fidelidade
│           └── escrow.ts           // Escrow
└── types/
    └── contract.types.ts           // Tipos
```

### 2. contract.types.ts

```typescript
interface ContractProject {
  id: string;
  name: string;
  description: string;
  template: 'basic' | 'loyalty' | 'escrow' | 'custom';
  files: ContractFile[];
  compiled?: CompiledContract;
  deployed?: DeployedContract;
}

interface ContractFile {
  path: string;
  content: string;
}

interface CompiledContract {
  wasm: Uint8Array;
  metadata: ContractMetadata;
  hash: string;
  timestamp: Date;
}

interface DeployedContract {
  address: string;
  codeHash: string;
  deployedAt: Date;
  deployedBy: string;
  txHash: string;
}
```

### 3. contract.service.ts

```typescript
class ContractService {
  /**
   * Compila contrato ink!
   * Envia codigo para API backend que tem Rust instalado
   */
  async compile(project: ContractProject): Promise<CompiledContract> {
    const response = await fetch(`${API_URL}/contracts/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: project.name,
        source: project.files.find(f => f.path === 'lib.rs')?.content,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const { wasm, metadata, hash } = await response.json();
    return { wasm: new Uint8Array(wasm), metadata, hash, timestamp: new Date() };
  }

  /**
   * Deploy contrato na bazari-chain
   */
  async deploy(
    compiled: CompiledContract,
    constructorArgs: unknown[],
    options: { gasLimit: bigint }
  ): Promise<DeployedContract> {
    const { ApiPromise, WsProvider } = await import('@polkadot/api');
    const { CodePromise } = await import('@polkadot/api-contract');

    const wsProvider = new WsProvider('wss://bazari.libervia.xyz/ws');
    const api = await ApiPromise.create({ provider: wsProvider });

    const code = new CodePromise(api, compiled.metadata, compiled.wasm);
    const signer = await this.getSigner();

    const tx = code.tx.new(
      { gasLimit: options.gasLimit },
      ...constructorArgs
    );

    return new Promise((resolve, reject) => {
      tx.signAndSend(signer, ({ contract, status }) => {
        if (status.isFinalized) {
          resolve({
            address: contract.address.toString(),
            codeHash: compiled.hash,
            deployedAt: new Date(),
            deployedBy: signer.address,
            txHash: status.asFinalized.toString(),
          });
        }
      }).catch(reject);
    });
  }
}
```

### 4. Templates de Contratos

#### basic.ts

```typescript
export const BASIC_CONTRACT_TEMPLATE = {
  id: 'basic',
  name: 'Basic Contract',
  description: 'Contrato basico com storage e eventos',
  files: [
    {
      path: 'lib.rs',
      content: `#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod {{slug}} {
    #[ink(storage)]
    pub struct {{name}} {
        owner: AccountId,
        value: u32,
    }

    #[ink(event)]
    pub struct ValueChanged {
        #[ink(topic)]
        from: AccountId,
        old_value: u32,
        new_value: u32,
    }

    impl {{name}} {
        #[ink(constructor)]
        pub fn new(init_value: u32) -> Self {
            Self {
                owner: Self::env().caller(),
                value: init_value,
            }
        }

        #[ink(message)]
        pub fn get(&self) -> u32 {
            self.value
        }

        #[ink(message)]
        pub fn set(&mut self, new_value: u32) {
            let caller = self.env().caller();
            let old_value = self.value;
            self.value = new_value;
            self.env().emit_event(ValueChanged {
                from: caller,
                old_value,
                new_value,
            });
        }
    }
}`,
    },
    {
      path: 'Cargo.toml',
      content: `[package]
name = "{{slug}}"
version = "0.1.0"
edition = "2021"

[dependencies]
ink = { version = "5.0", default-features = false }

[features]
default = ["std"]
std = ["ink/std"]
ink-as-dependency = []`,
    },
  ],
};
```

#### loyalty.ts e escrow.ts

Criar templates similares baseados na especificacao em `09-SMART-CONTRACTS.md`.

### 5. ContractEditor.tsx

```typescript
export function ContractEditor({
  project,
  onSave,
}: {
  project: ContractProject;
  onSave: (files: ContractFile[]) => void;
}) {
  const [activeFile, setActiveFile] = useState(project.files[0]);

  return (
    <div className="flex h-full">
      {/* File explorer */}
      <div className="w-48 border-r">
        <ContractExplorer
          files={project.files}
          activeFile={activeFile.path}
          onSelect={(path) => setActiveFile(project.files.find(f => f.path === path)!)}
        />
      </div>

      {/* Editor Rust */}
      <div className="flex-1">
        <CodeEditor
          value={activeFile.content}
          language="rust"
          path={activeFile.path}
          onChange={(content) => {
            const newFiles = project.files.map(f =>
              f.path === activeFile.path ? { ...f, content } : f
            );
            onSave(newFiles);
          }}
        />
      </div>
    </div>
  );
}
```

### 6. ContractCompiler.tsx

```typescript
export function ContractCompiler({
  project,
  onCompiled,
}: {
  project: ContractProject;
  onCompiled: (compiled: CompiledContract) => void;
}) {
  const [isCompiling, setIsCompiling] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCompile = async () => {
    setIsCompiling(true);
    setOutput('Compilando...\n');
    setError(null);

    try {
      const compiled = await contractService.compile(project);
      setOutput(prev => prev + `✅ Compilacao concluida!\nHash: ${compiled.hash}\n`);
      onCompiled(compiled);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3>Compilacao</h3>
        <Button onClick={handleCompile} disabled={isCompiling}>
          {isCompiling ? <Loader2 className="animate-spin" /> : <Hammer />}
          Compilar
        </Button>
      </div>

      <div className="bg-black text-green-400 font-mono text-sm p-4 rounded h-64 overflow-auto">
        <pre>{output}</pre>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
    </div>
  );
}
```

### 7. ContractDeployer.tsx

```typescript
export function ContractDeployer({
  compiled,
  onDeployed,
}: {
  compiled: CompiledContract;
  onDeployed: (deployed: DeployedContract) => void;
}) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [constructorArgs, setConstructorArgs] = useState({});

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const deployed = await contractService.deploy(compiled, Object.values(constructorArgs), {
        gasLimit: BigInt(100_000_000_000),
      });
      onDeployed(deployed);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3>Deploy na Bazari Chain</h3>

      {/* Constructor args baseados no metadata */}
      {compiled.metadata.spec.constructors[0]?.args.map((arg) => (
        <div key={arg.name}>
          <Label>{arg.name}</Label>
          <Input
            placeholder={arg.type.displayName}
            value={constructorArgs[arg.name] || ''}
            onChange={(e) => setConstructorArgs(prev => ({ ...prev, [arg.name]: e.target.value }))}
          />
        </div>
      ))}

      <Button onClick={handleDeploy} disabled={isDeploying} className="w-full">
        {isDeploying ? <Loader2 className="animate-spin" /> : <Rocket />}
        Deploy
      </Button>
    </div>
  );
}
```

### 8. API Backend para Compilacao

Criar endpoint no backend (se nao existir):

```typescript
// apps/api/src/routes/contracts.ts

router.post('/contracts/compile', async (req, res) => {
  const { name, source } = req.body;

  // 1. Criar diretorio temporario
  // 2. Escrever arquivos (lib.rs, Cargo.toml)
  // 3. Executar: cargo contract build
  // 4. Ler .contract e .wasm
  // 5. Retornar wasm e metadata

  // Requer Rust, cargo-contract instalados no servidor
});
```

### 9. Integrar no Studio

- Adicionar opcao "Smart Contract" no NewProjectWizard
- Quando projeto e de contrato, mostrar ContractEditor em vez de editor normal
- Toolbar mostra "Compilar" e "Deploy" em vez de "Build" e "Publish"

## Criterios de Aceite

1. [ ] Editor Rust funciona com syntax highlighting
2. [ ] Templates de contrato carregam corretamente
3. [ ] API de compilacao funciona
4. [ ] Deploy na chain funciona
5. [ ] Contratos deployados aparecem na lista
6. [ ] Build do projeto nao quebra

## Limitacoes

1. Compilacao requer backend com Rust instalado
2. Deploy requer conexao com a chain
3. Testes de contrato nao suportados inicialmente

## Alternativas

Se compilacao no backend for complexa:
1. Usar ink! Playground API
2. Permitir upload de .wasm pre-compilado
3. Apenas editor sem compilacao (usuario compila localmente)

## Dependencias Backend

```bash
# No servidor
rustup update
cargo install cargo-contract
```

## Notas

- ink! v5 requer Rust nightly em alguns casos
- Verificar versao do cargo-contract compativel
- Considerar cache de compilacao
