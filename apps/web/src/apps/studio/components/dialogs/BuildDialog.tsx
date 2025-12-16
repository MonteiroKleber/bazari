/**
 * BuildDialog - Build progress and results dialog
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { localServer } from '../../services/localServer.client';
import {
  Loader2,
  Check,
  X,
  Package,
  Hammer,
  Terminal,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
  onBuildComplete?: (success: boolean) => void;
}

type BuildStep = 'idle' | 'installing' | 'building' | 'success' | 'error';

interface BuildLog {
  type: 'info' | 'error' | 'success';
  message: string;
  timestamp: Date;
}

export const BuildDialog: React.FC<BuildDialogProps> = ({
  open,
  onOpenChange,
  projectPath,
  onBuildComplete,
}) => {
  const [step, setStep] = useState<BuildStep>('idle');
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [buildInfo, setBuildInfo] = useState<{
    hash?: string;
    size?: number;
    timestamp?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Start build when dialog opens
  useEffect(() => {
    if (open && step === 'idle') {
      startBuild();
    }
  }, [open]);

  const addLog = (type: BuildLog['type'], message: string) => {
    setLogs((prev) => [...prev, { type, message, timestamp: new Date() }]);
  };

  const startBuild = async () => {
    setLogs([]);
    setError(null);
    setBuildInfo(null);

    try {
      // Step 1: Check if node_modules exists
      addLog('info', 'Checking project status...');
      const status = await localServer.getProject(projectPath);

      if (!status) {
        throw new Error('Project not found');
      }

      // Step 2: Install dependencies if needed
      setStep('installing');
      addLog('info', 'Installing dependencies...');

      const installResult = await localServer.npmInstall(projectPath);

      if (!installResult.success) {
        addLog('error', 'npm install failed');
        if (installResult.output) {
          addLog('error', installResult.output);
        }
        throw new Error('Failed to install dependencies');
      }

      addLog('success', 'Dependencies installed successfully');

      // Step 3: Run build
      setStep('building');
      addLog('info', 'Building project...');

      const buildResult = await localServer.runBuild(projectPath);

      if (!buildResult.success) {
        addLog('error', 'Build failed');
        if (buildResult.output) {
          addLog('error', buildResult.output);
        }
        throw new Error('Build failed');
      }

      addLog('success', 'Build completed successfully!');

      if (buildResult.buildInfo) {
        setBuildInfo(buildResult.buildInfo);
        addLog('info', `Bundle hash: ${buildResult.buildInfo.hash}`);
        addLog('info', `Bundle size: ${formatBytes(buildResult.buildInfo.size || 0)}`);
      }

      setStep('success');
      onBuildComplete?.(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      addLog('error', errorMessage);
      setStep('error');
      onBuildComplete?.(false);
    }
  };

  const handleRetry = () => {
    setStep('idle');
    startBuild();
  };

  const handleClose = () => {
    setStep('idle');
    setLogs([]);
    setError(null);
    setBuildInfo(null);
    onOpenChange(false);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getStepIcon = (currentStep: BuildStep) => {
    switch (currentStep) {
      case 'installing':
        return <Package className="h-5 w-5" />;
      case 'building':
        return <Hammer className="h-5 w-5" />;
      case 'success':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'error':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <Terminal className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'installing' || step === 'building' ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              getStepIcon(step)
            )}
            Build Project
          </DialogTitle>
          <DialogDescription>
            {step === 'idle' && 'Starting build process...'}
            {step === 'installing' && 'Installing dependencies...'}
            {step === 'building' && 'Building project...'}
            {step === 'success' && 'Build completed successfully!'}
            {step === 'error' && 'Build failed'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-1 text-xs',
              step === 'installing'
                ? 'bg-primary text-primary-foreground'
                : step === 'building' || step === 'success'
                  ? 'bg-green-500/10 text-green-500'
                  : step === 'error'
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-muted text-muted-foreground'
            )}
          >
            {step === 'installing' && <Loader2 className="h-3 w-3 animate-spin" />}
            {(step === 'building' || step === 'success') && <Check className="h-3 w-3" />}
            Install
          </div>
          <div className="h-px w-8 bg-border" />
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-1 text-xs',
              step === 'building'
                ? 'bg-primary text-primary-foreground'
                : step === 'success'
                  ? 'bg-green-500/10 text-green-500'
                  : step === 'error' && logs.some((l) => l.message.includes('Build'))
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-muted text-muted-foreground'
            )}
          >
            {step === 'building' && <Loader2 className="h-3 w-3 animate-spin" />}
            {step === 'success' && <Check className="h-3 w-3" />}
            Build
          </div>
        </div>

        {/* Build Logs */}
        <div className="h-[200px] overflow-auto rounded-lg border bg-muted/30 p-3" ref={scrollRef}>
          <div className="space-y-1 font-mono text-xs">
            {logs.map((log, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-2',
                  log.type === 'error' && 'text-red-500',
                  log.type === 'success' && 'text-green-500',
                  log.type === 'info' && 'text-muted-foreground'
                )}
              >
                <span className="text-muted-foreground/50">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className="whitespace-pre-wrap break-all">{log.message}</span>
              </div>
            ))}
            {(step === 'installing' || step === 'building') && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Working...</span>
              </div>
            )}
          </div>
        </div>

        {/* Build Info */}
        {buildInfo && step === 'success' && (
          <div className="rounded-lg bg-green-500/10 p-3">
            <h4 className="flex items-center gap-2 font-medium text-green-500">
              <Check className="h-4 w-4" />
              Build Successful
            </h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Hash:</span>
                <code className="ml-2 rounded bg-muted px-1">
                  {buildInfo.hash?.slice(0, 12)}...
                </code>
              </div>
              <div>
                <span className="text-muted-foreground">Size:</span>
                <span className="ml-2">{formatBytes(buildInfo.size || 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && step === 'error' && (
          <div className="rounded-lg bg-red-500/10 p-3">
            <h4 className="flex items-center gap-2 font-medium text-red-500">
              <AlertCircle className="h-4 w-4" />
              Build Failed
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        <DialogFooter>
          {step === 'success' && (
            <Button onClick={handleClose}>Done</Button>
          )}
          {step === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleRetry}>Retry Build</Button>
            </>
          )}
          {(step === 'installing' || step === 'building') && (
            <Button variant="outline" onClick={handleClose} disabled>
              Building...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BuildDialog;
