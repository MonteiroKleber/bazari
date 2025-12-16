import { useStudioStore } from '../stores/studio.store';

/**
 * Hook principal do Studio
 * Expoe estado e acoes do store de forma conveniente
 */
export function useStudio() {
  const currentProject = useStudioStore((state) => state.currentProject);
  const openFiles = useStudioStore((state) => state.openFiles);
  const activeFileId = useStudioStore((state) => state.activeFileId);
  const layout = useStudioStore((state) => state.layout);
  const buildStatus = useStudioStore((state) => state.buildStatus);
  const devServerUrl = useStudioStore((state) => state.devServerUrl);

  const setCurrentProject = useStudioStore((state) => state.setCurrentProject);
  const openFile = useStudioStore((state) => state.openFile);
  const closeFile = useStudioStore((state) => state.closeFile);
  const setActiveFile = useStudioStore((state) => state.setActiveFile);
  const updateFileContent = useStudioStore((state) => state.updateFileContent);
  const markFileSaved = useStudioStore((state) => state.markFileSaved);
  const updateLayout = useStudioStore((state) => state.updateLayout);
  const setBuildStatus = useStudioStore((state) => state.setBuildStatus);
  const setDevServerUrl = useStudioStore((state) => state.setDevServerUrl);

  // Computed
  const activeFile = openFiles.find((f) => f.path === activeFileId);
  const hasUnsavedChanges = openFiles.some((f) => f.isDirty);

  return {
    // State
    currentProject,
    openFiles,
    activeFileId,
    activeFile,
    layout,
    buildStatus,
    devServerUrl,
    hasUnsavedChanges,

    // Actions
    setCurrentProject,
    openFile,
    closeFile,
    setActiveFile,
    updateFileContent,
    markFileSaved,
    updateLayout,
    setBuildStatus,
    setDevServerUrl,
  };
}
