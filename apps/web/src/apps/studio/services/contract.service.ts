/**
 * Contract Service for Bazari Studio
 * Handles compilation and deployment of ink! smart contracts
 */

import type {
  ContractProject,
  CompiledContract,
  DeployedContract,
  DeployOptions,
  CompilationResult,
  ContractEnvironmentCheck,
  ContractMetadata,
} from '../types/contract.types';

const LOCAL_SERVER = 'http://localhost:4444';

export class ContractService {
  /**
   * Check if contract development environment is available
   */
  async checkEnvironment(): Promise<ContractEnvironmentCheck> {
    try {
      const response = await fetch(`${LOCAL_SERVER}/contracts/check-env`);
      if (!response.ok) {
        throw new Error('Failed to check environment');
      }
      return response.json();
    } catch {
      return {
        rust: { installed: false },
        cargoContract: { installed: false },
      };
    }
  }

  /**
   * Compile contract via CLI Server (local compilation)
   */
  async compile(projectPath: string): Promise<CompilationResult> {
    try {
      const response = await fetch(`${LOCAL_SERVER}/contracts/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          output: data.output || '',
          error: data.error || 'Compilation failed',
        };
      }

      const compiled: CompiledContract = {
        wasm: new Uint8Array(data.wasm),
        metadata: data.metadata,
        hash: data.hash,
        timestamp: new Date(),
        buildOutput: data.output,
      };

      return {
        success: true,
        output: data.output,
        compiled,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Compilation failed',
      };
    }
  }

  /**
   * Compile with streaming output via WebSocket
   */
  compileWithStream(
    projectPath: string,
    onOutput: (line: string) => void
  ): Promise<CompilationResult> {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`ws://localhost:4444/contracts/compile`);
        let output = '';

        ws.onopen = () => {
          ws.send(JSON.stringify({ projectPath }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.type === 'output') {
            output += data.line + '\n';
            onOutput(data.line);
          } else if (data.type === 'complete') {
            ws.close();
            resolve({
              success: true,
              output,
              compiled: {
                wasm: new Uint8Array(data.result.wasm),
                metadata: data.result.metadata,
                hash: data.result.hash,
                timestamp: new Date(),
                buildOutput: output,
              },
            });
          } else if (data.type === 'error') {
            ws.close();
            resolve({
              success: false,
              output,
              error: data.error,
            });
          }
        };

        ws.onerror = () => {
          resolve({
            success: false,
            output,
            error: 'WebSocket connection failed. Is the CLI server running?',
          });
        };

        ws.onclose = () => {
          // Handle unexpected close
        };
      } catch (error) {
        resolve({
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Connection failed',
        });
      }
    });
  }

  /**
   * Deploy contract to bazari-chain
   */
  async deploy(
    compiled: CompiledContract,
    constructorArgs: unknown[],
    options: DeployOptions
  ): Promise<DeployedContract> {
    // Dynamic import to avoid bundling Polkadot.js if not needed
    const { ApiPromise, WsProvider } = await import('@polkadot/api');
    const { CodePromise } = await import('@polkadot/api-contract');
    const { web3FromAddress, web3Enable } = await import('@polkadot/extension-dapp');

    // Connect to chain
    const wsProvider = new WsProvider('wss://bazari.libervia.xyz/ws');
    const api = await ApiPromise.create({ provider: wsProvider });

    // Get signer from extension
    await web3Enable('Bazari Studio');
    const signer = await this.getSigner();
    const injector = await web3FromAddress(signer);

    // Create code instance
    const code = new CodePromise(api, compiled.metadata, compiled.wasm);

    // Get constructor
    const constructor = code.tx.new || code.tx.default;
    if (!constructor) {
      throw new Error('No constructor found in contract');
    }

    // Build transaction
    const tx = constructor(
      {
        gasLimit: api.registry.createType('WeightV2', {
          refTime: options.gasLimit,
          proofSize: options.gasLimit / BigInt(2),
        }),
        storageDepositLimit: options.storageDepositLimit,
        salt: options.salt,
      },
      ...constructorArgs
    );

    return new Promise((resolve, reject) => {
      tx.signAndSend(
        signer,
        { signer: injector.signer },
        ({ contract, status, events }) => {
          if (status.isInBlock || status.isFinalized) {
            // Check for errors
            const errorEvent = events.find(({ event }) =>
              api.events.system.ExtrinsicFailed.is(event)
            );

            if (errorEvent) {
              reject(new Error('Transaction failed'));
              return;
            }

            if (contract) {
              resolve({
                address: contract.address.toString(),
                codeHash: compiled.hash,
                deployedAt: new Date(),
                deployedBy: signer,
                txHash: status.isFinalized
                  ? status.asFinalized.toString()
                  : status.asInBlock.toString(),
                network: 'bazari',
                constructorArgs,
              });
            }
          }
        }
      ).catch(reject);
    });
  }

  /**
   * Call a contract method (read-only)
   */
  async query(
    address: string,
    metadata: ContractMetadata,
    method: string,
    args: unknown[] = []
  ): Promise<unknown> {
    const { ApiPromise, WsProvider } = await import('@polkadot/api');
    const { ContractPromise } = await import('@polkadot/api-contract');

    const wsProvider = new WsProvider('wss://bazari.libervia.xyz/ws');
    const api = await ApiPromise.create({ provider: wsProvider });

    const contract = new ContractPromise(api, metadata, address);
    const signer = await this.getSigner();

    const { result, output } = await contract.query[method](
      signer,
      { gasLimit: api.registry.createType('WeightV2', { refTime: -1, proofSize: -1 }) },
      ...args
    );

    if (result.isOk && output) {
      return output.toHuman();
    }

    throw new Error(result.asErr?.toString() || 'Query failed');
  }

  /**
   * Execute a contract method (write)
   */
  async execute(
    address: string,
    metadata: ContractMetadata,
    method: string,
    args: unknown[] = [],
    options: { gasLimit: bigint; value?: bigint } = { gasLimit: BigInt(100_000_000_000) }
  ): Promise<string> {
    const { ApiPromise, WsProvider } = await import('@polkadot/api');
    const { ContractPromise } = await import('@polkadot/api-contract');
    const { web3FromAddress, web3Enable } = await import('@polkadot/extension-dapp');

    const wsProvider = new WsProvider('wss://bazari.libervia.xyz/ws');
    const api = await ApiPromise.create({ provider: wsProvider });

    const contract = new ContractPromise(api, metadata, address);

    await web3Enable('Bazari Studio');
    const signer = await this.getSigner();
    const injector = await web3FromAddress(signer);

    return new Promise((resolve, reject) => {
      contract.tx[method](
        {
          gasLimit: api.registry.createType('WeightV2', {
            refTime: options.gasLimit,
            proofSize: options.gasLimit / BigInt(2),
          }),
          value: options.value,
        },
        ...args
      )
        .signAndSend(signer, { signer: injector.signer }, ({ status }) => {
          if (status.isFinalized) {
            resolve(status.asFinalized.toString());
          }
        })
        .catch(reject);
    });
  }

  /**
   * Get signer address from wallet
   */
  private async getSigner(): Promise<string> {
    const { web3Accounts, web3Enable } = await import('@polkadot/extension-dapp');

    await web3Enable('Bazari Studio');
    const accounts = await web3Accounts();

    if (accounts.length === 0) {
      throw new Error('No accounts found. Please connect a wallet.');
    }

    return accounts[0].address;
  }

  /**
   * Save contract files to local project
   */
  async saveFiles(
    projectPath: string,
    files: Array<{ path: string; content: string }>
  ): Promise<void> {
    const response = await fetch(`${LOCAL_SERVER}/contracts/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, files }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save files');
    }
  }

  /**
   * Load contract files from local project
   */
  async loadFiles(projectPath: string): Promise<Array<{ path: string; content: string }>> {
    const response = await fetch(
      `${LOCAL_SERVER}/contracts/files?projectPath=${encodeURIComponent(projectPath)}`
    );

    if (!response.ok) {
      throw new Error('Failed to load files');
    }

    return response.json();
  }

  /**
   * Create new contract project
   */
  async createProject(
    name: string,
    targetDir: string,
    template: string
  ): Promise<{ projectPath: string }> {
    const response = await fetch(`${LOCAL_SERVER}/contracts/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, targetDir, template }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create project');
    }

    return response.json();
  }

  /**
   * Get compiled artifacts
   */
  async getArtifact(
    projectPath: string,
    type: 'wasm' | 'metadata' | 'contract'
  ): Promise<ArrayBuffer> {
    const response = await fetch(
      `${LOCAL_SERVER}/contracts/artifact?projectPath=${encodeURIComponent(projectPath)}&type=${type}`
    );

    if (!response.ok) {
      throw new Error('Failed to get artifact');
    }

    return response.arrayBuffer();
  }
}

// Singleton instance
export const contractService = new ContractService();

export default ContractService;
