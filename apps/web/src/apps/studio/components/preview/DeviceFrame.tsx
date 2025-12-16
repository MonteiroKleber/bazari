/**
 * DeviceFrame - Device simulator frame for preview
 */

import React from 'react';
import { cn } from '@/lib/utils';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DeviceFrameProps {
  device: DeviceType;
  children: React.ReactNode;
}

const DEVICE_DIMENSIONS: Record<DeviceType, { width: string; height: string }> = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '667px' },
};

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ device, children }) => {
  const dimensions = DEVICE_DIMENSIONS[device];

  // Desktop - full size, no frame
  if (device === 'desktop') {
    return <div className="h-full w-full">{children}</div>;
  }

  // Mobile/Tablet - device frame
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        className={cn(
          'relative rounded-[40px] bg-gray-900 p-3 shadow-2xl',
          'ring-1 ring-gray-700',
          device === 'mobile' && 'rounded-[32px] p-2'
        )}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          maxWidth: 'calc(100% - 32px)',
          maxHeight: 'calc(100% - 32px)',
        }}
      >
        {/* Top speaker/camera area */}
        <div className="absolute left-1/2 top-1 z-10 flex -translate-x-1/2 items-center gap-2">
          {/* Camera */}
          <div className="h-2 w-2 rounded-full bg-gray-800 ring-1 ring-gray-700" />
          {/* Speaker */}
          <div className="h-1 w-12 rounded-full bg-gray-800" />
        </div>

        {/* Notch for mobile (iPhone style) */}
        {device === 'mobile' && (
          <div className="absolute left-1/2 top-2 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-gray-900" />
        )}

        {/* Screen content */}
        <div
          className={cn(
            'h-full w-full overflow-hidden bg-white',
            device === 'mobile' ? 'rounded-[24px]' : 'rounded-[28px]'
          )}
        >
          {children}
        </div>

        {/* Home indicator for mobile */}
        {device === 'mobile' && (
          <div className="absolute bottom-1 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-gray-600" />
        )}
      </div>
    </div>
  );
};

export default DeviceFrame;
