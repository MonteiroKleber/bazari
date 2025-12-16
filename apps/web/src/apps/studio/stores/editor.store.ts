/**
 * Editor Store - Zustand store for managing editor state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeId } from '../editor/editorThemes';

/**
 * Open tab in the editor
 */
export interface EditorTab {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
  cursorPosition: {
    lineNumber: number;
    column: number;
  };
  scrollPosition: {
    scrollTop: number;
    scrollLeft: number;
  };
}

/**
 * Editor preferences
 */
export interface EditorPreferences {
  theme: ThemeId;
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative' | 'interval';
  autoSave: boolean;
  autoSaveDelay: number; // ms
  formatOnSave: boolean;
  bracketPairColorization: boolean;
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
}

/**
 * Editor state
 */
interface EditorState {
  // Tabs
  tabs: EditorTab[];
  activeTabId: string | null;

  // Preferences
  preferences: EditorPreferences;

  // UI state
  isSidebarCollapsed: boolean;
  isTerminalOpen: boolean;
  terminalHeight: number;

  // Actions - Tabs
  openTab: (
    filePath: string,
    content: string,
    language: string
  ) => EditorTab | null;
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  markTabClean: (tabId: string) => void;
  updateCursorPosition: (
    tabId: string,
    lineNumber: number,
    column: number
  ) => void;
  updateScrollPosition: (
    tabId: string,
    scrollTop: number,
    scrollLeft: number
  ) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;

  // Actions - Preferences
  updatePreference: <K extends keyof EditorPreferences>(
    key: K,
    value: EditorPreferences[K]
  ) => void;
  resetPreferences: () => void;

  // Actions - UI
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  setTerminalHeight: (height: number) => void;

  // Getters
  getActiveTab: () => EditorTab | null;
  getTabByPath: (filePath: string) => EditorTab | null;
  getDirtyTabs: () => EditorTab[];
}

/**
 * Default preferences
 */
const defaultPreferences: EditorPreferences = {
  theme: 'bazari-dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: true,
  lineNumbers: 'on',
  autoSave: true,
  autoSaveDelay: 1000,
  formatOnSave: false,
  bracketPairColorization: true,
  renderWhitespace: 'selection',
};

/**
 * Generate unique tab ID
 */
function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Extract filename from path
 */
function getFileName(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
}

/**
 * Editor store
 */
export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      // Initial state
      tabs: [],
      activeTabId: null,
      preferences: defaultPreferences,
      isSidebarCollapsed: false,
      isTerminalOpen: false,
      terminalHeight: 200,

      // Tab actions
      openTab: (filePath, content, language) => {
        const state = get();

        // Check if tab already exists
        const existingTab = state.tabs.find(
          (tab) => tab.filePath === filePath
        );
        if (existingTab) {
          set({ activeTabId: existingTab.id });
          return existingTab;
        }

        // Create new tab
        const newTab: EditorTab = {
          id: generateTabId(),
          filePath,
          fileName: getFileName(filePath),
          content,
          originalContent: content,
          isDirty: false,
          language,
          cursorPosition: { lineNumber: 1, column: 1 },
          scrollPosition: { scrollTop: 0, scrollLeft: 0 },
        };

        set({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        });

        return newTab;
      },

      closeTab: (tabId) => {
        const state = get();
        const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId);
        if (tabIndex === -1) return;

        const newTabs = state.tabs.filter((tab) => tab.id !== tabId);
        let newActiveId = state.activeTabId;

        // If closing the active tab, select another
        if (state.activeTabId === tabId) {
          if (newTabs.length === 0) {
            newActiveId = null;
          } else if (tabIndex >= newTabs.length) {
            newActiveId = newTabs[newTabs.length - 1].id;
          } else {
            newActiveId = newTabs[tabIndex].id;
          }
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveId,
        });
      },

      closeAllTabs: () => {
        set({
          tabs: [],
          activeTabId: null,
        });
      },

      closeOtherTabs: (tabId) => {
        const state = get();
        const tabToKeep = state.tabs.find((tab) => tab.id === tabId);
        if (!tabToKeep) return;

        set({
          tabs: [tabToKeep],
          activeTabId: tabId,
        });
      },

      setActiveTab: (tabId) => {
        set({ activeTabId: tabId });
      },

      updateTabContent: (tabId, content) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  content,
                  isDirty: content !== tab.originalContent,
                }
              : tab
          ),
        }));
      },

      markTabClean: (tabId) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  originalContent: tab.content,
                  isDirty: false,
                }
              : tab
          ),
        }));
      },

      updateCursorPosition: (tabId, lineNumber, column) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  cursorPosition: { lineNumber, column },
                }
              : tab
          ),
        }));
      },

      updateScrollPosition: (tabId, scrollTop, scrollLeft) => {
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  scrollPosition: { scrollTop, scrollLeft },
                }
              : tab
          ),
        }));
      },

      reorderTabs: (fromIndex, toIndex) => {
        set((state) => {
          const newTabs = [...state.tabs];
          const [removed] = newTabs.splice(fromIndex, 1);
          newTabs.splice(toIndex, 0, removed);
          return { tabs: newTabs };
        });
      },

      // Preference actions
      updatePreference: (key, value) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        }));
      },

      resetPreferences: () => {
        set({ preferences: defaultPreferences });
      },

      // UI actions
      toggleSidebar: () => {
        set((state) => ({
          isSidebarCollapsed: !state.isSidebarCollapsed,
        }));
      },

      toggleTerminal: () => {
        set((state) => ({
          isTerminalOpen: !state.isTerminalOpen,
        }));
      },

      setTerminalHeight: (height) => {
        set({ terminalHeight: Math.max(100, Math.min(500, height)) });
      },

      // Getters
      getActiveTab: () => {
        const state = get();
        return (
          state.tabs.find((tab) => tab.id === state.activeTabId) || null
        );
      },

      getTabByPath: (filePath) => {
        const state = get();
        return state.tabs.find((tab) => tab.filePath === filePath) || null;
      },

      getDirtyTabs: () => {
        const state = get();
        return state.tabs.filter((tab) => tab.isDirty);
      },
    }),
    {
      name: 'bazari-studio-editor',
      partialize: (state) => ({
        preferences: state.preferences,
        isSidebarCollapsed: state.isSidebarCollapsed,
        terminalHeight: state.terminalHeight,
      }),
    }
  )
);
