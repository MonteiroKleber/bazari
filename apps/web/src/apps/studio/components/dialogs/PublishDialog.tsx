/**
 * PublishDialog - Publish app to Bazari App Store
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { localServer } from '../../services/localServer.client';
import {
  Loader2,
  Check,
  X,
  Upload,
  Package,
  Cloud,
  Globe,
  AlertCircle,
  ExternalLink,
  Copy,
} from 'lucide-react';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
  authToken?: string;
  onPublishComplete?: (success: boolean, result?: PublishResult) => void;
}

interface PublishResult {
  cid: string;
  bundleUrl: string;
  appId: string;
  versionId: string;
}

type PublishStep = 'prepare' | 'changelog' | 'publishing' | 'success' | 'error';

export const PublishDialog: React.FC<PublishDialogProps> = ({
  open,
  onOpenChange,
  projectPath,
  authToken,
  onPublishComplete,
}) => {
  const [step, setStep] = useState<PublishStep>('prepare');
  const [changelog, setChangelog] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepareInfo, setPrepareInfo] = useState<{
    tarballSize?: number;
    manifest?: Record<string, unknown>;
    buildInfo?: Record<string, unknown>;
  } | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Prepare on open
  useEffect(() => {
    if (open && step === 'prepare') {
      prepareBuild();
    }
  }, [open]);

  const prepareBuild = async () => {
    setError(null);

    try {
      const prepareResult = await localServer.preparePublish(projectPath);

      if (!prepareResult.success) {
        throw new Error(prepareResult.error || 'Failed to prepare publish');
      }

      setPrepareInfo({
        tarballSize: prepareResult.tarballSize,
        manifest: prepareResult.manifest,
        buildInfo: prepareResult.buildInfo,
      });

      setStep('changelog');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('error');
    }
  };

  const handlePublish = async () => {
    if (!authToken) {
      setError('Authentication required. Please login first.');
      setStep('error');
      return;
    }

    setStep('publishing');
    setPublishing(true);
    setError(null);

    try {
      const publishResult = await localServer.submitPublish(
        projectPath,
        authToken,
        changelog
      );

      if (!publishResult.success) {
        throw new Error(publishResult.error || 'Failed to publish');
      }

      setResult({
        cid: publishResult.cid || '',
        bundleUrl: publishResult.bundleUrl || '',
        appId: publishResult.appId || '',
        versionId: publishResult.versionId || '',
      });

      setStep('success');
      onPublishComplete?.(true, {
        cid: publishResult.cid || '',
        bundleUrl: publishResult.bundleUrl || '',
        appId: publishResult.appId || '',
        versionId: publishResult.versionId || '',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStep('error');
      onPublishComplete?.(false);
    } finally {
      setPublishing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep('prepare');
    setChangelog('');
    setError(null);
    setPrepareInfo(null);
    setResult(null);
    onOpenChange(false);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const renderPrepareStep = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <h3 className="mt-4 text-lg font-medium">Preparing Package...</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Creating tarball and verifying build
      </p>
    </div>
  );

  const renderChangelogStep = () => (
    <div className="space-y-4">
      {/* Package Info */}
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">
              {(prepareInfo?.manifest as Record<string, unknown>)?.name as string || 'App'}
            </h4>
            <p className="text-sm text-muted-foreground">
              v{(prepareInfo?.manifest as Record<string, unknown>)?.version as string || '0.0.0'} •{' '}
              {formatBytes(prepareInfo?.tarballSize || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Changelog */}
      <div className="space-y-2">
        <Label htmlFor="changelog">What's New (Changelog)</Label>
        <Textarea
          id="changelog"
          placeholder="Describe what changed in this version..."
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Optional but recommended for app store listing
        </p>
      </div>

      {/* Auth Warning */}
      {!authToken && (
        <div className="rounded-lg bg-yellow-500/10 p-3">
          <h4 className="flex items-center gap-2 font-medium text-yellow-600">
            <AlertCircle className="h-4 w-4" />
            Authentication Required
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            You need to be logged in to publish apps.
          </p>
        </div>
      )}
    </div>
  );

  const renderPublishingStep = () => (
    <div className="space-y-6 py-4">
      {/* Progress Steps */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <p className="font-medium">Package prepared</p>
            <p className="text-sm text-muted-foreground">
              {formatBytes(prepareInfo?.tarballSize || 0)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
          <div>
            <p className="font-medium">Uploading to IPFS...</p>
            <p className="text-sm text-muted-foreground">
              Decentralized storage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground">Submit for review</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="space-y-4 py-4">
      <div className="flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <Globe className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="mt-4 text-lg font-medium">Published Successfully!</h3>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Your app has been submitted for review
        </p>
      </div>

      {/* IPFS Info */}
      {result && (
        <div className="space-y-3 rounded-lg bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">IPFS CID</span>
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 text-xs">
                {result.cid.slice(0, 20)}...
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(result.cid)}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Bundle URL</span>
            <a
              href={result.bundleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );

  const renderErrorStep = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
        <X className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="mt-4 text-lg font-medium">Publish Failed</h3>
      <p className="mt-2 text-center text-sm text-muted-foreground">{error}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Publish to App Store
          </DialogTitle>
          <DialogDescription>
            {step === 'prepare' && 'Preparing your app for publication...'}
            {step === 'changelog' && 'Add changelog and publish'}
            {step === 'publishing' && 'Uploading your app...'}
            {step === 'success' && 'Your app is live!'}
            {step === 'error' && 'Something went wrong'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'prepare' && renderPrepareStep()}
          {step === 'changelog' && renderChangelogStep()}
          {step === 'publishing' && renderPublishingStep()}
          {step === 'success' && renderSuccessStep()}
          {step === 'error' && renderErrorStep()}
        </div>

        <DialogFooter>
          {step === 'changelog' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={!authToken || publishing}>
                {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Upload className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </>
          )}

          {step === 'success' && (
            <Button onClick={handleClose}>Done</Button>
          )}

          {step === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setStep('changelog')}>Try Again</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PublishDialog;
