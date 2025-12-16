/**
 * EditorPreviewLayout - Resizable split view with Editor and Preview panels
 */

import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { EditorPanel } from '../editor';
import { PreviewPanel } from '../preview';
import { useStudioStore } from '../../stores/studio.store';
import { PanelRight, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditorPreviewLayoutProps {
  projectPath: string;
}

export const EditorPreviewLayout: React.FC<EditorPreviewLayoutProps> = ({
  projectPath,
}) => {
  const updateLayout = useStudioStore((state) => state.updateLayout);
  const layout = useStudioStore((state) => state.layout);

  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  const handleToggleTerminal = () => {
    updateLayout({ terminalVisible: !layout.terminalVisible });
  };

  const handleTogglePreview = () => {
    setIsPreviewVisible(!isPreviewVisible);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Preview toggle button - floating */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleTogglePreview}
        className={cn(
          'absolute right-2 top-2 z-10',
          !isPreviewVisible && 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
        title={isPreviewVisible ? 'Hide Preview' : 'Show Preview'}
      >
        {isPreviewVisible ? (
          <>
            <PanelRightClose className="mr-1 h-4 w-4" />
            <span className="text-xs">Hide Preview</span>
          </>
        ) : (
          <>
            <PanelRight className="mr-1 h-4 w-4" />
            <span className="text-xs">Show Preview</span>
          </>
        )}
      </Button>

      {/* Main split panel area */}
      <PanelGroup direction="horizontal" className="h-full">
        {/* Editor Panel */}
        <Panel
          defaultSize={isPreviewVisible ? 50 : 100}
          minSize={30}
          className="relative"
        >
          <EditorPanel
            projectPath={projectPath}
            onToggleTerminal={handleToggleTerminal}
          />
        </Panel>

        {/* Preview Panel - conditionally rendered */}
        {isPreviewVisible && (
          <>
            <PanelResizeHandle className="w-1 bg-border transition-colors hover:bg-primary/30" />

            <Panel defaultSize={50} minSize={20}>
              <PreviewPanel projectPath={projectPath} />
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
};

export default EditorPreviewLayout;
