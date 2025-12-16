/**
 * PreviewToolbar - Controls for preview panel
 */

import React from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ExternalLink,
  Square,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DeviceType } from './DeviceFrame';

interface PreviewToolbarProps {
  device: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
  onReload: () => void;
  onOpenExternal: () => void;
  onStop: () => void;
  onRestart: () => void;
  serverUrl: string;
  isRunning: boolean;
}

interface DeviceButtonProps {
  device: DeviceType;
  currentDevice: DeviceType;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
}

const DeviceButton: React.FC<DeviceButtonProps> = ({
  device,
  currentDevice,
  onClick,
  icon,
  title,
}) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      'rounded p-1.5 transition-colors',
      device === currentDevice
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
    )}
  >
    {icon}
  </button>
);

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  device,
  onDeviceChange,
  onReload,
  onOpenExternal,
  onStop,
  onRestart,
  serverUrl,
  isRunning,
}) => {
  return (
    <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
      {/* Left side - Device toggle */}
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5">
          <DeviceButton
            device="desktop"
            currentDevice={device}
            onClick={() => onDeviceChange('desktop')}
            icon={<Monitor className="h-4 w-4" />}
            title="Desktop"
          />
          <DeviceButton
            device="tablet"
            currentDevice={device}
            onClick={() => onDeviceChange('tablet')}
            icon={<Tablet className="h-4 w-4" />}
            title="Tablet"
          />
          <DeviceButton
            device="mobile"
            currentDevice={device}
            onClick={() => onDeviceChange('mobile')}
            icon={<Smartphone className="h-4 w-4" />}
            title="Mobile"
          />
        </div>

        <div className="mx-2 h-4 w-px bg-border" />

        <Button variant="ghost" size="sm" onClick={onReload} title="Reload preview">
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={onRestart} title="Restart dev server">
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={onOpenExternal} title="Open in new tab">
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {/* Center - URL */}
      <div className="mx-4 flex-1">
        <div className="flex items-center justify-center">
          <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
            {serverUrl}
          </code>
        </div>
      </div>

      {/* Right side - Status and Stop */}
      <div className="flex items-center gap-2">
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs text-green-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Running
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onStop}
          title="Stop dev server"
          className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PreviewToolbar;
