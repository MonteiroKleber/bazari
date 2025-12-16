/**
 * ContractCompiler - Compilation panel for ink! contracts
 * Executes cargo contract build via CLI Server
 */

import React, { useState, useRef, useEffect } from 'react';
import { Hammer, Loader2, AlertCircle, CheckCircle2, Terminal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { contractService } from '../../services/contract.service';
import type { ContractProject, CompiledContract, CompilationStatus } from '../../types/contract.types';

interface ContractCompilerProps {
  project: ContractProject;
  onCompiled: (compiled: CompiledContract) => void;
  className?: string;
}

export function ContractCompiler({
  project,
  onCompiled,
  className,
}: ContractCompilerProps) {
  const [status, setStatus] = useState<CompilationStatus>('idle');
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [compiled, setCompiled] = useState<CompiledContract | null>(project.compiled || null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleCompile = async () => {
    setStatus('compiling');
    setOutput(['Starting compilation...', '']);
    setError(null);

    try {
      // Try WebSocket streaming first, fall back to regular HTTP
      const result = await contractService.compileWithStream(
        project.path,
        (line) => {
          setOutput((prev) => [...prev, line]);
        }
      );

      if (result.success && result.compiled) {
        setOutput((prev) => [
          ...prev,
          '',
          '========================================',
          'Compilation successful!',
          `Code hash: ${result.compiled.hash}`,
          `WASM size: ${result.compiled.wasm.length.toLocaleString()} bytes`,
          '========================================',
        ]);
        setCompiled(result.compiled);
        setStatus('success');
        onCompiled(result.compiled);
      } else {
        setOutput((prev) => [...prev, '', `Error: ${result.error}`]);
        setError(result.error || 'Compilation failed');
        setStatus('error');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setOutput((prev) => [...prev, '', `Error: ${errorMsg}`]);
      setError(errorMsg);
      setStatus('error');
    }
  };

  const clearOutput = () => {
    setOutput([]);
    setError(null);
    if (status !== 'compiling') {
      setStatus('idle');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'compiling':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Terminal className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'compiling':
        return 'Compiling...';
      case 'success':
        return 'Compilation successful';
      case 'error':
        return 'Compilation failed';
      default:
        return 'Ready to compile';
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Hammer className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Compilation</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearOutput}
            disabled={status === 'compiling'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleCompile}
            disabled={status === 'compiling'}
            size="sm"
          >
            {status === 'compiling' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Hammer className="h-4 w-4 mr-2" />
            )}
            {status === 'compiling' ? 'Compiling...' : 'Compile'}
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
        {getStatusIcon()}
        <span className="text-sm">{getStatusText()}</span>
        {compiled && status === 'success' && (
          <span className="text-xs text-muted-foreground ml-auto">
            Hash: {compiled.hash.slice(0, 16)}...
          </span>
        )}
      </div>

      {/* Output terminal */}
      <div
        ref={outputRef}
        className="flex-1 bg-[#1a1a1a] text-green-400 font-mono text-xs p-4 overflow-auto"
      >
        {output.length === 0 ? (
          <div className="text-muted-foreground">
            <p>Click "Compile" to build your contract.</p>
            <p className="mt-2">Requirements:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Rust toolchain installed</li>
              <li>cargo-contract installed</li>
              <li>CLI Server running (localhost:4444)</li>
            </ul>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap">
            {output.map((line, i) => (
              <div
                key={i}
                className={cn(
                  line.includes('error') || line.includes('Error')
                    ? 'text-red-400'
                    : line.includes('warning')
                      ? 'text-yellow-400'
                      : line.includes('Compiling') || line.includes('Building')
                        ? 'text-blue-400'
                        : line.includes('Finished') || line.includes('successful')
                          ? 'text-green-400'
                          : ''
                )}
              >
                {line}
              </div>
            ))}
            {status === 'compiling' && (
              <span className="animate-pulse">_</span>
            )}
          </pre>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 border-t border-border">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Success info */}
      {compiled && status === 'success' && (
        <div className="p-3 border-t border-border bg-muted/20">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="font-medium">Ready for deployment</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">WASM Size:</span>{' '}
              {(compiled.wasm.length / 1024).toFixed(2)} KB
            </div>
            <div>
              <span className="font-medium">Compiled:</span>{' '}
              {compiled.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractCompiler;
