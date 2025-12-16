/**
 * EditorStatusBar - Status bar at the bottom of the editor
 */

import React, { useEffect, useState } from 'react';
import {
  GitBranch,
  AlertCircle,
  AlertTriangle,
  Terminal,
  Settings,
  Check,
  Wifi,
  WifiOff,
  Circle,
} from 'lucide-react';
import { type EditorTab, type EditorPreferences } from '../../stores/editor.store';
import { getLanguageDisplayName } from './FileIcon';
import { localServer } from '../../services/localServer.client';

interface EditorStatusBarProps {
  activeTab: EditorTab | null;
  preferences: EditorPreferences;
  projectPath?: string | null;
  isServerConnected?: boolean;
  isWatcherConnected?: boolean;
  errorCount?: number;
  warningCount?: number;
  onToggleTerminal?: () => void;
  onOpenSettings?: () => void;
}

interface GitStatus {
  isGitRepo: boolean;
  branch: string | null;
  hasChanges: boolean;
  ahead: number;
  behind: number;
}

// Detect encoding from file content (heuristic)
function detectEncoding(content: string): string {
  // Check for BOM
  if (content.startsWith('\uFEFF')) return 'UTF-8 with BOM';
  if (content.startsWith('\uFFFE') || content.startsWith('\uFEFF')) return 'UTF-16';

  // Check for non-ASCII characters
  const hasNonAscii = /[^\x00-\x7F]/.test(content);
  if (!hasNonAscii) return 'ASCII';

  // Default to UTF-8
  return 'UTF-8';
}

// Detect line ending from content
function detectLineEnding(content: string): string {
  if (content.includes('\r\n')) return 'CRLF';
  if (content.includes('\r')) return 'CR';
  return 'LF';
}

export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
  activeTab,
  preferences,
  projectPath,
  isServerConnected = true,
  isWatcherConnected = false,
  errorCount = 0,
  warningCount = 0,
  onToggleTerminal,
  onOpenSettings,
}) => {
  const [gitStatus, setGitStatus] = useState<GitStatus>({
    isGitRepo: false,
    branch: null,
    hasChanges: false,
    ahead: 0,
    behind: 0,
  });

  // Fetch git status when project changes
  useEffect(() => {
    if (projectPath) {
      localServer.getGitStatus(projectPath).then(setGitStatus).catch(() => {
        setGitStatus({
          isGitRepo: false,
          branch: null,
          hasChanges: false,
          ahead: 0,
          behind: 0,
        });
      });
    }
  }, [projectPath]);

  // File metadata
  const encoding = activeTab?.content ? detectEncoding(activeTab.content) : 'UTF-8';
  const lineEnding = activeTab?.content ? detectLineEnding(activeTab.content) : 'LF';

  return (
    <div className="flex h-6 items-center justify-between bg-[#007ACC] px-2 text-xs text-white">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Git branch */}
        {gitStatus.isGitRepo && (
          <div className="flex items-center gap-1" title={gitStatus.hasChanges ? 'Has uncommitted changes' : 'Clean'}>
            <GitBranch size={14} />
            <span>{gitStatus.branch || 'detached'}</span>
            {gitStatus.hasChanges && (
              <Circle size={8} className="fill-yellow-300 text-yellow-300" />
            )}
            {gitStatus.ahead > 0 && (
              <span className="text-green-300">+{gitStatus.ahead}</span>
            )}
            {gitStatus.behind > 0 && (
              <span className="text-red-300">-{gitStatus.behind}</span>
            )}
          </div>
        )}

        {/* Server connection status */}
        <div className="flex items-center gap-1" title={isServerConnected ? 'Connected to CLI server' : 'CLI server disconnected'}>
          {isServerConnected ? (
            <Wifi size={14} className="text-green-300" />
          ) : (
            <WifiOff size={14} className="text-red-300" />
          )}
        </div>

        {/* File watcher status */}
        {isWatcherConnected && (
          <div className="flex items-center gap-1 text-green-300" title="File watcher active">
            <Check size={14} />
            <span>Watching</span>
          </div>
        )}

        {/* Errors and warnings */}
        {(errorCount > 0 || warningCount > 0) && (
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <div className="flex items-center gap-1 text-red-300">
                <AlertCircle size={14} />
                <span>{errorCount}</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-1 text-yellow-300">
                <AlertTriangle size={14} />
                <span>{warningCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {activeTab && (
          <>
            {/* Cursor position */}
            <span title="Line:Column">
              Ln {activeTab.cursorPosition.lineNumber}, Col {activeTab.cursorPosition.column}
            </span>

            {/* Tab size */}
            <span title="Indentation">
              Spaces: {preferences.tabSize}
            </span>

            {/* Encoding */}
            <span title="File Encoding">{encoding}</span>

            {/* Line ending */}
            <span title="End of Line Sequence">{lineEnding}</span>

            {/* Language */}
            <span title="Language mode">
              {getLanguageDisplayName(activeTab.language)}
            </span>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Terminal toggle */}
          <button
            onClick={onToggleTerminal}
            className="flex items-center gap-1 rounded px-1 hover:bg-white/20"
            title="Toggle Terminal"
          >
            <Terminal size={14} />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 rounded px-1 hover:bg-white/20"
            title="Editor Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorStatusBar;
