import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';

interface SplitPaneProps {
  direction?: 'horizontal' | 'vertical';
  children: React.ReactNode[];
  defaultSizes?: number[];
  minSizes?: number[];
  className?: string;
  onLayoutChange?: (sizes: number[]) => void;
}

export function SplitPane({
  direction = 'horizontal',
  children,
  defaultSizes,
  minSizes,
  className,
  onLayoutChange,
}: SplitPaneProps) {
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <PanelGroup
      direction={direction}
      className={cn('h-full', className)}
      onLayout={onLayoutChange}
    >
      {childArray.map((child, index) => (
        <Panel
          key={index}
          defaultSize={defaultSizes?.[index]}
          minSize={minSizes?.[index] ?? 10}
          className="relative"
        >
          {child}
          {index < childArray.length - 1 && (
            <PanelResizeHandle
              className={cn(
                'group relative',
                direction === 'horizontal' ? 'w-1' : 'h-1',
                'bg-border hover:bg-primary/30 transition-colors',
                'data-[resize-handle-active]:bg-primary/50'
              )}
            >
              <div
                className={cn(
                  'absolute bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity',
                  direction === 'horizontal'
                    ? 'w-1 h-8 left-0 top-1/2 -translate-y-1/2'
                    : 'h-1 w-8 top-0 left-1/2 -translate-x-1/2'
                )}
              />
            </PanelResizeHandle>
          )}
        </Panel>
      ))}
    </PanelGroup>
  );
}

interface ResizeHandleProps {
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export function ResizeHandle({
  direction = 'horizontal',
  className,
}: ResizeHandleProps) {
  return (
    <PanelResizeHandle
      className={cn(
        'group relative flex items-center justify-center',
        direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
        'bg-border hover:bg-primary/30 transition-colors',
        'data-[resize-handle-active]:bg-primary/50',
        className
      )}
    >
      <div
        className={cn(
          'rounded-full bg-muted-foreground/30 group-hover:bg-primary/50 transition-colors',
          direction === 'horizontal' ? 'w-0.5 h-6' : 'h-0.5 w-6'
        )}
      />
    </PanelResizeHandle>
  );
}
