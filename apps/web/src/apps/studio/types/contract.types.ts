/**
 * Contract Types for Bazari Studio
 * Types for ink! smart contract development
 */

// === Contract Project ===

export type ContractTemplate = 'basic' | 'loyalty' | 'escrow' | 'custom';

export interface ContractProject {
  id: string;
  name: string;
  description: string;
  path: string;
  template: ContractTemplate;
  files: ContractFile[];
  compiled?: CompiledContract;
  deployed?: DeployedContract[];
  createdAt: string;
  updatedAt: string;
}

export interface ContractFile {
  path: string;
  content: string;
  isDirty?: boolean;
}

// === Compilation ===

export interface CompiledContract {
  wasm: Uint8Array;
  metadata: ContractMetadata;
  hash: string;
  timestamp: Date;
  buildOutput?: string;
}

export interface ContractMetadata {
  source: {
    hash: string;
    language: string;
    compiler: string;
    wasm?: string;
  };
  contract: {
    name: string;
    version: string;
    authors?: string[];
  };
  spec: {
    constructors: ConstructorSpec[];
    messages: MessageSpec[];
    events: EventSpec[];
    docs?: string[];
  };
  storage?: StorageLayout;
  types?: TypeDef[];
  version?: string;
}

export interface ConstructorSpec {
  label: string;
  selector: string;
  args: ArgSpec[];
  docs?: string[];
  payable?: boolean;
  default?: boolean;
}

export interface MessageSpec {
  label: string;
  selector: string;
  args: ArgSpec[];
  returnType?: TypeSpec;
  mutates: boolean;
  payable: boolean;
  docs?: string[];
}

export interface EventSpec {
  label: string;
  args: ArgSpec[];
  docs?: string[];
}

export interface ArgSpec {
  label: string;
  type: TypeSpec;
  docs?: string[];
}

export interface TypeSpec {
  type: number;
  displayName?: string[];
}

export interface TypeDef {
  id: number;
  type: {
    def: unknown;
    path?: string[];
    params?: unknown[];
  };
}

export interface StorageLayout {
  root: {
    layout: unknown;
    root_key: string;
  };
}

// === Deployment ===

export interface DeployedContract {
  address: string;
  codeHash: string;
  deployedAt: Date;
  deployedBy: string;
  txHash: string;
  network: string;
  constructorArgs?: unknown[];
}

export interface DeployOptions {
  gasLimit: bigint;
  storageDepositLimit?: bigint;
  salt?: Uint8Array;
}

// === Compilation Status ===

export type CompilationStatus = 'idle' | 'compiling' | 'success' | 'error';

export interface CompilationResult {
  success: boolean;
  output: string;
  error?: string;
  compiled?: CompiledContract;
}

// === Environment Check ===

export interface ContractEnvironmentCheck {
  rust: {
    installed: boolean;
    version?: string;
  };
  cargoContract: {
    installed: boolean;
    version?: string;
  };
}

// === Contract Templates ===

export interface ContractTemplateDefinition {
  id: ContractTemplate;
  name: string;
  description: string;
  icon: string;
  color: string;
  files: ContractFile[];
  defaultConstructorArgs?: Record<string, string>;
}
