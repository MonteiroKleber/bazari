/**
 * EditorTabs - Tab bar component for editor
 */

import React, { useCallback, useState, useRef } from 'react';
import { X, Circle } from 'lucide-react';
import { type EditorTab } from '../../stores/editor.store';
import { FileIcon } from './FileIcon';

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
}

interface TabItemProps {
  tab: EditorTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}

/**
 * Individual tab item
 */
const TabItem: React.FC<TabItemProps> = ({
  tab,
  isActive,
  onSelect,
  onClose,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={onSelect}
      className={`
        group flex h-9 cursor-pointer items-center gap-2 border-r border-[#2d2d3d]
        px-3 transition-colors
        ${isActive
          ? 'bg-[#1E1E2E] text-white'
          : 'bg-[#252536] text-gray-400 hover:bg-[#2a2a3c] hover:text-gray-200'
        }
        ${isDragOver ? 'border-l-2 border-l-blue-500' : ''}
      `}
    >
      {/* File icon */}
      <FileIcon filePath={tab.filePath} size={14} />

      {/* Filename */}
      <span className="max-w-[150px] truncate text-sm">{tab.fileName}</span>

      {/* Dirty indicator or close button */}
      <div className="ml-1 flex h-4 w-4 items-center justify-center">
        {tab.isDirty && !isHovering ? (
          <Circle
            size={8}
            fill="currentColor"
            className="text-blue-400"
          />
        ) : (
          <button
            onClick={onClose}
            className={`
              rounded p-0.5 transition-colors
              hover:bg-[#3d3d4d]
              ${isActive || isHovering ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Editor tabs bar
 */
export const EditorTabs: React.FC<EditorTabsProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabReorder,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback(
    (index: number) => (e: React.DragEvent) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    },
    []
  );

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverIndex(index);
    },
    []
  );

  /**
   * Handle drop
   */
  const handleDrop = useCallback(
    (toIndex: number) => (e: React.DragEvent) => {
      e.preventDefault();
      const fromIndex = draggedIndex;
      if (fromIndex !== null && fromIndex !== toIndex) {
        onTabReorder?.(fromIndex, toIndex);
      }
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex, onTabReorder]
  );

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  /**
   * Handle tab close
   */
  const handleClose = useCallback(
    (tabId: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      onTabClose(tabId);
    },
    [onTabClose]
  );

  /**
   * Handle mouse wheel for horizontal scrolling
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      e.preventDefault();
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  if (tabs.length === 0) {
    return (
      <div className="flex h-9 items-center bg-[#252536] px-4">
        <span className="text-sm text-gray-500">No files open</span>
      </div>
    );
  }

  return (
    <div className="flex h-9 bg-[#252536]">
      {/* Scrollable tabs container */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className="flex flex-1 overflow-x-auto scrollbar-none"
      >
        {tabs.map((tab, index) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => onTabSelect(tab.id)}
            onClose={handleClose(tab.id)}
            onDragStart={handleDragStart(index)}
            onDragOver={handleDragOver(index)}
            onDrop={handleDrop(index)}
            onDragEnd={handleDragEnd}
            isDragOver={dragOverIndex === index && draggedIndex !== index}
          />
        ))}
      </div>

      {/* Actions area (optional future use) */}
      <div className="flex items-center border-l border-[#2d2d3d] px-2">
        {/* Could add split view, more actions, etc. */}
      </div>
    </div>
  );
};

export default EditorTabs;
