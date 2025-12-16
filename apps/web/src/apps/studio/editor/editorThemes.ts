/**
 * Monaco Editor Themes - Bazari Studio Custom Themes
 */

import type { editor } from 'monaco-editor';

/**
 * Bazari Dark Theme - VS Code Dark+ inspired with Bazari brand colors
 */
export const bazariDarkTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Comments
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'comment.line', foreground: '6A9955' },
    { token: 'comment.block', foreground: '6A9955' },

    // Strings
    { token: 'string', foreground: 'CE9178' },
    { token: 'string.escape', foreground: 'D7BA7D' },
    { token: 'string.regexp', foreground: 'D16969' },

    // Numbers
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'number.hex', foreground: 'B5CEA8' },

    // Keywords
    { token: 'keyword', foreground: '569CD6' },
    { token: 'keyword.control', foreground: 'C586C0' },
    { token: 'keyword.operator', foreground: 'D4D4D4' },

    // Types
    { token: 'type', foreground: '4EC9B0' },
    { token: 'type.identifier', foreground: '4EC9B0' },

    // Functions
    { token: 'function', foreground: 'DCDCAA' },
    { token: 'function.declaration', foreground: 'DCDCAA' },

    // Variables
    { token: 'variable', foreground: '9CDCFE' },
    { token: 'variable.parameter', foreground: '9CDCFE' },
    { token: 'variable.language', foreground: '569CD6' },

    // Constants
    { token: 'constant', foreground: '4FC1FF' },
    { token: 'constant.language', foreground: '569CD6' },

    // Classes
    { token: 'class', foreground: '4EC9B0' },
    { token: 'class.identifier', foreground: '4EC9B0' },

    // Operators
    { token: 'operator', foreground: 'D4D4D4' },

    // Punctuation
    { token: 'delimiter', foreground: 'D4D4D4' },
    { token: 'delimiter.bracket', foreground: 'FFD700' },

    // Tags (HTML/JSX)
    { token: 'tag', foreground: '569CD6' },
    { token: 'tag.attribute.name', foreground: '9CDCFE' },
    { token: 'tag.attribute.value', foreground: 'CE9178' },

    // Rust specific
    { token: 'keyword.rust', foreground: 'C586C0' },
    { token: 'attribute.rust', foreground: '4EC9B0' },
    { token: 'macro.rust', foreground: '569CD6' },

    // JSON
    { token: 'string.key.json', foreground: '9CDCFE' },
    { token: 'string.value.json', foreground: 'CE9178' },

    // Markdown
    { token: 'markup.heading', foreground: '569CD6', fontStyle: 'bold' },
    { token: 'markup.bold', fontStyle: 'bold' },
    { token: 'markup.italic', fontStyle: 'italic' },
    { token: 'markup.inline.raw', foreground: 'CE9178' },
  ],
  colors: {
    // Editor
    'editor.background': '#1E1E2E',
    'editor.foreground': '#D4D4D4',
    'editor.lineHighlightBackground': '#2A2A3E',
    'editor.selectionBackground': '#264F78',
    'editor.inactiveSelectionBackground': '#3A3D41',

    // Editor cursor
    'editorCursor.foreground': '#AEAFAD',

    // Editor line numbers
    'editorLineNumber.foreground': '#858585',
    'editorLineNumber.activeForeground': '#C6C6C6',

    // Editor gutter
    'editorGutter.background': '#1E1E2E',

    // Editor whitespace
    'editorWhitespace.foreground': '#3B3B3B',

    // Editor indent guides
    'editorIndentGuide.background': '#404040',
    'editorIndentGuide.activeBackground': '#707070',

    // Editor bracket matching
    'editorBracketMatch.background': '#0D3A58',
    'editorBracketMatch.border': '#888888',

    // Scrollbar
    'scrollbar.shadow': '#000000',
    'scrollbarSlider.background': '#79797966',
    'scrollbarSlider.hoverBackground': '#646464B3',
    'scrollbarSlider.activeBackground': '#BFBFBF66',

    // Minimap
    'minimap.background': '#1E1E2E',
    'minimapSlider.background': '#79797933',

    // Editor overview ruler
    'editorOverviewRuler.border': '#7F7F7F4D',

    // Find highlight
    'editor.findMatchBackground': '#515C6A',
    'editor.findMatchHighlightBackground': '#EA5C0055',

    // Word highlight
    'editor.wordHighlightBackground': '#575757B8',
  },
};

/**
 * Bazari Light Theme
 */
export const bazariLightTheme: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    // Comments
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },

    // Strings
    { token: 'string', foreground: 'A31515' },

    // Numbers
    { token: 'number', foreground: '098658' },

    // Keywords
    { token: 'keyword', foreground: '0000FF' },
    { token: 'keyword.control', foreground: 'AF00DB' },

    // Types
    { token: 'type', foreground: '267F99' },

    // Functions
    { token: 'function', foreground: '795E26' },

    // Variables
    { token: 'variable', foreground: '001080' },

    // Tags (HTML/JSX)
    { token: 'tag', foreground: '800000' },
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#000000',
    'editor.lineHighlightBackground': '#F3F3F3',
    'editor.selectionBackground': '#ADD6FF',
    'editorLineNumber.foreground': '#237893',
    'editorCursor.foreground': '#000000',
  },
};

/**
 * Register custom themes with Monaco
 */
export function registerThemes(monaco: typeof import('monaco-editor')): void {
  monaco.editor.defineTheme('bazari-dark', bazariDarkTheme);
  monaco.editor.defineTheme('bazari-light', bazariLightTheme);
}

/**
 * Available themes
 */
export const availableThemes = [
  { id: 'bazari-dark', name: 'Bazari Dark', type: 'dark' },
  { id: 'bazari-light', name: 'Bazari Light', type: 'light' },
  { id: 'vs-dark', name: 'VS Code Dark', type: 'dark' },
  { id: 'vs', name: 'VS Code Light', type: 'light' },
  { id: 'hc-black', name: 'High Contrast Dark', type: 'dark' },
] as const;

export type ThemeId = (typeof availableThemes)[number]['id'];
