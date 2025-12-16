/**
 * ContractDeployer - Deploy compiled contracts to bazari-chain
 */

import React, { useState, useMemo } from 'react';
import {
  Rocket,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { contractService } from '../../services/contract.service';
import type { CompiledContract, DeployedContract } from '../../types/contract.types';

interface ContractDeployerProps {
  compiled: CompiledContract | null;
  onDeployed: (deployed: DeployedContract) => void;
  className?: string;
}

type DeployStatus = 'idle' | 'connecting' | 'deploying' | 'success' | 'error';

export function ContractDeployer({
  compiled,
  onDeployed,
  className,
}: ContractDeployerProps) {
  const [status, setStatus] = useState<DeployStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [deployed, setDeployed] = useState<DeployedContract | null>(null);
  const [constructorArgs, setConstructorArgs] = useState<Record<string, string>>({});
  const [gasLimit, setGasLimit] = useState('100000000000');
  const [copied, setCopied] = useState(false);

  // Extract constructor args from metadata
  const constructors = useMemo(() => {
    if (!compiled?.metadata?.spec?.constructors) return [];
    return compiled.metadata.spec.constructors;
  }, [compiled]);

  const defaultConstructor = constructors.find((c) => c.default) || constructors[0];

  const handleDeploy = async () => {
    if (!compiled) return;

    setStatus('connecting');
    setError(null);

    try {
      // Parse constructor arguments
      const args = defaultConstructor?.args.map((arg) => {
        const value = constructorArgs[arg.label] || '';
        // Try to parse as number if it looks like one
        if (/^\d+$/.test(value)) return parseInt(value, 10);
        if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
        // Remove quotes if present for strings
        if (value.startsWith('"') && value.endsWith('"')) {
          return value.slice(1, -1);
        }
        return value;
      }) || [];

      setStatus('deploying');

      const result = await contractService.deploy(compiled, args, {
        gasLimit: BigInt(gasLimit),
      });

      setDeployed(result);
      setStatus('success');
      onDeployed(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Deployment failed';
      setError(errorMsg);
      setStatus('error');
    }
  };

  const copyAddress = async () => {
    if (deployed?.address) {
      await navigator.clipboard.writeText(deployed.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!compiled) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full p-8', className)}>
        <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">No compiled contract</h3>
        <p className="text-sm text-muted-foreground text-center">
          Compile your contract first before deploying.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Rocket className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium">Deploy to Bazari Chain</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Contract info */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <div className="text-sm font-medium mb-2">Contract Info</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Name:</span>{' '}
              {compiled.metadata.contract?.name || 'Unknown'}
            </div>
            <div>
              <span className="text-muted-foreground">Version:</span>{' '}
              {compiled.metadata.contract?.version || '0.1.0'}
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Code Hash:</span>{' '}
              <span className="font-mono">{compiled.hash.slice(0, 24)}...</span>
            </div>
          </div>
        </div>

        {/* Constructor arguments */}
        {defaultConstructor && defaultConstructor.args.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Constructor Arguments</div>
            {defaultConstructor.args.map((arg) => (
              <div key={arg.label} className="space-y-1">
                <Label htmlFor={arg.label} className="text-xs">
                  {arg.label}
                  <span className="text-muted-foreground ml-2">
                    ({arg.type.displayName?.join('::') || 'unknown'})
                  </span>
                </Label>
                <Input
                  id={arg.label}
                  placeholder={`Enter ${arg.label}`}
                  value={constructorArgs[arg.label] || ''}
                  onChange={(e) =>
                    setConstructorArgs((prev) => ({
                      ...prev,
                      [arg.label]: e.target.value,
                    }))
                  }
                  disabled={status === 'deploying'}
                />
                {arg.docs && arg.docs.length > 0 && (
                  <p className="text-xs text-muted-foreground">{arg.docs.join(' ')}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Gas limit */}
        <div className="space-y-1">
          <Label htmlFor="gasLimit" className="text-xs">
            Gas Limit
          </Label>
          <Input
            id="gasLimit"
            type="text"
            value={gasLimit}
            onChange={(e) => setGasLimit(e.target.value)}
            disabled={status === 'deploying'}
          />
          <p className="text-xs text-muted-foreground">
            Default: 100,000,000,000 (100 billion)
          </p>
        </div>

        {/* Network info */}
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Bazari Testnet</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            wss://bazari.libervia.xyz/ws
          </p>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success */}
        {deployed && status === 'success' && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-500">Deployed Successfully!</span>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Contract Address:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs bg-muted/50 px-2 py-1 rounded font-mono truncate">
                    {deployed.address}
                  </code>
                  <Button variant="ghost" size="sm" onClick={copyAddress}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Transaction:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono truncate">
                    {deployed.txHash.slice(0, 24)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`https://polkadot.js.org/apps/?rpc=wss://bazari.libervia.xyz/ws#/explorer/query/${deployed.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Deployed at: {deployed.deployedAt.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          className="w-full"
          onClick={handleDeploy}
          disabled={status === 'connecting' || status === 'deploying'}
        >
          {status === 'connecting' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting wallet...
            </>
          ) : status === 'deploying' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4 mr-2" />
              Deploy Contract
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Make sure you have a connected wallet with BZR tokens
        </p>
      </div>
    </div>
  );
}

export default ContractDeployer;
