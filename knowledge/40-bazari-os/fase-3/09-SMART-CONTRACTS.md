# 09 - Editor de Smart Contracts (ink!) - Compilacao Local

## Objetivo

Adicionar suporte para desenvolvimento de smart contracts ink!:
- Template de contrato
- Editor com syntax highlighting Rust
- **Compilacao LOCAL** (via CLI Server que executa `cargo contract build`)
- Deploy na bazari-chain

## Arquitetura Local

```
┌─────────────────────────────────────────────────────────────────┐
│                         STUDIO UI (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ ContractEditor│  │ContractCompiler│ │ ContractDeployer   │  │
│  │ (Monaco/Rust) │  │ (Build Panel)  │ │ (Deploy to Chain)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                     │              │
└─────────┼──────────────────┼─────────────────────┼──────────────┘
          │ save             │ compile             │ deploy
          ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLI SERVER (localhost:4444)                   │
│                                                                  │
│  POST /contracts/files    - Salvar arquivos .rs                 │
│  POST /contracts/compile  - Executa cargo contract build        │
│  GET  /contracts/artifact - Retorna .wasm e metadata.json       │
│  WS   /contracts/compile  - Stream de output da compilacao      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
          │
          │ executa localmente
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA LOCAL DO DESENVOLVEDOR               │
│                                                                  │
│  $ cargo contract build                                         │
│  │                                                              │
│  ├── Compila Rust → WASM                                       │
│  ├── Gera metadata.json                                        │
│  └── Gera .contract (bundle)                                   │
│                                                                  │
│  Requisitos: rustup, cargo-contract                             │
└─────────────────────────────────────────────────────────────────┘
```

## Pre-requisitos Locais

O desenvolvedor precisa ter instalado:

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup component add rust-src

# cargo-contract (compilador ink!)
cargo install cargo-contract --force

# Verificar instalacao
cargo contract --version
```

## ink! Overview

ink! e a linguagem de smart contracts para Substrate/Polkadot, baseada em Rust:

```rust
#![cfg_attr(not(feature = "std"), no_std)]

#[ink::contract]
mod my_contract {
    #[ink(storage)]
    pub struct MyContract {
        value: u32,
    }

    impl MyContract {
        #[ink(constructor)]
        pub fn new(init_value: u32) -> Self {
            Self { value: init_value }
        }

        #[ink(message)]
        pub fn get(&self) -> u32 {
            self.value
        }

        #[ink(message)]
        pub fn set(&mut self, new_value: u32) {
            self.value = new_value;
        }
    }
}
```

## Arquivos a Criar

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
│           ├── basic.rs            // Template basico
│           ├── erc20.rs            // Token ERC20
│           ├── loyalty.rs          // Programa de fidelidade
│           └── escrow.rs           // Escrow
└── types/
    └── contract.types.ts           // Tipos
```

## Templates de Contratos

### 1. Basic Contract

```rust
// templates/contracts/basic.rs

#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod {{slug}} {
    use ink::storage::Mapping;

    /// {{description}}
    #[ink(storage)]
    pub struct {{name}} {
        /// Owner of the contract
        owner: AccountId,
        /// Contract value
        value: u32,
    }

    /// Events
    #[ink(event)]
    pub struct ValueChanged {
        #[ink(topic)]
        from: AccountId,
        old_value: u32,
        new_value: u32,
    }

    /// Errors
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotOwner,
        InvalidValue,
    }

    impl {{name}} {
        /// Constructor
        #[ink(constructor)]
        pub fn new(init_value: u32) -> Self {
            Self {
                owner: Self::env().caller(),
                value: init_value,
            }
        }

        /// Get current value
        #[ink(message)]
        pub fn get(&self) -> u32 {
            self.value
        }

        /// Set new value (only owner)
        #[ink(message)]
        pub fn set(&mut self, new_value: u32) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.owner {
                return Err(Error::NotOwner);
            }

            let old_value = self.value;
            self.value = new_value;

            self.env().emit_event(ValueChanged {
                from: caller,
                old_value,
                new_value,
            });

            Ok(())
        }

        /// Get owner
        #[ink(message)]
        pub fn owner(&self) -> AccountId {
            self.owner
        }
    }
}
```

### 2. Loyalty Points Contract

```rust
// templates/contracts/loyalty.rs

#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod loyalty {
    use ink::storage::Mapping;

    #[ink(storage)]
    pub struct LoyaltyProgram {
        /// Program owner (merchant)
        owner: AccountId,
        /// Points balance per account
        balances: Mapping<AccountId, Balance>,
        /// Total points issued
        total_supply: Balance,
        /// Points name
        name: String,
        /// Points per unit spent (e.g., 10 = 10 points per 1 token)
        points_per_token: u32,
    }

    #[ink(event)]
    pub struct PointsIssued {
        #[ink(topic)]
        to: AccountId,
        amount: Balance,
    }

    #[ink(event)]
    pub struct PointsRedeemed {
        #[ink(topic)]
        from: AccountId,
        amount: Balance,
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotOwner,
        InsufficientBalance,
        Overflow,
    }

    impl LoyaltyProgram {
        #[ink(constructor)]
        pub fn new(name: String, points_per_token: u32) -> Self {
            Self {
                owner: Self::env().caller(),
                balances: Mapping::default(),
                total_supply: 0,
                name,
                points_per_token,
            }
        }

        /// Issue points to a customer
        #[ink(message)]
        pub fn issue_points(&mut self, to: AccountId, amount: Balance) -> Result<(), Error> {
            if self.env().caller() != self.owner {
                return Err(Error::NotOwner);
            }

            let balance = self.balances.get(&to).unwrap_or(0);
            let new_balance = balance.checked_add(amount).ok_or(Error::Overflow)?;

            self.balances.insert(to, &new_balance);
            self.total_supply = self.total_supply.checked_add(amount).ok_or(Error::Overflow)?;

            self.env().emit_event(PointsIssued { to, amount });
            Ok(())
        }

        /// Redeem points
        #[ink(message)]
        pub fn redeem_points(&mut self, amount: Balance) -> Result<(), Error> {
            let caller = self.env().caller();
            let balance = self.balances.get(&caller).unwrap_or(0);

            if balance < amount {
                return Err(Error::InsufficientBalance);
            }

            self.balances.insert(caller, &(balance - amount));
            self.total_supply -= amount;

            self.env().emit_event(PointsRedeemed { from: caller, amount });
            Ok(())
        }

        /// Get balance of an account
        #[ink(message)]
        pub fn balance_of(&self, account: AccountId) -> Balance {
            self.balances.get(&account).unwrap_or(0)
        }

        /// Get total supply
        #[ink(message)]
        pub fn total_supply(&self) -> Balance {
            self.total_supply
        }

        /// Get program name
        #[ink(message)]
        pub fn name(&self) -> String {
            self.name.clone()
        }
    }
}
```

### 3. Escrow Contract

```rust
// templates/contracts/escrow.rs

#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod escrow {
    #[ink(storage)]
    pub struct Escrow {
        /// Buyer
        buyer: AccountId,
        /// Seller
        seller: AccountId,
        /// Arbiter (for disputes)
        arbiter: AccountId,
        /// Amount held
        amount: Balance,
        /// Status
        status: EscrowStatus,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum EscrowStatus {
        Created,
        Funded,
        Released,
        Refunded,
        Disputed,
    }

    #[ink(event)]
    pub struct EscrowFunded {
        amount: Balance,
    }

    #[ink(event)]
    pub struct EscrowReleased {
        to: AccountId,
        amount: Balance,
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotBuyer,
        NotSeller,
        NotArbiter,
        InvalidStatus,
        TransferFailed,
    }

    impl Escrow {
        #[ink(constructor)]
        pub fn new(seller: AccountId, arbiter: AccountId) -> Self {
            Self {
                buyer: Self::env().caller(),
                seller,
                arbiter,
                amount: 0,
                status: EscrowStatus::Created,
            }
        }

        /// Fund the escrow
        #[ink(message, payable)]
        pub fn fund(&mut self) -> Result<(), Error> {
            if self.env().caller() != self.buyer {
                return Err(Error::NotBuyer);
            }
            if self.status != EscrowStatus::Created {
                return Err(Error::InvalidStatus);
            }

            self.amount = self.env().transferred_value();
            self.status = EscrowStatus::Funded;

            self.env().emit_event(EscrowFunded { amount: self.amount });
            Ok(())
        }

        /// Release funds to seller (buyer confirms)
        #[ink(message)]
        pub fn release(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.buyer && caller != self.arbiter {
                return Err(Error::NotBuyer);
            }
            if self.status != EscrowStatus::Funded {
                return Err(Error::InvalidStatus);
            }

            let amount = self.amount;
            self.amount = 0;
            self.status = EscrowStatus::Released;

            self.env().transfer(self.seller, amount)
                .map_err(|_| Error::TransferFailed)?;

            self.env().emit_event(EscrowReleased { to: self.seller, amount });
            Ok(())
        }

        /// Refund to buyer (seller or arbiter)
        #[ink(message)]
        pub fn refund(&mut self) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.seller && caller != self.arbiter {
                return Err(Error::NotSeller);
            }
            if self.status != EscrowStatus::Funded {
                return Err(Error::InvalidStatus);
            }

            let amount = self.amount;
            self.amount = 0;
            self.status = EscrowStatus::Refunded;

            self.env().transfer(self.buyer, amount)
                .map_err(|_| Error::TransferFailed)?;

            self.env().emit_event(EscrowReleased { to: self.buyer, amount });
            Ok(())
        }

        /// Get status
        #[ink(message)]
        pub fn status(&self) -> EscrowStatus {
            self.status.clone()
        }

        /// Get amount
        #[ink(message)]
        pub fn amount(&self) -> Balance {
            self.amount
        }
    }
}
```

## Especificacao dos Componentes

### contract.types.ts

```typescript
interface ContractProject {
  id: string;
  name: string;
  description: string;
  template: 'basic' | 'loyalty' | 'escrow' | 'erc20' | 'custom';
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

interface ContractMetadata {
  source: {
    hash: string;
    language: string;
    compiler: string;
  };
  contract: {
    name: string;
    version: string;
  };
  spec: {
    constructors: ConstructorSpec[];
    messages: MessageSpec[];
    events: EventSpec[];
  };
}

interface DeployedContract {
  address: string;
  codeHash: string;
  deployedAt: Date;
  deployedBy: string;
  txHash: string;
}
```

### contract.service.ts (Compilacao Local)

```typescript
const LOCAL_SERVER = 'http://localhost:4444';

class ContractService {
  /**
   * Compila contrato ink! LOCALMENTE
   * Executa cargo contract build no sistema local via CLI Server
   */
  async compile(projectPath: string): Promise<CompiledContract> {
    // Chamar CLI Server local para compilar
    const response = await fetch(`${LOCAL_SERVER}/contracts/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Compilation failed');
    }

    const { wasm, metadata, hash, output } = await response.json();

    return {
      wasm: new Uint8Array(wasm),
      metadata,
      hash,
      timestamp: new Date(),
      buildOutput: output,
    };
  }

  /**
   * Compilacao com streaming de output (WebSocket)
   */
  compileWithStream(projectPath: string): {
    output$: Observable<string>;
    result$: Promise<CompiledContract>;
  } {
    const ws = new WebSocket(`ws://localhost:4444/contracts/compile`);
    const outputSubject = new Subject<string>();

    ws.onopen = () => {
      ws.send(JSON.stringify({ projectPath }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'output') {
        outputSubject.next(data.line);
      }
    };

    const result$ = new Promise<CompiledContract>((resolve, reject) => {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'output') {
          outputSubject.next(data.line);
        } else if (data.type === 'complete') {
          outputSubject.complete();
          resolve(data.result);
        } else if (data.type === 'error') {
          outputSubject.error(data.error);
          reject(new Error(data.error));
        }
      };
    });

    return { output$: outputSubject.asObservable(), result$ };
  }

  /**
   * Deploy contrato na bazari-chain
   */
  async deploy(
    compiled: CompiledContract,
    constructorArgs: unknown[],
    options: {
      gasLimit: bigint;
      storageDepositLimit?: bigint;
      salt?: Uint8Array;
    }
  ): Promise<DeployedContract> {
    // Usar polkadot.js para deploy
    const { ApiPromise, WsProvider } = await import('@polkadot/api');
    const { ContractPromise, CodePromise } = await import('@polkadot/api-contract');

    const wsProvider = new WsProvider('wss://bazari.libervia.xyz/ws');
    const api = await ApiPromise.create({ provider: wsProvider });

    // Criar instancia do codigo
    const code = new CodePromise(api, compiled.metadata, compiled.wasm);

    // Pegar signer do usuario logado
    const signer = await this.getSigner();

    // Instanciar contrato
    const tx = code.tx.new(
      { gasLimit: options.gasLimit, storageDepositLimit: options.storageDepositLimit },
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

  /**
   * Chamar metodo do contrato
   */
  async call(
    address: string,
    metadata: ContractMetadata,
    method: string,
    args: unknown[]
  ): Promise<unknown> {
    const { ApiPromise, WsProvider } = await import('@polkadot/api');
    const { ContractPromise } = await import('@polkadot/api-contract');

    const wsProvider = new WsProvider('wss://bazari.libervia.xyz/ws');
    const api = await ApiPromise.create({ provider: wsProvider });

    const contract = new ContractPromise(api, metadata, address);
    const signer = await this.getSigner();

    const { result, output } = await contract.query[method](
      signer.address,
      { gasLimit: -1 },
      ...args
    );

    if (result.isOk) {
      return output?.toHuman();
    }

    throw new Error(result.asErr.toString());
  }
}
```

### ContractEditor.tsx

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
          onSelect={(path) => {
            const file = project.files.find(f => f.path === path);
            if (file) setActiveFile(file);
          }}
        />
      </div>

      {/* Editor */}
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

### ContractCompiler.tsx

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
  const contractService = useRef(new ContractService());

  const handleCompile = async () => {
    setIsCompiling(true);
    setOutput('Compilando...\n');
    setError(null);

    try {
      const compiled = await contractService.current.compile(project);
      setOutput(prev => prev + '✅ Compilacao concluida!\n');
      setOutput(prev => prev + `Hash: ${compiled.hash}\n`);
      setOutput(prev => prev + `WASM size: ${compiled.wasm.length} bytes\n`);
      onCompiled(compiled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compilation failed');
      setOutput(prev => prev + `❌ Erro: ${err}\n`);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Compilacao</h3>
        <Button onClick={handleCompile} disabled={isCompiling}>
          {isCompiling ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Hammer className="w-4 h-4 mr-2" />
          )}
          Compilar
        </Button>
      </div>

      {/* Output */}
      <div className="bg-black text-green-400 font-mono text-sm p-4 rounded h-64 overflow-auto">
        <pre>{output}</pre>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

### ContractDeployer.tsx

```typescript
export function ContractDeployer({
  compiled,
  onDeployed,
}: {
  compiled: CompiledContract;
  onDeployed: (deployed: DeployedContract) => void;
}) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [constructorArgs, setConstructorArgs] = useState<Record<string, string>>({});

  // Extrair construtores do metadata
  const constructors = compiled.metadata.spec.constructors;

  const handleDeploy = async () => {
    setIsDeploying(true);

    try {
      const args = Object.values(constructorArgs);
      const deployed = await contractService.deploy(compiled, args, {
        gasLimit: BigInt(100_000_000_000),
      });
      onDeployed(deployed);
    } catch (err) {
      // Handle error
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-medium">Deploy na Bazari Chain</h3>

      {/* Constructor args */}
      {constructors[0]?.args.map((arg) => (
        <div key={arg.name}>
          <Label>{arg.name}</Label>
          <Input
            type="text"
            placeholder={arg.type.displayName}
            value={constructorArgs[arg.name] || ''}
            onChange={(e) =>
              setConstructorArgs(prev => ({ ...prev, [arg.name]: e.target.value }))
            }
          />
        </div>
      ))}

      <Button onClick={handleDeploy} disabled={isDeploying} className="w-full">
        {isDeploying ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Rocket className="w-4 h-4 mr-2" />
        )}
        Deploy
      </Button>
    </div>
  );
}
```

## CLI Server - Rotas de Contratos

O CLI Server precisa implementar estas rotas para suportar smart contracts:

### contract.routes.ts

```typescript
// packages/bazari-cli/src/server/routes/contract.routes.ts

import { Router } from 'express';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();

/**
 * POST /contracts/new - Criar novo projeto de contrato
 */
router.post('/contracts/new', async (req, res) => {
  const { name, template, targetDir } = req.body;

  try {
    // Criar estrutura do projeto
    const projectPath = path.join(targetDir, name);
    await fs.mkdir(projectPath, { recursive: true });

    // Copiar template
    const templateContent = getContractTemplate(template);
    await fs.writeFile(path.join(projectPath, 'lib.rs'), templateContent.libRs);
    await fs.writeFile(path.join(projectPath, 'Cargo.toml'), templateContent.cargoToml);

    res.json({ success: true, projectPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /contracts/compile - Compilar contrato localmente
 */
router.post('/contracts/compile', async (req, res) => {
  const { projectPath } = req.body;

  try {
    // Verificar se cargo-contract esta instalado
    const cargoContractVersion = await execCommand('cargo contract --version');

    // Executar compilacao
    const output: string[] = [];
    const process = spawn('cargo', ['contract', 'build', '--release'], {
      cwd: projectPath,
      env: { ...process.env, CARGO_TERM_COLOR: 'always' },
    });

    process.stdout.on('data', (data) => output.push(data.toString()));
    process.stderr.on('data', (data) => output.push(data.toString()));

    await new Promise((resolve, reject) => {
      process.on('close', (code) => {
        if (code === 0) resolve(null);
        else reject(new Error(`Compilation failed with code ${code}`));
      });
    });

    // Ler artefatos gerados
    const targetDir = path.join(projectPath, 'target', 'ink');
    const files = await fs.readdir(targetDir);

    const wasmFile = files.find(f => f.endsWith('.wasm'));
    const metadataFile = files.find(f => f.endsWith('.json'));

    const wasm = await fs.readFile(path.join(targetDir, wasmFile!));
    const metadata = JSON.parse(
      await fs.readFile(path.join(targetDir, metadataFile!), 'utf-8')
    );

    // Calcular hash do wasm
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(wasm).digest('hex');

    res.json({
      success: true,
      wasm: Array.from(wasm),
      metadata,
      hash,
      output: output.join(''),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /contracts/artifact - Retornar artefatos compilados
 */
router.get('/contracts/artifact', async (req, res) => {
  const { projectPath, type } = req.query; // type: 'wasm' | 'metadata' | 'contract'

  try {
    const targetDir = path.join(projectPath as string, 'target', 'ink');
    const files = await fs.readdir(targetDir);

    let filename: string;
    if (type === 'wasm') {
      filename = files.find(f => f.endsWith('.wasm'))!;
    } else if (type === 'metadata') {
      filename = files.find(f => f.endsWith('.json'))!;
    } else {
      filename = files.find(f => f.endsWith('.contract'))!;
    }

    const content = await fs.readFile(path.join(targetDir, filename));
    res.send(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### WebSocket para Compilacao em Tempo Real

```typescript
// packages/bazari-cli/src/server/ws/contract.ws.ts

import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';

export function setupContractCompileWS(wss: WebSocketServer) {
  wss.on('connection', (ws, req) => {
    if (req.url !== '/contracts/compile') return;

    ws.on('message', async (message) => {
      const { projectPath } = JSON.parse(message.toString());

      const process = spawn('cargo', ['contract', 'build', '--release'], {
        cwd: projectPath,
        env: { ...process.env, CARGO_TERM_COLOR: 'never' },
      });

      // Stream stdout
      process.stdout.on('data', (data) => {
        ws.send(JSON.stringify({ type: 'output', line: data.toString() }));
      });

      // Stream stderr
      process.stderr.on('data', (data) => {
        ws.send(JSON.stringify({ type: 'output', line: data.toString() }));
      });

      // Completion
      process.on('close', async (code) => {
        if (code === 0) {
          try {
            const result = await loadCompiledArtifacts(projectPath);
            ws.send(JSON.stringify({ type: 'complete', result }));
          } catch (error) {
            ws.send(JSON.stringify({ type: 'error', error: error.message }));
          }
        } else {
          ws.send(JSON.stringify({ type: 'error', error: `Compilation failed with code ${code}` }));
        }
      });
    });
  });
}
```

## Verificacao de Ambiente

O Studio deve verificar se o desenvolvedor tem o ambiente configurado:

```typescript
// apps/web/src/apps/studio/services/environment.service.ts

interface EnvironmentCheck {
  rust: { installed: boolean; version?: string };
  cargoContract: { installed: boolean; version?: string };
}

async function checkContractEnvironment(): Promise<EnvironmentCheck> {
  const response = await fetch('http://localhost:4444/contracts/check-env');
  return response.json();
}

// Uso no UI
function ContractProjectWizard() {
  const [envCheck, setEnvCheck] = useState<EnvironmentCheck | null>(null);

  useEffect(() => {
    checkContractEnvironment().then(setEnvCheck);
  }, []);

  if (!envCheck?.cargoContract.installed) {
    return (
      <Alert variant="warning">
        <AlertTitle>cargo-contract nao encontrado</AlertTitle>
        <AlertDescription>
          Para desenvolver smart contracts, instale:
          <pre className="mt-2">cargo install cargo-contract --force</pre>
        </AlertDescription>
      </Alert>
    );
  }

  // ... wizard normal
}
```

## Beneficios da Compilacao Local

1. **Performance**: Compilacao direta no sistema, sem upload de arquivos
2. **Cache**: Rust/Cargo usam cache local, builds subsequentes sao rapidos
3. **Debugging**: Mensagens de erro completas do compilador
4. **Sem Limite**: Nenhuma restricao de tamanho ou tempo
5. **Offline**: Funciona sem internet (apos deps baixadas)

## Limitacoes

1. **Requisitos**: Desenvolvedor precisa ter Rust + cargo-contract instalados
2. **Multiplataforma**: Binarios Rust precisam ser compatíveis com o SO
3. **Primeira compilacao**: Pode demorar (baixa deps Rust)

## Criterios de Aceite

1. [ ] Editor Rust funciona com syntax highlighting
2. [ ] Templates de contrato carregam corretamente
3. [ ] CLI Server executa `cargo contract build` localmente
4. [ ] Output de compilacao e streamed para o browser
5. [ ] Artefatos (.wasm, metadata.json) sao retornados
6. [ ] Deploy na chain funciona via polkadot.js
7. [ ] Contratos deployados aparecem na lista
8. [ ] Verificacao de ambiente mostra instrucoes se faltar deps

## Conclusao

Smart contracts ink! sao compilados **localmente** no sistema do desenvolvedor via CLI Server. Isso garante performance otima e acesso completo as ferramentas Rust.

## Proximos Passos

- Ver prompts de implementacao em `prompts/PROMPT-08-SMART-CONTRACTS.md`
