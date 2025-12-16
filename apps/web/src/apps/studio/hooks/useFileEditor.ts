/**
 * useFileEditor - Hook for file editing operations
 */

import { useCallback, useRef, useEffect } from 'react';
import { useEditorStore, type EditorTab, type EditorPreferences } from '../stores/editor.store';
import { localServer } from '../services/localServer.client';
import { detectLanguage, isBinaryFile } from '../utils/languageDetection';

interface UseFileEditorOptions {
  projectPath: string;
}

interface UseFileEditorReturn {
  // State
  tabs: EditorTab[];
  activeTab: EditorTab | null;
  preferences: EditorPreferences;

  // File operations
  openFile: (filePath: string) => Promise<EditorTab | null>;
  saveFile: (tabId?: string) => Promise<boolean>;
  saveAllFiles: () => Promise<boolean>;
  closeFile: (tabId: string) => void;
  closeAllFiles: () => void;

  // Tab operations
  setActiveTab: (tabId: string) => void;
  updateContent: (content: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;

  // Cursor/scroll
  updateCursorPosition: (lineNumber: number, column: number) => void;
  updateScrollPosition: (scrollTop: number, scrollLeft: number) => void;

  // Utils
  hasUnsavedChanges: () => boolean;
  getDirtyTabs: () => EditorTab[];
}

export function useFileEditor({
  projectPath,
}: UseFileEditorOptions): UseFileEditorReturn {
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    tabs,
    activeTabId,
    preferences,
    openTab,
    closeTab,
    closeAllTabs,
    setActiveTab: setActiveTabStore,
    updateTabContent,
    markTabClean,
    updateCursorPosition: updateCursorStore,
    updateScrollPosition: updateScrollStore,
    reorderTabs: reorderTabsStore,
    getActiveTab,
    getDirtyTabs,
  } = useEditorStore();

  const activeTab = getActiveTab();

  /**
   * Open a file in the editor
   */
  const openFile = useCallback(
    async (filePath: string): Promise<EditorTab | null> => {
      // Check if binary file
      if (isBinaryFile(filePath)) {
        console.warn('Cannot open binary file:', filePath);
        return null;
      }

      // Construct full path
      const fullPath = filePath.startsWith('/')
        ? filePath
        : `${projectPath}/${filePath}`;

      try {
        // Read file content from server
        const content = await localServer.readFile(fullPath);

        // Detect language
        const language = detectLanguage(filePath);

        // Open tab
        const tab = openTab(fullPath, content, language);
        return tab;
      } catch (error) {
        console.error('Error opening file:', error);
        return null;
      }
    },
    [projectPath, openTab]
  );

  /**
   * Save a file
   */
  const saveFile = useCallback(
    async (tabId?: string): Promise<boolean> => {
      const tab = tabId
        ? tabs.find((t) => t.id === tabId)
        : activeTab;

      if (!tab || !tab.isDirty) {
        return true;
      }

      try {
        await localServer.writeFile(tab.filePath, tab.content);
        markTabClean(tab.id);
        return true;
      } catch (error) {
        console.error('Error saving file:', error);
        return false;
      }
    },
    [tabs, activeTab, markTabClean]
  );

  /**
   * Save all dirty files
   */
  const saveAllFiles = useCallback(async (): Promise<boolean> => {
    const dirtyTabs = getDirtyTabs();
    const results = await Promise.all(
      dirtyTabs.map((tab) => saveFile(tab.id))
    );
    return results.every((r) => r);
  }, [getDirtyTabs, saveFile]);

  /**
   * Close a file
   */
  const closeFile = useCallback(
    (tabId: string) => {
      closeTab(tabId);
    },
    [closeTab]
  );

  /**
   * Close all files
   */
  const closeAllFiles = useCallback(() => {
    closeAllTabs();
  }, [closeAllTabs]);

  /**
   * Set active tab
   */
  const setActiveTab = useCallback(
    (tabId: string) => {
      setActiveTabStore(tabId);
    },
    [setActiveTabStore]
  );

  /**
   * Update content of active tab
   */
  const updateContent = useCallback(
    (content: string) => {
      if (!activeTabId) return;
      updateTabContent(activeTabId, content);
    },
    [activeTabId, updateTabContent]
  );

  /**
   * Update cursor position
   */
  const updateCursorPosition = useCallback(
    (lineNumber: number, column: number) => {
      if (!activeTabId) return;
      updateCursorStore(activeTabId, lineNumber, column);
    },
    [activeTabId, updateCursorStore]
  );

  /**
   * Update scroll position
   */
  const updateScrollPosition = useCallback(
    (scrollTop: number, scrollLeft: number) => {
      if (!activeTabId) return;
      updateScrollStore(activeTabId, scrollTop, scrollLeft);
    },
    [activeTabId, updateScrollStore]
  );

  /**
   * Reorder tabs
   */
  const reorderTabs = useCallback(
    (fromIndex: number, toIndex: number) => {
      reorderTabsStore(fromIndex, toIndex);
    },
    [reorderTabsStore]
  );

  /**
   * Check for unsaved changes
   */
  const hasUnsavedChanges = useCallback(() => {
    return getDirtyTabs().length > 0;
  }, [getDirtyTabs]);

  /**
   * Auto-save effect
   */
  useEffect(() => {
    if (!preferences.autoSave || !activeTab?.isDirty) {
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      saveFile();
    }, preferences.autoSaveDelay);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    preferences.autoSave,
    preferences.autoSaveDelay,
    activeTab?.isDirty,
    activeTab?.content,
    saveFile,
  ]);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S - Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }

      // Cmd/Ctrl + Shift + S - Save All
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        saveAllFiles();
      }

      // Cmd/Ctrl + W - Close tab
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) {
          closeFile(activeTabId);
        }
      }

      // Cmd/Ctrl + Tab - Next tab
      if ((e.metaKey || e.ctrlKey) && e.key === 'Tab') {
        e.preventDefault();
        if (tabs.length > 1 && activeTabId) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          const nextIndex = e.shiftKey
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : (currentIndex + 1) % tabs.length;
          setActiveTab(tabs[nextIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    tabs,
    activeTabId,
    saveFile,
    saveAllFiles,
    closeFile,
    setActiveTab,
  ]);

  return {
    tabs,
    activeTab,
    preferences,
    openFile,
    saveFile,
    saveAllFiles,
    closeFile,
    closeAllFiles,
    setActiveTab,
    updateContent,
    reorderTabs,
    updateCursorPosition,
    updateScrollPosition,
    hasUnsavedChanges,
    getDirtyTabs,
  };
}
