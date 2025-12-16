/**
 * CodeEditor - Monaco Editor wrapper component
 */

import React, { useRef, useCallback, useEffect } from 'react';
import Editor, { OnMount, OnChange, Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEditorStore, type EditorTab } from '../../stores/editor.store';
import { registerThemes } from '../../editor/editorThemes';

interface CodeEditorProps {
  tab: EditorTab;
  onContentChange?: (content: string) => void;
  onCursorChange?: (lineNumber: number, column: number) => void;
  onScrollChange?: (scrollTop: number, scrollLeft: number) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  tab,
  onContentChange,
  onCursorChange,
  onScrollChange,
  onSave,
  readOnly = false,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const { preferences } = useEditorStore();

  /**
   * Handle editor mount
   */
  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Register custom themes
      registerThemes(monaco);

      // Set theme
      monaco.editor.setTheme(preferences.theme);

      // Restore cursor position
      if (tab.cursorPosition) {
        editor.setPosition(tab.cursorPosition);
        editor.revealPositionInCenter(tab.cursorPosition);
      }

      // Restore scroll position
      if (tab.scrollPosition) {
        editor.setScrollTop(tab.scrollPosition.scrollTop);
        editor.setScrollLeft(tab.scrollPosition.scrollLeft);
      }

      // Setup cursor position tracking
      editor.onDidChangeCursorPosition((e) => {
        onCursorChange?.(e.position.lineNumber, e.position.column);
      });

      // Setup scroll tracking
      editor.onDidScrollChange((e) => {
        onScrollChange?.(e.scrollTop, e.scrollLeft);
      });

      // Add keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave?.();
      });

      // Focus editor
      editor.focus();
    },
    [preferences.theme, tab, onCursorChange, onScrollChange, onSave]
  );

  /**
   * Handle content changes
   */
  const handleChange: OnChange = useCallback(
    (value) => {
      if (value !== undefined) {
        onContentChange?.(value);
      }
    },
    [onContentChange]
  );

  /**
   * Update theme when preference changes
   */
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(preferences.theme);
    }
  }, [preferences.theme]);

  /**
   * Update editor options when preferences change
   */
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: preferences.fontSize,
        tabSize: preferences.tabSize,
        wordWrap: preferences.wordWrap,
        minimap: { enabled: preferences.minimap },
        lineNumbers: preferences.lineNumbers,
        renderWhitespace: preferences.renderWhitespace,
        bracketPairColorization: {
          enabled: preferences.bracketPairColorization,
        },
      });
    }
  }, [preferences]);

  /**
   * Monaco editor options
   */
  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    // Basic
    readOnly,
    fontSize: preferences.fontSize,
    tabSize: preferences.tabSize,
    insertSpaces: true,

    // Display
    wordWrap: preferences.wordWrap,
    lineNumbers: preferences.lineNumbers,
    renderWhitespace: preferences.renderWhitespace,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',

    // Minimap
    minimap: {
      enabled: preferences.minimap,
      maxColumn: 80,
      renderCharacters: false,
    },

    // Bracket matching
    bracketPairColorization: {
      enabled: preferences.bracketPairColorization,
    },
    matchBrackets: 'always',

    // Scrollbar
    scrollbar: {
      useShadows: false,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },

    // Suggestions
    quickSuggestions: true,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnCommitCharacter: true,

    // Folding
    folding: true,
    foldingStrategy: 'indentation',

    // Find
    find: {
      addExtraSpaceOnTop: false,
      autoFindInSelection: 'multiline',
      seedSearchStringFromSelection: 'selection',
    },

    // Other
    automaticLayout: true,
    formatOnPaste: true,
    formatOnType: true,
    padding: { top: 10, bottom: 10 },
    scrollBeyondLastLine: false,
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        width="100%"
        language={tab.language}
        value={tab.content}
        theme={preferences.theme}
        options={editorOptions}
        onMount={handleEditorMount}
        onChange={handleChange}
        loading={
          <div className="flex h-full items-center justify-center bg-[#1E1E2E]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm text-gray-400">Loading editor...</span>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default CodeEditor;
