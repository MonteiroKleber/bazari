/**
 * EditorPanel - Main editor panel combining tabs, editor, and status bar
 */

import React, { useCallback, useState, useEffect } from 'react';
import { CodeEditor } from './CodeEditor';
import { EditorTabs } from './EditorTabs';
import { EditorStatusBar } from './EditorStatusBar';
import { useFileEditor } from '../../hooks/useFileEditor';
import { useFileWatcher } from '../../hooks/useFileWatcher';
import { useStudioStore } from '../../stores/studio.store';
import { FileCode2 } from 'lucide-react';

interface EditorPanelProps {
  projectPath: string;
  onToggleTerminal?: () => void;
}

/**
 * Empty state when no files are open
 */
const EmptyState: React.FC = () => (
  <div className="flex h-full flex-col items-center justify-center bg-[#1E1E2E] text-gray-400">
    <FileCode2 size={64} className="mb-4 opacity-30" />
    <h3 className="mb-2 text-lg font-medium text-gray-300">
      No file open
    </h3>
    <p className="text-sm">
      Open a file from the sidebar to start editing
    </p>
    <div className="mt-6 text-xs text-gray-500">
      <p>Keyboard shortcuts:</p>
      <p className="mt-1">
        <kbd className="rounded bg-gray-700 px-1">Ctrl/Cmd + S</kbd> Save
      </p>
      <p className="mt-1">
        <kbd className="rounded bg-gray-700 px-1">Ctrl/Cmd + W</kbd> Close tab
      </p>
      <p className="mt-1">
        <kbd className="rounded bg-gray-700 px-1">Ctrl/Cmd + Tab</kbd> Next tab
      </p>
    </div>
  </div>
);

export const EditorPanel: React.FC<EditorPanelProps> = ({
  projectPath,
  onToggleTerminal,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  // File editor hook
  const {
    tabs,
    activeTab,
    preferences,
    openFile,
    saveFile,
    closeFile,
    setActiveTab,
    updateContent,
    reorderTabs,
    updateCursorPosition,
    updateScrollPosition,
  } = useFileEditor({ projectPath });

  // Listen to studio store for file open requests
  const studioActiveFileId = useStudioStore((state) => state.activeFileId);
  const studioCloseFile = useStudioStore((state) => state.closeFile);

  // When activeFileId changes in studio store, open/activate that file
  useEffect(() => {
    if (!studioActiveFileId) return;

    // Check if file is already open in editor tabs
    const existingTab = tabs.find((t) => t.filePath === studioActiveFileId);

    if (existingTab) {
      // File is open, just activate it if not already active
      if (activeTab?.id !== existingTab.id) {
        setActiveTab(existingTab.id);
      }
    } else {
      // File not open in editor, open it
      openFile(studioActiveFileId);
    }
  }, [studioActiveFileId, tabs, activeTab, setActiveTab, openFile]);

  // Wrapper to close file in both stores
  const handleCloseFile = useCallback(
    (tabId: string) => {
      // Find the tab to get its file path
      const tabToClose = tabs.find((t) => t.id === tabId);
      if (tabToClose) {
        // Close in studio store first (this updates activeFileId)
        studioCloseFile(tabToClose.filePath);
      }
      // Close in editor store
      closeFile(tabId);
    },
    [tabs, closeFile, studioCloseFile]
  );

  // File watcher hook
  const { isConnected: isWatcherConnected } = useFileWatcher({
    projectPath,
    onFileModify: (_path) => {
      // File modified externally - could trigger reload
    },
    enabled: true,
  });

  /**
   * Handle content change
   */
  const handleContentChange = useCallback(
    (content: string) => {
      updateContent(content);
    },
    [updateContent]
  );

  /**
   * Handle save
   */
  const handleSave = useCallback(() => {
    saveFile();
  }, [saveFile]);

  /**
   * Handle cursor change
   */
  const handleCursorChange = useCallback(
    (lineNumber: number, column: number) => {
      updateCursorPosition(lineNumber, column);
    },
    [updateCursorPosition]
  );

  /**
   * Handle scroll change
   */
  const handleScrollChange = useCallback(
    (scrollTop: number, scrollLeft: number) => {
      updateScrollPosition(scrollTop, scrollLeft);
    },
    [updateScrollPosition]
  );

  /**
   * Handle settings toggle
   */
  const handleOpenSettings = useCallback(() => {
    setShowSettings((prev) => !prev);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <EditorTabs
        tabs={tabs}
        activeTabId={activeTab?.id || null}
        onTabSelect={setActiveTab}
        onTabClose={handleCloseFile}
        onTabReorder={reorderTabs}
      />

      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          <CodeEditor
            tab={activeTab}
            onContentChange={handleContentChange}
            onCursorChange={handleCursorChange}
            onScrollChange={handleScrollChange}
            onSave={handleSave}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Status bar */}
      <EditorStatusBar
        activeTab={activeTab}
        preferences={preferences}
        projectPath={projectPath}
        isServerConnected={true}
        isWatcherConnected={isWatcherConnected}
        onToggleTerminal={onToggleTerminal}
        onOpenSettings={handleOpenSettings}
      />

      {/* Settings panel (TODO: implement) */}
      {showSettings && (
        <div className="absolute bottom-6 right-4 z-50 w-80 rounded-lg border border-[#2d2d3d] bg-[#252536] p-4 shadow-xl">
          <h3 className="mb-3 text-sm font-medium text-white">Editor Settings</h3>
          <p className="text-xs text-gray-400">Settings panel coming soon...</p>
          <button
            onClick={() => setShowSettings(false)}
            className="mt-3 text-xs text-blue-400 hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default EditorPanel;
