/**
 * PreviewError - Error state for preview panel
 */

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewErrorProps {
  error: string;
  onRetry: () => void;
}

export const PreviewError: React.FC<PreviewErrorProps> = ({ error, onRetry }) => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-muted-foreground">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h3 className="text-lg font-medium text-foreground">Error starting preview</h3>
      <p className="max-w-md text-center">{error}</p>

      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium">Possible solutions:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Check if CLI Server is running (
            <code className="rounded bg-muted px-1">bazari studio --serve</code>)
          </li>
          <li>Check if port 3333 is available</li>
          <li>
            Run <code className="rounded bg-muted px-1">npm install</code> in the project first
          </li>
          <li>Check the terminal for detailed error logs</li>
        </ul>
      </div>

      <Button onClick={onRetry} className="mt-4">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
};

export default PreviewError;
